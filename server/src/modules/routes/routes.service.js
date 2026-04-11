const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";

const getTodayRouteContext = () => {
  const now = new Date();
  const weekday = now
    .toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: APP_TIME_ZONE,
    })
    .toUpperCase();
  const currentTime = now.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: APP_TIME_ZONE,
  });

  return { weekday, currentTime };
};

// ─── Helper: group flat SQL rows into nested JSON ──────────────────────────
const formatRouteData = (rows) => {
  const routesMap = new Map();

  for (const row of rows) {
    if (!routesMap.has(row.route_id)) {
      routesMap.set(row.route_id, {
        route_id: row.route_id,
        route_status: row.route_status ?? null,
        truck_id: row.truck_id,
        truck_name: row.truck_name,
        driver_id: row.driver_id ?? null,
        driver_user_id: row.driver_user_id ?? null,
        driver_name: row.driver_name,
        route_name: row.route_name ?? null,
        waste_type: row.waste_type ?? null,
        started_at: row.started_at,
        stops: [],
        total_stops: 0,
        completed_stops: 0,
      });
    }

    const route = routesMap.get(row.route_id);

    if (row.stop_id) {
      route.stops.push({
        id: row.stop_id,
        barangay_id: row.barangay_id,
        barangay_name: row.barangay_name,
        order_index: row.order_index,
        status: row.stop_status || "NOT_STARTED",
        completed_at: row.completed_at,
        skipped_reason: row.skipped_reason ?? null,
        latitude: row.latitude,
        longitude: row.longitude,
        distance_km: row.distance_km ?? 0,
      });

      route.total_stops += 1;
      if (row.stop_status === "DONE") {
        route.completed_stops += 1;
      }
    }
  }

  return Array.from(routesMap.values());
};

const assertUniqueStopBarangays = (stops = []) => {
  const seen = new Set();

  for (const stop of stops) {
    const key = String(stop.barangay_id || "").trim();
    if (!key) continue;

    if (seen.has(key)) {
      throw {
        statusCode: 409,
        message: "A route cannot contain the same barangay more than once",
      };
    }

    seen.add(key);
  }
};

const assertNoActiveRouteBarangayConflicts = async (
  executor,
  dayOfWeek,
  stops = [],
  excludeRouteId = null,
) => {
  const barangayIds = Array.from(
    new Set(
      stops
        .map((stop) => String(stop.barangay_id || "").trim())
        .filter(Boolean),
    ),
  );

  if (!dayOfWeek || barangayIds.length === 0) {
    return;
  }

  const params = [String(dayOfWeek).toUpperCase(), ...barangayIds];
  let excludeClause = "";

  if (excludeRouteId) {
    excludeClause = "AND r.id <> ?";
    params.push(excludeRouteId);
  }

  const [rows] = await executor.query(
    `SELECT
       r.id AS route_id,
       COALESCE(r.name, t.name, 'Unnamed route') AS route_name,
       b.id AS barangay_id,
       b.name AS barangay_name
     FROM routes r
     JOIN route_stops rs ON rs.route_id = r.id
     JOIN barangays b ON b.id = rs.barangay_id
     LEFT JOIN trucks t ON t.id = r.truck_id
     WHERE UPPER(r.day_of_week) = ?
       AND r.status = 'ACTIVE'
       AND rs.barangay_id IN (${barangayIds.map(() => "?").join(", ")})
       ${excludeClause}
     ORDER BY b.name ASC
     LIMIT 1`,
    params,
  );

  if (rows.length === 0) {
    return;
  }

  const conflict = rows[0];
  throw {
    statusCode: 409,
    message: `${conflict.barangay_name} is already assigned to another active ${String(dayOfWeek).toLowerCase()} route`,
  };
};

const resolveAssignedTruckId = async (driverId, providedTruckId) => {
  if (!driverId) {
    return providedTruckId;
  }

  const [driverRows] = await pool.query(
    "SELECT id, truck_id FROM drivers WHERE id = ?",
    [driverId],
  );

  if (driverRows.length === 0) {
    throw { statusCode: 404, message: "Driver not found" };
  }

  const assignedTruckId = driverRows[0].truck_id;

  if (!assignedTruckId) {
    throw {
      statusCode: 400,
      message: "Selected collector has no truck assigned in Collector Manager",
    };
  }

  if (providedTruckId && assignedTruckId !== providedTruckId) {
    throw {
      statusCode: 400,
      message: "Selected truck does not match the collector's assigned truck",
    };
  }

  return assignedTruckId;
};

const isSameCalendarDay = (left, right = new Date()) => {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return false;
  }

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
};

const reactivateRouteStops = async (connection, routeId, routeUpdatedAt) => {
  const [stopRows] = await connection.query(
    `SELECT id, status
     FROM route_stops
     WHERE route_id = ?`,
    [routeId],
  );

  if (stopRows.length === 0) {
    return "empty";
  }

  const statuses = stopRows.map((row) => String(row.status || "").toUpperCase());
  const isNextCycleReset = !isSameCalendarDay(routeUpdatedAt);

  if (isNextCycleReset) {
    await connection.query(
      `UPDATE route_stops
       SET status = 'NOT_STARTED',
           completed_at = NULL,
           skipped_reason = NULL
       WHERE route_id = ?`,
      [routeId],
    );
    return "full-reset";
  }

  const needsResumeReset = statuses.some(
    (status) =>
      status === "MISSED" || status === "SKIPPED" || status === "IN_PROGRESS",
  );

  if (!needsResumeReset) {
    return "resume-noop";
  }

  await connection.query(
    `UPDATE route_stops
     SET status = 'NOT_STARTED',
         completed_at = NULL,
         skipped_reason = NULL
     WHERE route_id = ?
       AND status IN ('MISSED', 'SKIPPED', 'IN_PROGRESS')`,
    [routeId],
  );

  return "resume-reset";
};

// ─── Get today's route for the authenticated driver ───────────────────────
const getMyRouteToday = async (userId) => {
  const { weekday: today } = getTodayRouteContext();

  const [rows] = await pool.query(
    `SELECT
       r.id           AS route_id,
       r.status       AS route_status,
       r.truck_id,
       t.name         AS truck_name,
       d.id           AS driver_id,
       d.user_id      AS driver_user_id,
       u.full_name    AS driver_name,
       r.name         AS route_name,
       r.waste_type,
       r.start_time   AS started_at,
       rs.id          AS stop_id,
       rs.barangay_id,
       b.name         AS barangay_name,
       rs.stop_order  AS order_index,
       rs.status      AS stop_status,
       rs.completed_at,
       rs.skipped_reason,
       b.latitude,
       b.longitude,
       rs.distance_km
     FROM routes r
     JOIN trucks  t  ON r.truck_id  = t.id
     JOIN drivers d  ON r.driver_id = d.id
     JOIN users   u  ON d.user_id   = u.id
     LEFT JOIN route_stops rs ON r.id = rs.route_id
     LEFT JOIN barangays   b  ON rs.barangay_id = b.id
     WHERE UPPER(r.day_of_week) = ?
       AND d.user_id = ?
     ORDER BY CASE WHEN r.status = 'ACTIVE' THEN 0 ELSE 1 END,
              r.updated_at DESC,
              r.created_at DESC,
              rs.stop_order ASC`,
    [today, userId],
  );

  const formattedRoutes = formatRouteData(rows);
  return formattedRoutes.length > 0 ? formattedRoutes[0] : null;
};

// ─── Get all active routes today (Admin) ─────────────────────────────────
const getAllRoutesToday = async () => {
  const { weekday: today } = getTodayRouteContext();

  const [rows] = await pool.query(
    `SELECT
       r.id           AS route_id,
       r.status       AS route_status,
       r.truck_id,
       t.name         AS truck_name,
       d.id           AS driver_id,
       d.user_id      AS driver_user_id,
       u.full_name    AS driver_name,
       r.name         AS route_name,
       r.waste_type,
       r.start_time   AS started_at,
       rs.id          AS stop_id,
       rs.barangay_id,
       b.name         AS barangay_name,
       rs.stop_order  AS order_index,
       rs.status      AS stop_status,
       rs.completed_at,
       rs.skipped_reason,
       b.latitude,
       b.longitude
     FROM routes r
     JOIN  trucks  t ON r.truck_id = t.id
     LEFT JOIN drivers d ON r.driver_id = d.id
     LEFT JOIN users   u ON d.user_id   = u.id
     LEFT JOIN route_stops rs ON r.id = rs.route_id
     LEFT JOIN barangays   b  ON rs.barangay_id = b.id
     WHERE UPPER(r.day_of_week) = ?
     ORDER BY r.id, rs.stop_order ASC`,
    [today],
  );

  return formatRouteData(rows);
};

const autoActivateScheduledRoutes = async () => {
  const { weekday: today, currentTime } = getTodayRouteContext();

  const [routes] = await pool.query(
    `SELECT r.id, r.truck_id
     FROM routes r
     JOIN trucks t ON t.id = r.truck_id
     WHERE UPPER(r.day_of_week) = ?
       AND r.status = 'INACTIVE'
       AND r.start_time <= ?
       AND t.status = 'DONE'
       AND DATE(r.updated_at) < CURDATE()
     ORDER BY r.start_time ASC`,
    [today, currentTime],
  );

  if (routes.length === 0) {
    return [];
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const route of routes) {
      await connection.query(
        `UPDATE route_stops
         SET status = 'NOT_STARTED',
             completed_at = NULL,
             skipped_reason = NULL
         WHERE route_id = ?`,
        [route.id],
      );

      await connection.query(
        `UPDATE routes
         SET status = 'ACTIVE'
         WHERE id = ?`,
        [route.id],
      );

      await connection.query(
        `UPDATE trucks
         SET status = 'SCHEDULED'
         WHERE id = ?`,
        [route.truck_id],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return routes.map((route) => route.id);
};

// ✅ FIX: End route ─────────────────────────────────────────────────────────
// - Marks all NOT_STARTED / IN_PROGRESS stops as MISSED
// - Sets the route status to INACTIVE
// - Resets the truck status to OFFLINE
const endRoute = async (routeId) => {
  // Validate route exists
  const [routeCheck] = await pool.query(
    "SELECT id, truck_id FROM routes WHERE id = ?",
    [routeId],
  );

  if (routeCheck.length === 0) {
    throw { statusCode: 404, message: "Route not found" };
  }

  const { truck_id } = routeCheck[0];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Mark all remaining (not done/skipped) stops as MISSED
    await connection.query(
      `UPDATE route_stops
       SET status = 'MISSED',
           completed_at = COALESCE(completed_at, UTC_TIMESTAMP())
       WHERE route_id = ?
         AND status NOT IN ('DONE', 'SKIPPED', 'MISSED')`,
      [routeId],
    );

    // Set route to INACTIVE
    await connection.query(
      `UPDATE routes SET status = 'INACTIVE' WHERE id = ?`,
      [routeId],
    );

    // Mark truck as DONE so admin/resident views reflect completed route immediately
    await connection.query(
      `UPDATE trucks SET status = 'DONE' WHERE id = ?`,
      [truck_id],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { message: "Route ended successfully", routeId };
};

// ─── Get by ID ────────────────────────────────────────────────────────────
const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
       r.*,
       t.name         AS truck_name,
       t.plate_number AS truck_plate,
       u.full_name    AS driver_name
     FROM routes r
     JOIN  trucks  t ON t.id = r.truck_id
     LEFT JOIN drivers d ON d.id = r.driver_id
     LEFT JOIN users   u ON u.id = d.user_id
     WHERE r.id = ?`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Route not found" };
  }

  const route = rows[0];

  const [stops] = await pool.query(
    `SELECT
       rs.*,
       b.name AS barangay_name,
       b.zone
     FROM route_stops rs
     JOIN barangays b ON b.id = rs.barangay_id
     WHERE rs.route_id = ?
     ORDER BY rs.stop_order ASC`,
    [id],
  );

  route.stops = stops;
  return route;
};

// ─── Get All ──────────────────────────────────────────────────────────────
const getAll = async (filters = {}) => {
  let query = `
    SELECT
      r.*,
      t.name         AS truck_name,
      t.plate_number AS truck_plate,
      u.full_name    AS driver_name
    FROM routes r
    JOIN  trucks  t ON t.id = r.truck_id
    LEFT JOIN drivers d ON d.id = r.driver_id
    LEFT JOIN users   u ON u.id = d.user_id
  `;
  const params = [];
  const where = [];

  if (filters.day_of_week) {
    where.push("r.day_of_week = ?");
    params.push(filters.day_of_week);
  }
  if (filters.status) {
    where.push("r.status = ?");
    params.push(filters.status);
  }

  if (where.length > 0) query += " WHERE " + where.join(" AND ");
  query +=
    ' ORDER BY FIELD(r.day_of_week,"MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"), r.start_time ASC';

  const [routes] = await pool.query(query, params);

  for (const route of routes) {
    const [stops] = await pool.query(
      `SELECT rs.*, b.name AS barangay_name, b.zone
       FROM route_stops rs
       JOIN barangays b ON b.id = rs.barangay_id
       WHERE rs.route_id = ?
       ORDER BY rs.stop_order ASC`,
      [route.id],
    );
    route.stops = stops;
  }

  return routes;
};

// ─── Create ───────────────────────────────────────────────────────────────
const create = async ({ truck_id, driver_id, day_of_week, start_time, name, waste_type, stops }) => {
  assertUniqueStopBarangays(stops);
  await assertNoActiveRouteBarangayConflicts(pool, day_of_week, stops);

  const effectiveTruckId = await resolveAssignedTruckId(driver_id, truck_id);

  const [truckCheck] = await pool.query("SELECT id FROM trucks WHERE id = ?", [effectiveTruckId]);
  if (truckCheck.length === 0) throw { statusCode: 404, message: "Truck not found" };

  for (const stop of stops) {
    const [bCheck] = await pool.query("SELECT id FROM barangays WHERE id = ?", [stop.barangay_id]);
    if (bCheck.length === 0)
      throw { statusCode: 404, message: `Barangay not found: ${stop.barangay_id}` };
  }

  const routeId = generateId();

   await pool.query(
    `INSERT INTO routes (id, truck_id, driver_id, day_of_week, start_time, name, waste_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [routeId, effectiveTruckId, driver_id || null, day_of_week, start_time, name || null, waste_type || null],
  );

  for (const stop of stops) {
    await pool.query(
      `INSERT INTO route_stops (id, route_id, barangay_id, stop_order) VALUES (?, ?, ?, ?)`,
      [generateId(), routeId, stop.barangay_id, stop.stop_order],
    );
  }

  return getById(routeId);
};

// ─── Update ───────────────────────────────────────────────────────────────
const update = async (id, data) => {
  const existingRoute = await getById(id);
  if (data.stops) {
    assertUniqueStopBarangays(data.stops);
  }

  const fields = [];
  const params = [];
  const nextDriverId =
    data.driver_id !== undefined ? data.driver_id : existingRoute.driver_id;
  const shouldResolveTruck =
    data.truck_id !== undefined || data.driver_id !== undefined;

  let resolvedTruckId = null;
  if (shouldResolveTruck) {
    resolvedTruckId = await resolveAssignedTruckId(
      nextDriverId,
      data.truck_id !== undefined ? data.truck_id : existingRoute.truck_id,
    );
  }

  if (resolvedTruckId) {
    const [check] = await pool.query("SELECT id FROM trucks WHERE id = ?", [resolvedTruckId]);
    if (check.length === 0) throw { statusCode: 404, message: "Truck not found" };
    fields.push("truck_id = ?");
    params.push(resolvedTruckId);
  }

  if (data.driver_id !== undefined) {
    fields.push("driver_id = ?");
    params.push(data.driver_id);
  }

  if (data.day_of_week) { fields.push("day_of_week = ?"); params.push(data.day_of_week); }
  if (data.start_time)  { fields.push("start_time = ?");  params.push(data.start_time); }
  if (data.name !== undefined) {
    fields.push("name = ?");
    params.push(data.name);
  }
  if (data.waste_type !== undefined) {
    fields.push("waste_type = ?");
    params.push(data.waste_type);
  }
  if (data.status)      { fields.push("status = ?");      params.push(data.status); }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const nextDayOfWeek = data.day_of_week || existingRoute.day_of_week;
    const nextStatus = data.status || existingRoute.status;
    const nextStops = data.stops || existingRoute.stops;
    const wasInactive =
      String(existingRoute.status || "").toUpperCase() === "INACTIVE";
    const isActivating = String(nextStatus).toUpperCase() === "ACTIVE";

    if (isActivating) {
      await assertNoActiveRouteBarangayConflicts(
        connection,
        nextDayOfWeek,
        nextStops,
        id,
      );
    }

    if (fields.length > 0) {
      params.push(id);
      await connection.query(
        `UPDATE routes SET ${fields.join(", ")} WHERE id = ?`,
        params,
      );
    }

    if (data.stops) {
      const [existingStops] = await connection.query(
        `SELECT id, barangay_id, status
         FROM route_stops
         WHERE route_id = ?`,
        [id],
      );

      const existingByBarangayId = new Map(
        existingStops.map((stop) => [stop.barangay_id, stop]),
      );
      const nextBarangayIds = new Set(data.stops.map((stop) => stop.barangay_id));

      const removedStops = existingStops.filter(
        (stop) => !nextBarangayIds.has(stop.barangay_id),
      );
      const blockedRemoval = removedStops.find(
        (stop) => String(stop.status || "").toUpperCase() !== "NOT_STARTED",
      );

      if (blockedRemoval) {
        throw {
          statusCode: 409,
          message:
            "Cannot remove barangays from a route after collection progress has started",
        };
      }

      for (const stop of data.stops) {
        const existingStop = existingByBarangayId.get(stop.barangay_id);
        if (existingStop) {
          await connection.query(
            `UPDATE route_stops
             SET stop_order = ?
             WHERE id = ?`,
            [stop.stop_order, existingStop.id],
          );
          continue;
        }

        await connection.query(
          `INSERT INTO route_stops (id, route_id, barangay_id, stop_order)
           VALUES (?, ?, ?, ?)`,
          [generateId(), id, stop.barangay_id, stop.stop_order],
        );
      }

      if (removedStops.length > 0) {
        await connection.query(
          `DELETE FROM route_stops
           WHERE route_id = ?
             AND barangay_id IN (${removedStops.map(() => "?").join(", ")})`,
          [id, ...removedStops.map((stop) => stop.barangay_id)],
        );
      }
    }

    if (wasInactive && isActivating) {
      await reactivateRouteStops(connection, id, existingRoute.updated_at);

      await connection.query(
        `UPDATE trucks
         SET status = 'SCHEDULED'
         WHERE id = ?`,
        [resolvedTruckId || existingRoute.truck_id],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return getById(id);
};

// ─── Update Stop Status ───────────────────────────────────────────────────
const updateStopStatus = async (routeId, stopId, status) => {
  const [rows] = await pool.query(
    "SELECT id FROM route_stops WHERE id = ? AND route_id = ?",
    [stopId, routeId],
  );

  if (rows.length === 0) throw { statusCode: 404, message: "Stop not found on this route" };

  const completedAt =
    status === "DONE" || status === "MISSED" ? new Date() : null;

  await pool.query(
    "UPDATE route_stops SET status = ?, completed_at = ? WHERE id = ?",
    [status, completedAt, stopId],
  );

  return getById(routeId);
};

// ─── Delete ───────────────────────────────────────────────────────────────
const remove = async (id) => {
  await getById(id);
  await pool.query("DELETE FROM routes WHERE id = ?", [id]);
  return { message: "Route deleted successfully" };
};

// ─── Missed Collection Log (Admin) ────────────────────────────────────────────
const getMissedCollections = async (filters = {}) => {
  const params = [];
  const where = ["rs.status IN ('MISSED', 'SKIPPED')"];

  if (filters.truck_id) {
    where.push("r.truck_id = ?");
    params.push(filters.truck_id);
  }

  if (filters.barangay_id) {
    where.push("rs.barangay_id = ?");
    params.push(filters.barangay_id);
  }

  const days = Number.parseInt(String(filters.days ?? "30"), 10);
  if (Number.isFinite(days) && days > 0) {
    where.push(
      "(rs.completed_at IS NULL OR rs.completed_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY))",
    );
    params.push(days);
  }

  const [rows] = await pool.query(
    `SELECT
       rs.id                    AS id,
       rs.status                AS status,
       rs.completed_at          AS event_at,
       rs.skipped_reason        AS reason,
       rs.barangay_id           AS barangay_id,
       b.name                   AS barangay,
       r.id                     AS route_id,
       r.truck_id               AS truck_id,
       t.name                   AS truck,
       COALESCE(u.full_name, 'Unassigned') AS driver,
       (
         SELECT rp.reference_number
         FROM reports rp
         WHERE rp.barangay_id = rs.barangay_id
           AND rp.violation_type = 'MISSED_COLLECTION'
         ORDER BY rp.created_at DESC
         LIMIT 1
       ) AS resident_report_link
     FROM route_stops rs
     JOIN routes r       ON r.id = rs.route_id
     JOIN trucks t       ON t.id = r.truck_id
     JOIN barangays b    ON b.id = rs.barangay_id
     LEFT JOIN drivers d ON d.id = r.driver_id
     LEFT JOIN users u   ON u.id = d.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY COALESCE(rs.completed_at, UTC_TIMESTAMP()) DESC`,
    params,
  );

  return rows;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStopStatus,
  getMissedCollections,
  remove,
  getMyRouteToday,
  getAllRoutesToday,
  autoActivateScheduledRoutes,
  endRoute, // ✅ exported
};

