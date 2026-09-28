const { pool } = require("../../config/db");
const { todaySql } = require("../tracking/trackingAccess");
const { notifyBarangayResidents, notifyAdmins, emitStoredNotifications } = require("../notifications/notifications.service");
const { emitNotificationReferenceRemoved } = require("../../sockets/notifications.socket");
const terminal = (status) => ["DONE", "MISSED"].includes(status);
const ended = (status) => ["COMPLETED", "PARTIAL", "CANCELLED"].includes(status);
const fail = (message, statusCode = 409) => { throw { statusCode, message }; };

// Truck first, then run: GPS and lifecycle actions use the same lock order.
const withRun = async (runId, actor, action) => {
  const db = await pool.getConnection();
  const notifications = [];
  let clearedAlert = false;
  try {
    await db.beginTransaction();
    const [refs] = await db.query("SELECT truck_id FROM route_runs WHERE id = ?", [runId]);
    if (!refs.length) fail("Route run not found", 404);
    await db.query("SELECT id FROM trucks WHERE id = ? FOR UPDATE", [refs[0].truck_id]);
    const [rows] = await db.query(
      `SELECT rr.*, d.user_id, d.truck_id AS assigned_truck_id,
        t.name AS truck_name, t.availability_status,
        collector.status AS driver_status, collector.deleted_at AS driver_deleted_at,
        (rr.run_date = ${todaySql}) AS is_today,
        (rr.run_date < ${todaySql}) AS is_past,
        (TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')) >= rr.scheduled_start_time) AS is_due
       FROM route_runs rr LEFT JOIN drivers d ON d.id = rr.driver_id
       LEFT JOIN users collector ON collector.id = d.user_id
       JOIN trucks t ON t.id = rr.truck_id WHERE rr.id = ? FOR UPDATE`, [runId]);
    const run = rows[0];
    if (!run || (actor?.role !== "ADMIN" && !(actor?.role === "DRIVER" && run.user_id === actor.id))) {
      fail("Route run not found for this collector", 404);
    }
    const context = { db, run, notifications, clearAlert: () => { clearedAlert = true; } };
    const result = await action(context);
    await db.commit();
    emitStoredNotifications(notifications);
    if (clearedAlert) emitNotificationReferenceRemoved("tracking-stale-gps", runId);
    return result;
  } catch (error) { await db.rollback(); throw error; }
  finally { db.release(); }
};
const assertAvailable = (run) => {
  if (run.driver_status !== "ACTIVE" || run.driver_deleted_at) fail("The assigned collector is no longer active");
  if (!Number(run.is_today)) fail("This route belongs to another collection date");
  if (run.assigned_truck_id !== run.truck_id) fail("Truck assignment changed. Contact dispatch.");
  if (run.availability_status !== "ACTIVE") fail("This truck is unavailable for collection");
};
const notifyNextTarget = async ({ db, run, notifications }) => {
  if (run.status !== "ACTIVE" || !run.collection_started_at) return;
  const [stops] = await db.query(
    `SELECT rs.*, COALESCE(rs.stop_name, b.name) AS location
     FROM route_run_stops rs JOIN barangays b ON b.id = rs.barangay_id
     WHERE rs.route_run_id = ? AND rs.status IN ('NOT_STARTED','IN_PROGRESS')
     ORDER BY rs.stop_order, rs.id LIMIT 1 FOR UPDATE`, [run.id]);
  const stop = stops[0];
  if (!stop || stop.target_notified_at) return;
  const delivery = await notifyBarangayResidents({
    barangay_id: stop.barangay_id, street_id: stop.street_id,
    type: "COLLECTION_REMINDER", title: `Your Area Is Next: ${stop.location}`,
    body: `The collection truck is now heading to ${stop.location}. Please prepare your segregated waste.`,
    ref_id: run.id, ref_module: "tracking",
    metadata: { alert_kind: "NEXT_STREET_TARGET", route_run_id: run.id, stop_id: stop.id, street_id: stop.street_id },
    db, emit: false,
  });
  notifications.push(...delivery.notifications);
  await db.query("UPDATE route_run_stops SET target_notified_at = UTC_TIMESTAMP() WHERE id = ?", [stop.id]);
};
const closeRun = async (context) => {
  const { db, run, notifications } = context;
  if (ended(run.status)) return;
  const [rows] = await db.query(
    "SELECT COUNT(*) AS total, SUM(status = 'DONE') AS completed FROM route_run_stops WHERE route_run_id = ?", [run.id]);
  const total = Number(rows[0].total);
  const completed = Number(rows[0].completed);
  const status = total > 0 && completed === total ? "COMPLETED" : "PARTIAL";
  await db.query(
    `UPDATE route_runs SET status = ?, ended_at = UTC_TIMESTAMP(),
       total_paused_seconds = total_paused_seconds + IF(paused_at IS NULL, 0, GREATEST(0, TIMESTAMPDIFF(SECOND, paused_at, UTC_TIMESTAMP()))),
       paused_at = NULL, gps_alert_at = NULL WHERE id = ?`, [status, run.id]);
  await db.query("UPDATE trucks SET status = 'DONE' WHERE id = ?", [run.truck_id]);
  await db.query("DELETE FROM tracking_latest WHERE route_run_id = ?", [run.id]);
  await db.query("DELETE FROM notifications WHERE ref_module = 'tracking-stale-gps' AND ref_id = ?", [run.id]);
  const delivery = await notifyAdmins({
    category: "route_issues", type: "SYSTEM", title: `Route ${status === "COMPLETED" ? "Completed" : "Ended"}: ${run.truck_name}`,
    body: `${run.truck_name}: ${completed} completed, ${total - completed} missed out of ${total} stops.`,
    ref_id: run.id, ref_module: "tracking", db, emit: false,
  });
  notifications.push(...delivery.notifications);
  run.status = status;
  context.clearAlert();
};
const startRoute = async (id, userId) => {
  await withRun(id, { id: userId, role: "DRIVER" }, async (context) => {
    const { db, run } = context;
    assertAvailable(run);
    if (!Number(run.is_due)) fail("Collection is scheduled for later today");
    if (!["SCHEDULED", "ACTIVE"].includes(run.status)) fail("This route cannot be started");
    const [other] = await db.query(
      "SELECT id FROM route_runs WHERE truck_id = ? AND id <> ? AND status IN ('ACTIVE','PAUSED') LIMIT 1",
      [run.truck_id, id]);
    if (other.length) fail("Finish the other active run before starting this route");
    if (!run.collection_started_at) {
      await db.query(`UPDATE route_runs SET status = 'ACTIVE', collection_started_at = UTC_TIMESTAMP(),
        gps_expected_since = UTC_TIMESTAMP(), truck_name_snapshot = ?,
        truck_plate_snapshot = (SELECT plate_number FROM trucks WHERE id = ?) WHERE id = ?`,
      [run.truck_name, run.truck_id, id]);
      run.collection_started_at = new Date();
      run.status = "ACTIVE";
    }
    await db.query("UPDATE trucks SET status = 'ON_THE_WAY' WHERE id = ?", [run.truck_id]);
    await notifyNextTarget(context);
  });
  return require("./routeRuns.service").getMyRouteToday(userId);
};
const setRoutePaused = (id, userId, paused) => withRun(id, { id: userId, role: "DRIVER" }, async (context) => {
  const { db, run } = context;
  assertAvailable(run);
  if (!["ACTIVE", "PAUSED"].includes(run.status) || !run.collection_started_at) fail("Start the route before pausing or resuming it");
  const status = paused ? "PAUSED" : "ACTIVE";
  if (status !== run.status) {
    await db.query(
      `UPDATE route_runs SET status = ?,
       total_paused_seconds = total_paused_seconds + IF(? = 'ACTIVE' AND paused_at IS NOT NULL, GREATEST(0, TIMESTAMPDIFF(SECOND, paused_at, UTC_TIMESTAMP())), 0),
       gps_expected_since = UTC_TIMESTAMP(), paused_at = IF(? = 'PAUSED', UTC_TIMESTAMP(), NULL), gps_alert_at = NULL WHERE id = ?`,
      [status, status, status, id]);
    await db.query("DELETE FROM notifications WHERE ref_module = 'tracking-stale-gps' AND ref_id = ?", [id]);
    context.clearAlert();
    await db.query("UPDATE trucks SET status = ? WHERE id = ?", [paused ? "SCHEDULED" : "ON_THE_WAY", run.truck_id]);
    run.status = status;
    if (!paused) await notifyNextTarget(context);
  }
  return { routeId: id, status, truckId: run.truck_id };
});
const updateStopStatus = (id, stopId, status, reason, actor) => withRun(id, actor, async (context) => {
  const { db, run, notifications } = context;
  const [stops] = await db.query(
    `SELECT rs.*, COALESCE(rs.stop_name, b.name) AS location
     FROM route_run_stops rs JOIN barangays b ON b.id = rs.barangay_id
     WHERE rs.route_run_id = ? ORDER BY rs.stop_order, rs.id FOR UPDATE`, [id]);
  const stop = stops.find((item) => item.id === stopId);
  if (!stop) fail("Stop not found on this route", 404);
  if (terminal(stop.status)) {
    if (status !== stop.status) fail("A completed or missed stop cannot be changed");
    return { id, status: run.status };
  }
  assertAvailable(run);
  if (run.status !== "ACTIVE" || !run.collection_started_at) fail("Start or resume the route before updating stops");
  if (stops.find((item) => !terminal(item.status))?.id !== stopId) fail("Complete or skip the current stop first");
  if (!["IN_PROGRESS", "DONE", "MISSED"].includes(status)) fail("Invalid stop transition");
  if (status === "MISSED" && !String(reason || "").trim()) fail("A skip reason is required", 400);
  await db.query(
    "UPDATE route_run_stops SET status = ?, completed_at = IF(? IN ('DONE','MISSED'), UTC_TIMESTAMP(), NULL), skipped_reason = ? WHERE id = ?",
    [status, status, status === "MISSED" ? reason.trim() : null, stopId]);
  stop.status = status;
  if (terminal(status)) {
    const delivery = await notifyBarangayResidents({
      barangay_id: stop.barangay_id, street_id: stop.street_id,
      type: status === "DONE" ? "COLLECTION_DONE" : "MISSED_COLLECTION",
      title: `${status === "DONE" ? "Collection Completed" : "Collection Skipped"}: ${stop.location}`,
      body: status === "DONE" ? `Waste collection was completed at ${stop.location}.` : `Waste collection at ${stop.location} was skipped: ${reason.trim()}`,
      ref_id: id, ref_module: "tracking",
      metadata: { route_run_id: id, stop_id: stopId, street_id: stop.street_id }, db, emit: false,
    });
    notifications.push(...delivery.notifications);
    const column = status === "DONE" ? "collection_done_notified_at" : "collection_skipped_notified_at";
    await db.query(`UPDATE route_run_stops SET ${column} = UTC_TIMESTAMP() WHERE id = ?`, [stopId]);
    if (stops.every((item) => terminal(item.status))) await closeRun(context);
    else await notifyNextTarget(context);
  }
  return { id, status: run.status };
});
const endRoute = (id, actor, recheckMonitor = false) => withRun(id, actor, async (context) => {
  const { db, run, notifications } = context;
  if (ended(run.status)) return { routeId: id, status: run.status };
  if (!run.collection_started_at) fail("Start the route before ending it");
  const [remaining] = await db.query(
    `SELECT rs.*, COALESCE(rs.stop_name, b.name) AS location FROM route_run_stops rs
     JOIN barangays b ON b.id = rs.barangay_id
     WHERE rs.route_run_id = ? AND rs.status NOT IN ('DONE','MISSED') FOR UPDATE`, [id]);
  if (recheckMonitor && remaining.length && !Number(run.is_past) &&
      run.driver_status === "ACTIVE" && !run.driver_deleted_at &&
      run.assigned_truck_id === run.truck_id && run.availability_status === "ACTIVE") {
    return { routeId: id, status: run.status };
  }
  for (const stop of remaining) {
    const delivery = await notifyBarangayResidents({
      barangay_id: stop.barangay_id, street_id: stop.street_id,
      type: "MISSED_COLLECTION", title: `Collection Skipped: ${stop.location}`,
      body: `Waste collection at ${stop.location} was not completed before the route ended.`,
      ref_id: id, ref_module: "tracking", metadata: { route_run_id: id, stop_id: stop.id, street_id: stop.street_id },
      db, emit: false,
    });
    notifications.push(...delivery.notifications);
  }
  await db.query(
    `UPDATE route_run_stops SET status = 'MISSED', completed_at = UTC_TIMESTAMP(),
     skipped_reason = 'Route ended before collection was completed',
     collection_skipped_notified_at = UTC_TIMESTAMP()
     WHERE route_run_id = ? AND status NOT IN ('DONE','MISSED')`, [id]);
  await closeRun(context);
  return { routeId: id, status: run.status };
});
const finalizeCompletedRoutes = async () => {

  // Revocation still succeeds immediately; the monitor then reconciles operations.
  const unavailable = `NOT EXISTS (SELECT 1 FROM drivers d JOIN users u ON u.id = d.user_id
    JOIN trucks t ON t.id = d.truck_id WHERE d.id = rr.driver_id AND d.truck_id = rr.truck_id
      AND u.status = 'ACTIVE' AND u.deleted_at IS NULL AND t.availability_status = 'ACTIVE')`;
  await pool.query(`UPDATE route_runs rr SET status = 'CANCELLED'
    WHERE rr.status IN ('SCHEDULED','ACTIVE','PAUSED') AND rr.collection_started_at IS NULL
      AND (rr.run_date < ${todaySql} OR ${unavailable})`);
  const [rows] = await pool.query(
    `SELECT rr.id FROM route_runs rr WHERE rr.status IN ('ACTIVE','PAUSED')
     AND rr.collection_started_at IS NOT NULL
     AND (rr.run_date < ${todaySql} OR ${unavailable} OR
       (EXISTS (SELECT 1 FROM route_run_stops s WHERE s.route_run_id = rr.id)
        AND NOT EXISTS (SELECT 1 FROM route_run_stops s WHERE s.route_run_id = rr.id AND s.status NOT IN ('DONE','MISSED'))))`);
  for (const row of rows) await endRoute(row.id, { role: "ADMIN" }, true);
  return rows.map((row) => row.id);
};
module.exports = { startRoute, setRoutePaused, updateStopStatus, endRoute, finalizeCompletedRoutes, withRun };
