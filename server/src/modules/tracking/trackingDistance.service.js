const { pool } = require("../../config/db");
const { createDistanceAccumulator } = require("./trackingDistance");

const getTodayDistanceSummaries = async (truckIds, { now = new Date(), db = pool } = {}) => {
  const date = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00+08:00`);
  const sqlTime = value => value.toISOString().slice(0, 23).replace("T", " ");
  const states = new Map(truckIds.map(id => [id, createDistanceAccumulator()]));
  let cursor = null;
  if (truckIds.length) {
    for (;;) {
      const [rows] = await db.query(
        `SELECT tl.id, tl.truck_id, tl.route_run_id, tl.latitude, tl.longitude, tl.captured_at,
           rr.gps_expected_since
         FROM tracking_logs tl JOIN route_runs rr ON rr.id = tl.route_run_id AND rr.truck_id = tl.truck_id
         WHERE tl.truck_id IN (?) AND rr.run_date = ? AND rr.collection_started_at IS NOT NULL
           AND tl.captured_at >= ? AND tl.captured_at < ? AND tl.captured_at <= ?
           AND tl.captured_at >= rr.collection_started_at
           AND (rr.ended_at IS NULL OR tl.captured_at < DATE_ADD(rr.ended_at, INTERVAL 1 SECOND))
           ${cursor ? "AND (tl.truck_id > ? OR (tl.truck_id = ? AND (tl.captured_at > ? OR (tl.captured_at = ? AND tl.id > ?))))" : ""}
         ORDER BY tl.truck_id ASC, tl.captured_at ASC, tl.id ASC LIMIT 5000`,
        [truckIds, date, sqlTime(start), sqlTime(new Date(start.getTime() + 86400000)), sqlTime(now),
          ...(cursor ? [cursor.truck_id, cursor.truck_id, cursor.captured_at, cursor.captured_at, cursor.id] : [])],
      );
      for (const row of rows) states.get(row.truck_id)?.add(row);
      if (rows.length < 5000) break;
      cursor = rows[rows.length - 1];
    }
  }
  return new Map([...states].map(([id, state]) => [id, { date, ...state.summary() }]));
};
const getRunDistanceSummary = async (runId, { db = pool } = {}) => {
  const state = createDistanceAccumulator();
  let cursor = null;
  for (;;) {
    const [rows] = await db.query(
      `SELECT tl.id, tl.route_run_id, tl.latitude, tl.longitude, tl.captured_at, rr.gps_expected_since
       FROM tracking_logs tl JOIN route_runs rr ON rr.id = tl.route_run_id AND tl.truck_id = rr.truck_id
       WHERE tl.route_run_id = ? AND rr.status IN ('COMPLETED', 'PARTIAL')
         AND tl.captured_at >= rr.collection_started_at
         AND tl.captured_at < DATE_ADD(rr.ended_at, INTERVAL 1 SECOND)
         ${cursor ? "AND (tl.captured_at > ? OR (tl.captured_at = ? AND tl.id > ?))" : ""}
       ORDER BY tl.captured_at ASC, tl.id ASC LIMIT 5000`,
      [runId, ...(cursor ? [cursor.captured_at, cursor.captured_at, cursor.id] : [])],
    );
    rows.forEach(row => state.add(row));
    if (rows.length < 5000) break;
    cursor = rows[rows.length - 1];
  }
  return state.summary();
};

module.exports = { getTodayDistanceSummaries, getRunDistanceSummary };
