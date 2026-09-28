const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const {
  notifyBarangayResidents,
  notifyAdmins,
  sendToMany,
  emitStoredNotifications,
} = require("../notifications/notifications.service");
const routeRunsService = require("./routeRuns.service");
const { assertCollectionReadyForStops, hasUsableCoveragePath } = require("./collectionReadiness");
const auditService = require("../audit/audit.service");
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
    // A recurring route keeps its template record between collection days. Its
    // previous stop results must never appear as progress for a new day before
    // the collector starts today's run.
    const hasStartedToday = isSameCalendarDay(row.collection_started_at);

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
        collection_started_at: hasStartedToday ? row.collection_started_at : null,
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
        street_id: row.street_id ?? null,
        stop_name: row.stop_name ?? row.barangay_name,
        order_index: row.order_index,
        status: hasStartedToday ? row.stop_status || "NOT_STARTED" : "NOT_STARTED",
        completed_at: hasStartedToday ? row.completed_at : null,
        skipped_reason: hasStartedToday ? row.skipped_reason ?? null : null,
        latitude: row.latitude,
        longitude: row.longitude,
        distance_km: row.distance_km ?? 0,
      });

      route.total_stops += 1;
      if (hasStartedToday && row.stop_status === "DONE") {
        route.completed_stops += 1;
      }
    }
  }

  return Array.from(routesMap.values());
};

const getStopKey = (stop) => {
  if (stop.street_id) {
    return `street:${String(stop.street_id).trim()}`;
  }
  return `barangay:${String(stop.barangay_id || "").trim()}`;
};

const formatStreetName = (street) => {
  if (!street?.area) return street?.name || null;
  return `${street.name} (${street.area})`;
};

const assertUniqueRouteStops = (stops = []) => {
  const seen = new Set();

  for (const stop of stops) {
    const key = getStopKey(stop);
    if (key.endsWith(":")) continue;

    if (seen.has(key)) {
      throw {
        statusCode: 409,
        message: "A route cannot contain the same collection stop more than once",
      };
    }

    seen.add(key);
  }
};

const resolveRouteStops = async (executor, stops = []) => {
  const streetIds = Array.from(
    new Set(
      stops
        .map((stop) => String(stop.street_id || "").trim())
        .filter(Boolean),
    ),
  );

  const streetById = new Map();
  if (streetIds.length > 0) {
    const [streets] = await executor.query(
      `SELECT bs.id, bs.barangay_id, bs.name, bs.area, bs.coverage_path
       FROM barangay_streets bs
       JOIN barangays b ON b.id = bs.barangay_id
       WHERE bs.id IN (${streetIds.map(() => "?").join(", ")})
         AND b.collection_service_available = 1`,
      streetIds,
    );
    streets.forEach((street) => streetById.set(street.id, street));
  }

  const resolved = [];
  for (const stop of stops) {
    const streetId = String(stop.street_id || "").trim();
    if (streetId) {
      const street = streetById.get(streetId);
      if (!street) {
        throw { statusCode: 404, message: "Street is unavailable" };
      }
      if (!hasUsableCoveragePath(street.coverage_path)) {
        throw {
          statusCode: 409,
          message: `${formatStreetName(street)} needs a coverage path before it can be scheduled`,
        };
      }
      resolved.push({
        ...stop,
        barangay_id: street.barangay_id,
        street_id: street.id,
        stop_name: formatStreetName(street),
      });
      continue;
    }

    const barangayId = String(stop.barangay_id || "").trim();
    const [barangays] = await executor.query("SELECT id, name FROM barangays WHERE id = ?", [barangayId]);
    if (barangays.length === 0) {
      throw { statusCode: 404, message: "Barangay not found" };
    }
    resolved.push({ ...stop, barangay_id: barangayId, street_id: null, stop_name: barangays[0].name });
  }

  return resolved;
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

  const streetIds = Array.from(
    new Set(
      stops
        .map((stop) => String(stop.street_id || "").trim())
        .filter(Boolean),
    ),
  );
  const genericBarangayIds = Array.from(
    new Set(
      stops
        .filter((stop) => !stop.street_id)
        .map((stop) => String(stop.barangay_id || "").trim())
        .filter(Boolean),
    ),
  );

  if (!dayOfWeek || (barangayIds.length === 0 && streetIds.length === 0)) {
    return;
  }

  const whereParts = [];
  const params = [String(dayOfWeek).toUpperCase()];
  if (streetIds.length > 0) {
    whereParts.push(`rs.street_id IN (${streetIds.map(() => "?").join(", ")})`);
    params.push(...streetIds);
  }
  if (barangayIds.length > 0) {
    whereParts.push(`(rs.street_id IS NULL AND rs.barangay_id IN (${barangayIds.map(() => "?").join(", ")}))`);
    params.push(...barangayIds);
  }
  if (genericBarangayIds.length > 0) {
    whereParts.push(`rs.barangay_id IN (${genericBarangayIds.map(() => "?").join(", ")})`);
    params.push(...genericBarangayIds);
  }
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
       b.name AS barangay_name,
       bs.name AS street_name,
       bs.area AS street_area
     FROM routes r
     JOIN route_stops rs ON rs.route_id = r.id
     JOIN barangays b ON b.id = rs.barangay_id
     LEFT JOIN barangay_streets bs ON bs.id = rs.street_id
     LEFT JOIN trucks t ON t.id = r.truck_id
      WHERE UPPER(r.day_of_week) = ?
        AND (${whereParts.join(" OR ")})
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
      message: `${formatStreetName({ name: conflict.street_name, area: conflict.street_area }) || conflict.barangay_name} already has a ${String(dayOfWeek).toLowerCase()} collection route`,
  };
};

const resolveAssignedTruckId = async (driverId, providedTruckId, executor = pool) => {
  if (!driverId) {
    return providedTruckId;
  }

  const [driverRows] = await executor.query(
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

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(leftDate) === formatter.format(rightDate);
};

const getManilaDateContext = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, weekday: values.weekday.toUpperCase() };
};

const getTodayRun = async (connection, routeId) => {
  const { date } = getManilaDateContext();
  const [rows] = await connection.query(
    "SELECT id, status FROM route_runs WHERE route_id = ? AND run_date = ? FOR UPDATE",
    [routeId, date],
  );
  return rows[0] || null;
};

const syncTodayScheduledRun = async (connection, routeId, routeSnapshot) => {
  const run = await getTodayRun(connection, routeId);
  if (!run) return;
  if (["ACTIVE", "PAUSED"].includes(run.status)) {
    throw { statusCode: 409, message: "Today's route run has already started. Finish it before changing this route." };
  }
  if (["COMPLETED", "PARTIAL"].includes(run.status)) return;

  const { weekday } = getManilaDateContext();
  if (routeSnapshot.status !== "ACTIVE" || routeSnapshot.day_of_week !== weekday) {
    await connection.query("UPDATE route_runs SET status = 'CANCELLED' WHERE id = ?", [run.id]);
    return;
  }

  await connection.query(
    `UPDATE route_runs SET truck_id = ?, driver_id = ?, route_name = ?, waste_type = ?,
       scheduled_start_time = ?, status = 'SCHEDULED', collection_started_at = NULL, ended_at = NULL,
       truck_name_snapshot = (SELECT name FROM trucks WHERE id = ?),
       truck_plate_snapshot = (SELECT plate_number FROM trucks WHERE id = ?)
     WHERE id = ?`,
    [routeSnapshot.truck_id, routeSnapshot.driver_id, routeSnapshot.name, routeSnapshot.waste_type, routeSnapshot.start_time, routeSnapshot.truck_id, routeSnapshot.truck_id, run.id],
  );
  await connection.query("DELETE FROM route_run_stops WHERE route_run_id = ?", [run.id]);
  const [stops] = await connection.query(
    `SELECT rs.id, rs.barangay_id, rs.street_id, rs.stop_order, rs.distance_km,
            bs.coverage_path,
            COALESCE(CASE WHEN bs.area IS NULL THEN bs.name ELSE CONCAT(bs.name, ' (', bs.area, ')') END, b.name) AS stop_name
     FROM route_stops rs
     JOIN barangays b ON b.id = rs.barangay_id
     LEFT JOIN barangay_streets bs ON bs.id = rs.street_id
     WHERE rs.route_id = ? ORDER BY rs.stop_order`,
    [routeId],
  );
  for (const stop of stops) {
    await connection.query(
      `INSERT INTO route_run_stops
       (id, route_run_id, template_stop_id, barangay_id, street_id, stop_name, coverage_path, stop_order, distance_km)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), run.id, stop.id, stop.barangay_id, stop.street_id, stop.stop_name,
        typeof stop.coverage_path === "string" ? stop.coverage_path : JSON.stringify(stop.coverage_path),
        stop.stop_order, stop.distance_km || 0],
    );
  }
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
            skipped_reason = NULL,
            notified_at = NULL,
            collection_done_notified_at = NULL,
            collection_skipped_notified_at = NULL
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
          skipped_reason = NULL,
          notified_at = NULL,
          collection_done_notified_at = NULL,
          collection_skipped_notified_at = NULL
     WHERE route_id = ?
       AND status IN ('MISSED', 'SKIPPED', 'IN_PROGRESS')`,
    [routeId],
  );

  return "resume-reset";
};

const getCollectorUserIdForRoute = async (routeId) => {
  const [rows] = await pool.query(
    `SELECT d.user_id
       FROM routes r
       JOIN drivers d ON d.id = r.driver_id
      WHERE r.id = ?`,
    [routeId],
  );
  return rows[0]?.user_id || null;
};

const assertNoRouteTruckDayConflict = async (
  executor,
  dayOfWeek,
  truckId,
  excludeRouteId = null,
) => {
  if (!dayOfWeek || !truckId) return;

  const params = [String(dayOfWeek).toUpperCase(), truckId];
  let excludeClause = "";

  if (excludeRouteId) {
    excludeClause = "AND r.id <> ?";
    params.push(excludeRouteId);
  }

  const [rows] = await executor.query(
    `SELECT r.id
     FROM routes r
     WHERE UPPER(r.day_of_week) = ?
       AND r.truck_id = ?
        ${excludeClause}
     LIMIT 1`,
    params,
  );

  if (rows.length > 0) {
    throw {
      statusCode: 409,
      message: `This truck already has a ${String(dayOfWeek).toLowerCase()} collection route`,
    };
  }
};

// ─── Get by ID ────────────────────────────────────────────────────────────
const getById = async (id, viewer = null) => {
  const viewerRole = String(viewer?.role || "ADMIN").toUpperCase();
  const accessClause = viewerRole === "RESIDENT"
    ? `AND r.status = 'ACTIVE' AND r.driver_id IS NOT NULL AND u.status = 'ACTIVE' AND u.deleted_at IS NULL AND EXISTS (
         SELECT 1 FROM users resident JOIN route_stops access_stop ON access_stop.route_id = r.id
         WHERE resident.id = ? AND resident.barangay_id = access_stop.barangay_id
           AND (access_stop.street_id IS NULL OR access_stop.street_id = resident.street_id)
       )`
    : viewerRole === "DRIVER" ? "AND d.user_id = ?" : "";
  const accessParams = accessClause ? [viewer.id] : [];
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
     WHERE r.id = ? ${accessClause}`,
    [id, ...accessParams],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Route not found" };
  }

  const route = rows[0];
  if (viewerRole === "RESIDENT") {
    route.driver_id = null;
    route.driver_name = null;
    route.truck_plate = null;
  }

  const residentStopClause = viewerRole === "RESIDENT"
    ? `AND EXISTS (
         SELECT 1 FROM users resident WHERE resident.id = ?
           AND resident.barangay_id = rs.barangay_id
           AND (rs.street_id IS NULL OR rs.street_id = resident.street_id)
       )`
    : "";
  const [stops] = await pool.query(
    `SELECT
       rs.*,
       b.name AS barangay_name,
       COALESCE(
         CASE WHEN bs.area IS NULL THEN bs.name
              ELSE CONCAT(bs.name, ' (', bs.area, ')') END,
         b.name
       ) AS stop_name,
       bs.coverage_path,
       NULL AS zone
     FROM route_stops rs
     JOIN barangays b ON b.id = rs.barangay_id
      LEFT JOIN barangay_streets bs ON bs.id = rs.street_id
     WHERE rs.route_id = ? ${residentStopClause}
     ORDER BY rs.stop_order ASC`,
    residentStopClause ? [id, viewer.id] : [id],
  );

  route.stops = stops;
  return route;
};

// ─── Get All ──────────────────────────────────────────────────────────────
const getAll = async (filters = {}, viewer = null) => {
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
  const viewerRole = String(viewer?.role || "ADMIN").toUpperCase();

  if (viewerRole === "RESIDENT") {
    where.push("r.status = 'ACTIVE' AND r.driver_id IS NOT NULL AND u.status = 'ACTIVE' AND u.deleted_at IS NULL");
    where.push(`EXISTS (
      SELECT 1 FROM users resident JOIN route_stops access_stop ON access_stop.route_id = r.id
      WHERE resident.id = ? AND resident.barangay_id = access_stop.barangay_id
        AND (access_stop.street_id IS NULL OR access_stop.street_id = resident.street_id)
    )`);
    params.push(viewer.id);
  } else if (viewerRole === "DRIVER") {
    where.push("d.user_id = ?");
    params.push(viewer.id);
  }

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
    if (viewerRole === "RESIDENT") {
      route.driver_id = null;
      route.driver_name = null;
    route.truck_plate = null;
    }
    const residentStopClause = viewerRole === "RESIDENT"
      ? `AND EXISTS (SELECT 1 FROM users resident WHERE resident.id = ?
           AND resident.barangay_id = rs.barangay_id
           AND (rs.street_id IS NULL OR rs.street_id = resident.street_id))`
      : "";
    const [stops] = await pool.query(
      `SELECT
         rs.*, b.name AS barangay_name,
         COALESCE(
           CASE WHEN bs.area IS NULL THEN bs.name
                ELSE CONCAT(bs.name, ' (', bs.area, ')') END,
           b.name
         ) AS stop_name,
         bs.coverage_path,
         NULL AS zone
       FROM route_stops rs
       JOIN barangays b ON b.id = rs.barangay_id
       LEFT JOIN barangay_streets bs ON bs.id = rs.street_id
       WHERE rs.route_id = ? ${residentStopClause}
       ORDER BY rs.stop_order ASC`,
      residentStopClause ? [route.id, viewer.id] : [route.id],
    );
    route.stops = stops;
  }

  return routes;
};

// ─── Create ───────────────────────────────────────────────────────────────
const create = async ({ truck_id, driver_id, day_of_week, start_time, name, waste_type, status, stops }, adminId) => {
  const routeId = generateId();
  const routeStatus = status || (driver_id ? "ACTIVE" : "INACTIVE");
  if (routeStatus === "ACTIVE" && !driver_id) {
    throw { statusCode: 400, message: "Assign a collector before enabling this route" };
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const resolvedStops = await resolveRouteStops(connection, stops);
    assertUniqueRouteStops(resolvedStops);
    await assertCollectionReadyForStops(connection, resolvedStops);
    const effectiveTruckId = await resolveAssignedTruckId(driver_id, truck_id, connection);

    if (routeStatus === "ACTIVE") {
      await assertNoRouteTruckDayConflict(connection, day_of_week, effectiveTruckId);
      await assertNoActiveRouteBarangayConflicts(connection, day_of_week, resolvedStops);
    }
    const [truckCheck] = await connection.query("SELECT id FROM trucks WHERE id = ?", [effectiveTruckId]);
    if (truckCheck.length === 0) throw { statusCode: 404, message: "Truck not found" };

    await connection.query(
      `INSERT INTO routes (id, truck_id, driver_id, day_of_week, start_time, name, waste_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [routeId, effectiveTruckId, driver_id || null, day_of_week, start_time, name || null, waste_type || null, routeStatus],
    );
    for (const stop of resolvedStops) {
      await connection.query(
        `INSERT INTO route_stops (id, route_id, barangay_id, street_id, stop_order) VALUES (?, ?, ?, ?, ?)`,
        [generateId(), routeId, stop.barangay_id, stop.street_id, stop.stop_order],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const route = await getById(routeId);
  await auditService.log({ user_id: adminId, action: "CREATE_ROUTE", module: "routes", record_id: routeId, new_value: route });
  return route;
};

// ─── Update ───────────────────────────────────────────────────────────────
const update = async (id, data, adminId) => {
  const existingRoute = await getById(id);
  const resolvedStops = data.stops ? await resolveRouteStops(pool, data.stops) : null;
  if (resolvedStops) assertUniqueRouteStops(resolvedStops);

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
    if (String(nextStatus).toUpperCase() === "ACTIVE" && !nextDriverId) {
      throw { statusCode: 400, message: "Assign a collector before enabling this route" };
    }
    const nextStops = resolvedStops || existingRoute.stops;
    const wasInactive =
      String(existingRoute.status || "").toUpperCase() === "INACTIVE";
    const isScheduled = ["ACTIVE", "PAUSED"].includes(
      String(nextStatus).toUpperCase(),
    );

    if (isScheduled || resolvedStops) {
      await assertCollectionReadyForStops(connection, nextStops);
    }
    if (isScheduled) {
      await assertNoRouteTruckDayConflict(
        connection,
        nextDayOfWeek,
        resolvedTruckId || existingRoute.truck_id,
        id,
      );
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

    if (resolvedStops) {
      const [existingStops] = await connection.query(
        `SELECT id, barangay_id, street_id, status
         FROM route_stops
         WHERE route_id = ?`,
        [id],
      );

      const existingByStopKey = new Map(
        existingStops.map((stop) => [getStopKey(stop), stop]),
      );
      const nextStopKeys = new Set(resolvedStops.map(getStopKey));

      const removedStops = existingStops.filter(
        (stop) => !nextStopKeys.has(getStopKey(stop)),
      );
      const blockedRemoval = removedStops.find(
        (stop) => String(stop.status || "").toUpperCase() !== "NOT_STARTED",
      );

      if (blockedRemoval) {
        throw {
          statusCode: 409,
          message:
            "Cannot remove collection stops from a route after collection progress has started",
        };
      }

      for (const stop of resolvedStops) {
        const existingStop = existingByStopKey.get(getStopKey(stop));
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
          `INSERT INTO route_stops (id, route_id, barangay_id, street_id, stop_order)
           VALUES (?, ?, ?, ?, ?)`,
          [generateId(), id, stop.barangay_id, stop.street_id, stop.stop_order],
        );
      }

      for (const stop of removedStops) {
        await connection.query("DELETE FROM route_stops WHERE id = ?", [stop.id]);
      }
    }

    if (wasInactive && String(nextStatus).toUpperCase() === "ACTIVE") {
      await reactivateRouteStops(connection, id, existingRoute.updated_at);

      await connection.query(
        `UPDATE trucks
         SET status = 'SCHEDULED'
         WHERE id = ?`,
        [resolvedTruckId || existingRoute.truck_id],
      );
      await connection.query(
        "UPDATE routes SET collection_started_at = NULL WHERE id = ?",
        [id],
      );
    }

    const changesRunPlan = ["truck_id", "driver_id", "day_of_week", "start_time", "name", "waste_type", "status", "stops"]
      .some((field) => Object.prototype.hasOwnProperty.call(data, field));
    if (changesRunPlan) {
      const [snapshots] = await connection.query(
        "SELECT id, truck_id, driver_id, day_of_week, start_time, name, waste_type, status FROM routes WHERE id = ?",
        [id],
      );
      await syncTodayScheduledRun(connection, id, snapshots[0]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const updatedRoute = await getById(id);
  await auditService.log({ user_id: adminId, action: "UPDATE_ROUTE", module: "routes", record_id: id, old_value: existingRoute, new_value: updatedRoute });
  return updatedRoute;
};

// ─── Delete ───────────────────────────────────────────────────────────────
const remove = async (id, adminId) => {
  const existingRoute = await getById(id);
  if (existingRoute.status !== "INACTIVE") {
    throw { statusCode: 409, message: "Pause this route before deleting it" };
  }
  const { date } = getManilaDateContext();
  const [liveRuns] = await pool.query(
    "SELECT id FROM route_runs WHERE route_id = ? AND run_date = ? AND status IN ('SCHEDULED','ACTIVE','PAUSED') LIMIT 1",
    [id, date],
  );
  if (liveRuns.length > 0) {
    throw { statusCode: 409, message: "Cancel or finish today's route run before deleting this route" };
  }
  const [historyForeignKeys] = await pool.query(
    `SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_route_runs_template' LIMIT 1`,
  );
  if (historyForeignKeys[0]?.DELETE_RULE !== "SET NULL") {
    throw { statusCode: 503, message: "Route history protection migration must be applied before deleting routes" };
  }
  const collectorUserId = await getCollectorUserIdForRoute(id);
  const connection = await pool.getConnection();
  let delivery = { notifications: [] };
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM routes WHERE id = ?", [id]);
    await auditService.logInTransaction(connection, { user_id: adminId, action: "DELETE_ROUTE", module: "routes", record_id: id, old_value: existingRoute });
    if (collectorUserId) {
      delivery = await sendToMany({ user_ids: [collectorUserId], type: "SYSTEM", title: "Route Cancelled",
        body: "A collection route assigned to you was cancelled. Check with dispatch for your updated schedule.",
        ref_id: id, ref_module: "routes", metadata: { destination: "notification", route_name: existingRoute.name },
        db: connection, emit: false });
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  emitStoredNotifications(delivery.notifications);
  return { message: "Route deleted successfully" };
};

// ─── Missed Collection Log (Admin) ────────────────────────────────────────────
const getMissedCollections = async (filters = {}) => {
  const params = [];
  const where = ["rrs.status = 'MISSED'"];

  if (filters.truck_id) {
    where.push("rr.truck_id = ?");
    params.push(filters.truck_id);
  }

  if (filters.barangay_id) {
    where.push("rrs.barangay_id = ?");
    params.push(filters.barangay_id);
  }

  const requestedDays = Number.parseInt(String(filters.days ?? "30"), 10);
  const days = Number.isFinite(requestedDays) ? Math.min(365, Math.max(1, requestedDays)) : 30;
  const { date } = getManilaDateContext();
  where.push("rr.run_date >= DATE_SUB(?, INTERVAL ? DAY)");
  params.push(date, days - 1);

  const [rows] = await pool.query(
    `SELECT
       rrs.id                   AS id,
       rrs.status               AS status,
       rrs.completed_at         AS event_at,
       rr.run_date              AS run_date,
       rrs.skipped_reason       AS reason,
       rrs.barangay_id          AS barangay_id,
       b.name                   AS barangay,
       rr.id                    AS route_id,
       rr.truck_id              AS truck_id,
       t.name                   AS truck,
       COALESCE(u.full_name, 'Unassigned') AS driver,
       NULL AS resident_report_link
     FROM route_run_stops rrs
     JOIN route_runs rr  ON rr.id = rrs.route_run_id
     JOIN trucks t       ON t.id = rr.truck_id
     JOIN barangays b    ON b.id = rrs.barangay_id
     LEFT JOIN drivers d ON d.id = rr.driver_id
     LEFT JOIN users u   ON u.id = d.user_id
     WHERE ${where.join(" AND ")}
     ORDER BY rr.run_date DESC, rrs.completed_at DESC, rrs.id DESC`,
    params,
  );

  return rows;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStopStatus: routeRunsService.updateStopStatus,
  getMissedCollections,
  remove,
  getMyRouteToday: routeRunsService.getMyRouteToday,
  getAllRoutesToday: routeRunsService.getAllRoutesToday,
  autoActivateScheduledRoutes: routeRunsService.autoActivateScheduledRoutes,
  dispatchDueDriverRouteNotifications: routeRunsService.dispatchDueDriverRouteNotifications,
  endRoute: routeRunsService.endRoute,
  finalizeCompletedRoutes: require("./routeLifecycle.service").finalizeCompletedRoutes,
  setRoutePaused: routeRunsService.setRoutePaused,
  startRoute: routeRunsService.startRoute,
};

