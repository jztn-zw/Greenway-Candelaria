const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const { buildDueDriverRouteNotifications } = require("./driverRouteNotifications");
const {
  sendToMany,
  emitStoredNotifications,
} = require("../notifications/notifications.service");

const parseUtc = (value) => new Date(typeof value === "string" ? value.replace(" ", "T").replace(/Z?$/, "Z") : value);
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";

const serializeCoveragePath = (value) => {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
};

const getTodayContext = () => {
  const now = new Date();
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const datePart = (type) => dateParts.find((part) => part.type === type)?.value;
  const date = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
  const weekday = now.toLocaleDateString("en-US", { weekday: "long", timeZone: APP_TIME_ZONE }).toUpperCase();
  const currentTime = now.toLocaleTimeString("en-GB", {
    timeZone: APP_TIME_ZONE, hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  return { date, weekday, currentTime };
};

const claimAndSendDriverNotification = async ({
  userId,
  date,
  notificationKind,
  scheduledTime = "",
  title,
  body,
  routes,
}) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    try {
      await connection.query(
        `INSERT INTO driver_route_notification_log
           (id, driver_user_id, collection_date, notification_kind, scheduled_start_time)
         VALUES (?, ?, ?, ?, ?)`,
        [generateId(), userId, date, notificationKind, scheduledTime],
      );
    } catch (error) {
      if (error.code !== "ER_DUP_ENTRY") throw error;
      await connection.rollback();
      return false;
    }

    const delivery = await sendToMany({
      user_ids: [userId],
      type: "SYSTEM",
      title,
      body,
      ref_id: routes[0]?.template_route_id ?? null,
      ref_module: "routes",
      metadata: {
        destination: "route-map",
        collection_date: date,
        notification_kind: notificationKind,
        route_ids: routes.map((route) => route.template_route_id),
      },
      db: connection,
      emit: false,
    });

    await connection.commit();
    emitStoredNotifications(delivery.notifications);
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const formatRuns = (rows) => {
  const runs = new Map();
  for (const row of rows) {
    if (!runs.has(row.run_id)) {
      runs.set(row.run_id, {
        route_id: row.run_id,
        template_route_id: row.template_route_id,
        route_status: row.run_status,
        truck_id: row.truck_id,
        truck_name: row.truck_name,
        driver_id: row.driver_id,
        driver_user_id: row.driver_user_id,
        driver_name: row.driver_name,
        route_name: row.route_name,
        waste_type: row.waste_type,
        started_at: row.scheduled_start_time,
        collection_started_at: row.collection_started_at,
        ended_at: row.ended_at,
        paused_at: row.paused_at, total_paused_seconds: Number(row.total_paused_seconds) || 0,
        run_date: row.run_date,
        stops: [], total_stops: 0, completed_stops: 0,
      });
    }
    const run = runs.get(row.run_id);
    if (!row.stop_id) continue;
    run.stops.push({
      id: row.stop_id, barangay_id: row.barangay_id, barangay_name: row.barangay_name,
      street_id: row.street_id ?? null,
      stop_name: row.stop_name ?? row.barangay_name,
      coverage_path: row.coverage_path ?? null,
      stops_before: Number(row.stops_before) || 0,
      order_index: row.stop_order, status: row.stop_status || "NOT_STARTED",
      completed_at: row.completed_at, skipped_reason: row.skipped_reason || null,
      latitude: row.latitude, longitude: row.longitude, distance_km: row.distance_km || 0,
    });
    run.total_stops += 1;
    if (row.stop_status === "DONE") run.completed_stops += 1;
  }
  return [...runs.values()];
};

const runRowsQuery = `SELECT
  rr.id AS run_id, rr.route_id AS template_route_id, rr.status AS run_status,
  rr.run_date, rr.scheduled_start_time, rr.collection_started_at, rr.ended_at, rr.paused_at, rr.total_paused_seconds,
  rr.truck_id, t.name AS truck_name, rr.driver_id, d.user_id AS driver_user_id,
  u.full_name AS driver_name, rr.route_name, rr.waste_type,
  rrs.id AS stop_id, rrs.barangay_id, rrs.street_id, rrs.stop_name,
  rrs.coverage_path,
  rrs.stop_order, rrs.status AS stop_status,
  rrs.completed_at, rrs.skipped_reason, rrs.distance_km, b.name AS barangay_name,
  b.latitude, b.longitude,
  (SELECT COUNT(*) FROM route_run_stops preceding
    WHERE preceding.route_run_id = rr.id AND preceding.stop_order < rrs.stop_order
      AND preceding.status NOT IN ('DONE','MISSED')) AS stops_before
  FROM route_runs rr
  JOIN trucks t ON t.id = rr.truck_id
  LEFT JOIN drivers d ON d.id = rr.driver_id
  LEFT JOIN users u ON u.id = d.user_id
  LEFT JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
  LEFT JOIN barangays b ON b.id = rrs.barangay_id`;

const getMyRouteToday = async (userId, { includeFinished = false } = {}) => {
  const { date } = getTodayContext();
  // Dashboard may show the latest finished run; tracking keeps its open-run contract.
  const statusFilter = includeFinished
    ? "('ACTIVE','PAUSED','SCHEDULED','PARTIAL','COMPLETED','CANCELLED')"
    : "('ACTIVE','PAUSED','SCHEDULED')";
  const [rows] = await pool.query(`${runRowsQuery}
    WHERE rr.run_date = ? AND d.user_id = ? AND rr.status IN ${statusFilter}
    ORDER BY CASE rr.status WHEN 'ACTIVE' THEN 0 WHEN 'PAUSED' THEN 1 WHEN 'SCHEDULED' THEN 2 ELSE 3 END,
      rr.ended_at DESC, rr.scheduled_start_time ASC, rr.id, rrs.stop_order ASC`, [date, userId]);
  return formatRuns(rows)[0] || null;
};

const getAllRoutesToday = async (viewer) => {
  const { date } = getTodayContext();
  const isResident = String(viewer?.role || "").toUpperCase() === "RESIDENT";
  const isDriver = viewer?.role === "DRIVER";
  const residentClause = isResident
    ? ` AND rr.driver_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM users resident WHERE resident.id = ?
         AND resident.barangay_id = rrs.barangay_id
         AND (rrs.street_id IS NULL OR rrs.street_id = resident.street_id))`
    : isDriver ? " AND d.user_id = ?" : "";
  const [rows] = await pool.query(`${runRowsQuery}
    WHERE rr.run_date = ?${residentClause}
    ORDER BY rr.scheduled_start_time ASC, rr.id ASC, rrs.stop_order ASC`, isResident || isDriver ? [date, viewer.id] : [date]);
  const runs = formatRuns(rows);
  if (isResident) {
    runs.forEach((run) => {
      run.driver_id = null;
      run.driver_user_id = null;
      run.driver_name = null;
    });
  }
  return runs;
};

const autoActivateScheduledRoutes = async () => {
  const { date, weekday } = getTodayContext();
  const [templates] = await pool.query(
    `SELECT r.id, r.truck_id, r.driver_id, r.name, r.waste_type, r.start_time
     FROM routes r JOIN drivers d ON d.id = r.driver_id
     JOIN users u ON u.id = d.user_id JOIN trucks t ON t.id = r.truck_id
     WHERE UPPER(r.day_of_week) = ? AND r.status = 'ACTIVE'
       AND u.status = 'ACTIVE' AND u.deleted_at IS NULL AND d.truck_id = r.truck_id
       AND t.availability_status = 'ACTIVE'`,
    [weekday],
  );
  const connection = await pool.getConnection();
  const created = [];
  try {
    await connection.beginTransaction();
    for (const template of templates) {
      await connection.query("SELECT id FROM trucks WHERE id = ? FOR UPDATE", [template.truck_id]);
      const [existing] = await connection.query(
        "SELECT id FROM route_runs WHERE route_id = ? AND run_date = ? LIMIT 1",
        [template.id, date],
      );
      if (existing.length) continue;
      const runId = generateId();
      await connection.query(
        `INSERT INTO route_runs (id, route_id, run_date, truck_id, driver_id, route_name, waste_type, scheduled_start_time, truck_name_snapshot, truck_plate_snapshot)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, name, plate_number FROM trucks WHERE id = ?`,
        [runId, template.id, date, template.truck_id, template.driver_id, template.name, template.waste_type, template.start_time, template.truck_id],
      );
      const [stops] = await connection.query(
        `SELECT
           rs.id, rs.barangay_id, rs.street_id, rs.stop_order, rs.distance_km,
           bs.coverage_path,
           COALESCE(
             CASE WHEN bs.area IS NULL THEN bs.name
                  ELSE CONCAT(bs.name, ' (', bs.area, ')') END,
             b.name
           ) AS stop_name
         FROM route_stops rs
         JOIN barangays b ON b.id = rs.barangay_id
         LEFT JOIN barangay_streets bs ON bs.id = rs.street_id
         WHERE rs.route_id = ?
         ORDER BY rs.stop_order ASC`,
        [template.id],
      );
      for (const stop of stops) {
        await connection.query(
          `INSERT INTO route_run_stops
             (id, route_run_id, template_stop_id, barangay_id, street_id, stop_name, coverage_path, stop_order, distance_km)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), runId, stop.id, stop.barangay_id, stop.street_id, stop.stop_name, serializeCoveragePath(stop.coverage_path), stop.stop_order, stop.distance_km],
        );
      }
      created.push(runId);
    }

    // Truck status is derived from its current Philippine-day route run. This
    // clears yesterday's Scheduled / Done state at midnight and prepares a
    // truck for today's later collection window as Scheduled.
    await connection.query(
      `UPDATE trucks t
       SET status = CASE
         WHEN EXISTS (
           SELECT 1 FROM route_runs rr
           WHERE rr.truck_id = t.id AND rr.run_date = ? AND rr.status = 'ACTIVE'
         ) THEN 'ON_THE_WAY'
         WHEN EXISTS (
           SELECT 1 FROM route_runs rr
           WHERE rr.truck_id = t.id AND rr.run_date = ? AND rr.status IN ('SCHEDULED', 'PAUSED')
         ) THEN 'SCHEDULED'
         WHEN EXISTS (
           SELECT 1 FROM route_runs rr
           WHERE rr.truck_id = t.id AND rr.run_date = ? AND rr.status IN ('COMPLETED', 'PARTIAL')
         ) THEN 'DONE'
         ELSE 'OFFLINE'
       END`,
      [date, date, date],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback(); throw error;
  } finally { connection.release(); }
  return created;
};

const dispatchDueDriverRouteNotifications = async () => {
  const { date, currentTime } = getTodayContext();

  const [routes] = await pool.query(
    `SELECT rr.route_id AS template_route_id, rr.route_name, rr.scheduled_start_time,
            t.name AS truck_name,
            d.user_id AS driver_user_id
       FROM route_runs rr
       JOIN drivers d ON d.id = rr.driver_id
       JOIN users u ON u.id = d.user_id
       JOIN trucks t ON t.id = rr.truck_id
      WHERE rr.run_date = ?
        AND rr.status = 'SCHEDULED'
        AND u.role = 'DRIVER' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
      ORDER BY d.user_id, rr.scheduled_start_time, rr.route_name, rr.id`,
    [date],
  );

  for (const notification of buildDueDriverRouteNotifications(routes, currentTime)) {
    try {
      await claimAndSendDriverNotification({ date, ...notification });
    } catch (error) {
      console.error("[Routes] Failed to send a driver route notification:", error);
    }
  }
};

const { getHistoryForUser } = require("./routeHistory.service");

const { startRoute, setRoutePaused, updateStopStatus, endRoute } = require("./routeLifecycle.service");
module.exports = { getMyRouteToday, getAllRoutesToday, autoActivateScheduledRoutes, dispatchDueDriverRouteNotifications, startRoute, setRoutePaused, updateStopStatus, endRoute, getHistoryForUser };
