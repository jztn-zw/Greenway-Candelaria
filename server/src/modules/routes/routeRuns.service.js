const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const {
  notifyBarangayResidents,
  notifyAdmins,
} = require("../notifications/notifications.service");

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";

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
        run_date: row.run_date,
        stops: [], total_stops: 0, completed_stops: 0,
      });
    }
    const run = runs.get(row.run_id);
    if (!row.stop_id) continue;
    run.stops.push({
      id: row.stop_id, barangay_id: row.barangay_id, barangay_name: row.barangay_name,
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
  rr.run_date, rr.scheduled_start_time, rr.collection_started_at,
  rr.truck_id, t.name AS truck_name, rr.driver_id, d.user_id AS driver_user_id,
  u.full_name AS driver_name, rr.route_name, rr.waste_type,
  rrs.id AS stop_id, rrs.barangay_id, rrs.stop_order, rrs.status AS stop_status,
  rrs.completed_at, rrs.skipped_reason, rrs.distance_km, b.name AS barangay_name,
  b.latitude, b.longitude
  FROM route_runs rr
  JOIN trucks t ON t.id = rr.truck_id
  LEFT JOIN drivers d ON d.id = rr.driver_id
  LEFT JOIN users u ON u.id = d.user_id
  LEFT JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
  LEFT JOIN barangays b ON b.id = rrs.barangay_id`;

const getMyRouteToday = async (userId) => {
  const { date } = getTodayContext();
  const [rows] = await pool.query(`${runRowsQuery}
    WHERE rr.run_date = ? AND d.user_id = ?
    ORDER BY FIELD(rr.status, 'ACTIVE', 'PAUSED', 'SCHEDULED'), rr.scheduled_start_time ASC, rrs.stop_order ASC`, [date, userId]);
  return formatRuns(rows)[0] || null;
};

const getAllRoutesToday = async () => {
  const { date } = getTodayContext();
  const [rows] = await pool.query(`${runRowsQuery}
    WHERE rr.run_date = ? ORDER BY rr.scheduled_start_time ASC, rrs.stop_order ASC`, [date]);
  return formatRuns(rows);
};

const autoActivateScheduledRoutes = async () => {
  const { date, weekday } = getTodayContext();
  const [templates] = await pool.query(
    `SELECT r.id, r.truck_id, r.driver_id, r.name, r.waste_type, r.start_time
     FROM routes r WHERE UPPER(r.day_of_week) = ?`,
    [weekday],
  );
  const connection = await pool.getConnection();
  const created = [];
  try {
    await connection.beginTransaction();
    for (const template of templates) {
      const [existing] = await connection.query(
        "SELECT id FROM route_runs WHERE route_id = ? AND run_date = ? LIMIT 1",
        [template.id, date],
      );
      if (existing.length) continue;
      const runId = generateId();
      await connection.query(
        `INSERT INTO route_runs (id, route_id, run_date, truck_id, driver_id, route_name, waste_type, scheduled_start_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [runId, template.id, date, template.truck_id, template.driver_id, template.name, template.waste_type, template.start_time],
      );
      const [stops] = await connection.query(
        "SELECT id, barangay_id, stop_order, distance_km FROM route_stops WHERE route_id = ? ORDER BY stop_order ASC",
        [template.id],
      );
      for (const stop of stops) {
        await connection.query(
          `INSERT INTO route_run_stops (id, route_run_id, template_stop_id, barangay_id, stop_order, distance_km)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [generateId(), runId, stop.id, stop.barangay_id, stop.stop_order, stop.distance_km],
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

const assertDriverRun = async (runId, userId) => {
  const [rows] = await pool.query(
    `SELECT rr.*, t.name AS truck_name FROM route_runs rr
     JOIN drivers d ON d.id = rr.driver_id JOIN trucks t ON t.id = rr.truck_id
     WHERE rr.id = ? AND d.user_id = ?`, [runId, userId],
  );
  if (!rows.length) throw { statusCode: 404, message: "Route run not found for this collector" };
  return rows[0];
};

const startRoute = async (runId, userId) => {
  const run = await assertDriverRun(runId, userId);
  if (!['SCHEDULED', 'ACTIVE'].includes(run.status)) throw { statusCode: 409, message: "This route run is no longer available" };
  await pool.query("UPDATE route_runs SET status = 'ACTIVE', collection_started_at = COALESCE(collection_started_at, UTC_TIMESTAMP()) WHERE id = ?", [runId]);
  await pool.query("UPDATE trucks SET status = 'ON_THE_WAY' WHERE id = ?", [run.truck_id]);
  return getMyRouteToday(userId);
};

const setRoutePaused = async (runId, userId, paused) => {
  const run = await assertDriverRun(runId, userId);
  if (!['ACTIVE', 'PAUSED'].includes(run.status) || !run.collection_started_at) {
    throw { statusCode: 409, message: "Start the route before pausing or resuming it" };
  }
  await pool.query("UPDATE route_runs SET status = ? WHERE id = ?", [paused ? 'PAUSED' : 'ACTIVE', runId]);
  await pool.query("UPDATE trucks SET status = ? WHERE id = ?", [paused ? 'SCHEDULED' : 'ON_THE_WAY', run.truck_id]);
  return { routeId: runId, status: paused ? 'PAUSED' : 'ACTIVE', truckId: run.truck_id };
};

const updateStopStatus = async (runId, stopId, status, skippedReason = null) => {
  const [runs] = await pool.query("SELECT id, status, collection_started_at FROM route_runs WHERE id = ?", [runId]);
  if (!runs.length) throw { statusCode: 404, message: "Route run not found" };
  if (runs[0].status !== 'ACTIVE' || !runs[0].collection_started_at) throw { statusCode: 409, message: "Start the route before updating stops" };
  const [stops] = await pool.query(
    `SELECT rrs.id, rrs.barangay_id, b.name AS barangay_name FROM route_run_stops rrs
     JOIN barangays b ON b.id = rrs.barangay_id WHERE rrs.id = ? AND rrs.route_run_id = ?`, [stopId, runId],
  );
  if (!stops.length) throw { statusCode: 404, message: "Stop not found on this route run" };
  const stop = stops[0];
  await pool.query(`UPDATE route_run_stops SET status = ?, completed_at = CASE WHEN ? IN ('DONE','MISSED') THEN UTC_TIMESTAMP() ELSE NULL END, skipped_reason = ? WHERE id = ?`, [status, status, status === 'MISSED' ? skippedReason || null : null, stopId]);
  if (status === 'DONE' || status === 'MISSED') {
    await notifyBarangayResidents({ barangay_id: stop.barangay_id, type: status === 'DONE' ? 'COLLECTION_DONE' : 'MISSED_COLLECTION', title: status === 'DONE' ? `Collection Completed: ${stop.barangay_name}` : `Collection Skipped: ${stop.barangay_name}`, body: status === 'DONE' ? 'Waste collection was completed in your barangay.' : `Waste collection in ${stop.barangay_name} was skipped.`, ref_id: runId, ref_module: 'tracking', metadata: { route_run_id: runId, stop_id: stopId } });
  }
  return { id: runId };
};

const endRoute = async (runId) => {
  const [runs] = await pool.query("SELECT id, truck_id, collection_started_at FROM route_runs WHERE id = ?", [runId]);
  if (!runs.length) throw { statusCode: 404, message: "Route run not found" };
  if (!runs[0].collection_started_at) throw { statusCode: 409, message: "Start the route before ending it" };
  await pool.query("UPDATE route_run_stops SET status = 'MISSED', completed_at = COALESCE(completed_at, UTC_TIMESTAMP()) WHERE route_run_id = ? AND status NOT IN ('DONE','MISSED')", [runId]);
  const [summaryRows] = await pool.query("SELECT COUNT(*) total, SUM(status = 'DONE') completed FROM route_run_stops WHERE route_run_id = ?", [runId]);
  const summary = summaryRows[0];
  const status = Number(summary.completed) === Number(summary.total) ? 'COMPLETED' : 'PARTIAL';
  await pool.query("UPDATE route_runs SET status = ?, ended_at = UTC_TIMESTAMP() WHERE id = ?", [status, runId]);
  await pool.query("UPDATE trucks SET status = 'DONE' WHERE id = ?", [runs[0].truck_id]);
  return { message: 'Route run ended successfully', routeId: runId };
};

const getHistoryForUser = async (userId, limit = 50) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  const [runs] = await pool.query(
    `SELECT rr.id, rr.route_id AS template_route_id, rr.route_name, rr.waste_type, rr.truck_id, rr.run_date, rr.status,
            rr.collection_started_at, rr.ended_at, t.name AS truck_name, t.plate_number AS truck_plate
     FROM route_runs rr
     JOIN drivers d ON d.id = rr.driver_id
     LEFT JOIN trucks t ON t.id = rr.truck_id
     WHERE d.user_id = ? AND rr.status IN ('COMPLETED', 'PARTIAL')
     ORDER BY rr.run_date DESC, rr.ended_at DESC LIMIT ?`, [userId, safeLimit],
  );
  if (!runs.length) return [];
  const ids = runs.map((run) => run.id);
  const [stops] = await pool.query(
    `SELECT rrs.route_run_id, rrs.stop_order, rrs.status, rrs.completed_at, rrs.skipped_reason,
            b.name AS barangay_name
     FROM route_run_stops rrs JOIN barangays b ON b.id = rrs.barangay_id
     WHERE rrs.route_run_id IN (${ids.map(() => '?').join(', ')}) ORDER BY rrs.stop_order ASC`, ids,
  );
  const stopsByRun = new Map();
  for (const stop of stops) {
    if (!stopsByRun.has(stop.route_run_id)) stopsByRun.set(stop.route_run_id, []);
    stopsByRun.get(stop.route_run_id).push({
      stopNumber: stop.stop_order, barangay: stop.barangay_name,
      status: stop.status === 'DONE' ? 'done' : stop.status === 'MISSED' ? 'skipped' : 'pending',
      time: stop.completed_at ? new Intl.DateTimeFormat('en-PH', { timeZone: APP_TIME_ZONE, hour: 'numeric', minute: '2-digit' }).format(new Date(stop.completed_at)) : '—',
      skipReason: stop.skipped_reason || null, residentsNotified: 0,
    });
  }
  return runs.map((run) => {
    const runStops = stopsByRun.get(run.id) || [];
    const completedStops = runStops.filter((stop) => stop.status === 'done').length;
    const skippedStops = runStops.filter((stop) => stop.status === 'skipped').length;
    const totalStops = runStops.length;
    const start = run.collection_started_at ? new Date(run.collection_started_at) : null;
    const end = run.ended_at ? new Date(run.ended_at) : null;
    const minutes = start && end ? Math.max(0, Math.round((end - start) / 60000)) : 0;
    return {
      id: run.id,
      date: new Intl.DateTimeFormat('en-US', { timeZone: APP_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${run.run_date}T00:00:00Z`)),
      dayOfWeek: new Intl.DateTimeFormat('en-US', { timeZone: APP_TIME_ZONE, weekday: 'long' }).format(new Date(`${run.run_date}T12:00:00Z`)),
      routeName: run.route_name || 'Collection route', wasteType: run.waste_type || 'General',
      truckName: run.truck_name || 'Unassigned vehicle', truckPlate: run.truck_plate || 'N/A',
      totalStops, completedStops, skippedStops,
      completionPct: totalStops ? Math.round((completedStops / totalStops) * 100) : 0,
      timeOnRoute: minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
      status: run.status === 'COMPLETED' ? 'completed' : completedStops ? 'partial' : 'no-collection',
      stops: runStops, adminMessages: [], templateRouteId: run.template_route_id,
    };
  });
};

module.exports = { getMyRouteToday, getAllRoutesToday, autoActivateScheduledRoutes, startRoute, setRoutePaused, updateStopStatus, endRoute, getHistoryForUser };
