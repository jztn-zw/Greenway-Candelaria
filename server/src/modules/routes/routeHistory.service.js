const { pool } = require("../../config/db");
const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";
const parseUtc = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value).replace(" ", "T").replace(/Z?$/, "Z"));
  return Number.isNaN(date.getTime()) ? null : date;
};
const duration = (milliseconds) => {
  if (milliseconds === null) return null;
  const minutes = Math.max(0, Math.round(milliseconds / 60000));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
const getHistoryForUser = async (userId, limit = 50, filters = {}) => {
  const requested = Number(limit);
  if (!Number.isInteger(requested) || requested < 1) throw { statusCode: 400, message: "History limit must be a positive whole number" };
  const safeLimit = Math.min(requested, 100);
  const web = filters.view === "collector";
  if (web) {
    for (const key of ["run_id", "status", "waste_type", "cursor"]) {
      if (filters[key] !== undefined && typeof filters[key] !== "string") throw { statusCode: 400, message: `Invalid history ${key}` };
    }
  }
  const detail = web && filters.run_id;
  const clauses = ["d.user_id = ?", "rr.status IN ('COMPLETED', 'PARTIAL')"];
  const params = [userId];
  const hasDone = "EXISTS (SELECT 1 FROM route_run_stops s WHERE s.route_run_id = rr.id AND s.status = 'DONE')";
  if (web && filters.status && filters.status !== "all") {
    const statuses = { completed: "rr.status = 'COMPLETED'", partial: `rr.status = 'PARTIAL' AND ${hasDone}`,
      "no-collection": `rr.status = 'PARTIAL' AND NOT ${hasDone}` };
    if (!Object.hasOwn(statuses, filters.status)) throw { statusCode: 400, message: "Invalid history status" };
    clauses.push(statuses[filters.status]);
  }
  if (web && filters.waste_type && filters.waste_type !== "all") {
    if (!["Biodegradable", "Non-Biodegradable", "General"].includes(filters.waste_type)) throw { statusCode: 400, message: "Invalid waste type" };
    clauses.push("COALESCE(rr.waste_type, 'General') = ?"); params.push(filters.waste_type);
  }
  if (detail) { clauses.push("rr.id = ?"); params.push(filters.run_id); }
  const baseWhere = clauses.join(" AND ");
  const countParams = [...params];
  if (web && filters.cursor && !detail) {
    let cursor;
    try { cursor = JSON.parse(Buffer.from(String(filters.cursor), "base64url").toString()); } catch { /* reject below */ }
    if (!cursor || typeof cursor.id !== "string" || !cursor.id || typeof cursor.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(cursor.date)) {
      throw { statusCode: 400, message: "Invalid history cursor" };
    }
    clauses.push("(rr.run_date < ? OR (rr.run_date = ? AND rr.id < ?))"); params.push(cursor.date, cursor.date, cursor.id);
  }
  const [rows] = await pool.query(
    `SELECT rr.id, rr.route_id AS template_route_id, rr.route_name, rr.waste_type, rr.run_date, rr.status, rr.collection_started_at, rr.ended_at, rr.total_paused_seconds,
      ${web ? "COALESCE(rr.truck_name_snapshot, t.name) AS truck_name, COALESCE(rr.truck_plate_snapshot, t.plate_number) AS truck_plate" : "t.name AS truck_name, t.plate_number AS truck_plate"},
      (SELECT COUNT(*) FROM route_run_stops s WHERE s.route_run_id = rr.id) AS total_stops,
      (SELECT COUNT(*) FROM route_run_stops s WHERE s.route_run_id = rr.id AND s.status = 'DONE') AS completed_stops,
      (SELECT COUNT(*) FROM route_run_stops s WHERE s.route_run_id = rr.id AND s.status = 'MISSED') AS skipped_stops
     FROM route_runs rr JOIN drivers d ON d.id = rr.driver_id
     LEFT JOIN trucks t ON t.id = rr.truck_id
     WHERE ${clauses.join(" AND ")} ORDER BY rr.run_date DESC, rr.id DESC LIMIT ?`,
    [...params, web && !detail ? safeLimit + 1 : safeLimit]);
  if (detail && !rows.length) throw { statusCode: 404, message: "Route history not found for this collector" };
  const runs = rows.slice(0, safeLimit);
  const stopsByRun = new Map();
  if (runs.length && (!web || detail)) {
    const [stops] = await pool.query(
      `SELECT rrs.id, rrs.route_run_id, rrs.stop_order, rrs.status, rrs.completed_at, rrs.skipped_reason,
        COALESCE(rrs.stop_name, b.name, 'Unknown checkpoint') AS stop_name
       FROM route_run_stops rrs LEFT JOIN barangays b ON b.id = rrs.barangay_id
       WHERE rrs.route_run_id IN (?) ORDER BY rrs.stop_order, rrs.id`, [runs.map((run) => run.id)]);
    for (const stop of stops) {
      if (!stopsByRun.has(stop.route_run_id)) stopsByRun.set(stop.route_run_id, []);
      const time = parseUtc(stop.completed_at);
      stopsByRun.get(stop.route_run_id).push({ id: stop.id, stopNumber: stop.stop_order, barangay: stop.stop_name,
        status: stop.status === "DONE" ? "done" : stop.status === "MISSED" ? "skipped" : "pending",
        time: time ? new Intl.DateTimeFormat("en-PH", { timeZone: APP_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(time) : (web ? "" : "—"),
        ...(!web ? { residentsNotified: 0 } : {}),
        skipReason: stop.skipped_reason || null });
    }
  }
  const items = runs.map((run) => {
    const start = parseUtc(run.collection_started_at), end = parseUtc(run.ended_at);
    const elapsed = start && end && end >= start ? end - start : null;
    const active = elapsed === null ? null : Math.max(0, elapsed - (Number(run.total_paused_seconds) || 0) * 1000);
    const totalStops = Number(run.total_stops) || 0, completedStops = Number(run.completed_stops) || 0;
    const date = new Date(`${run.run_date}T00:00:00Z`);
    return { id: run.id, date: new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, month: "short", day: "numeric", year: "numeric" }).format(date),
      dayOfWeek: new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, weekday: "long" }).format(date),
      routeName: run.route_name || "Collection route", wasteType: run.waste_type || "General",
      truckName: run.truck_name || (web ? "Historical vehicle unavailable" : "Unassigned vehicle"), truckPlate: run.truck_plate || "N/A",
      totalStops, completedStops, skippedStops: Number(run.skipped_stops) || 0,
      completionPct: totalStops ? Math.round(completedStops / totalStops * 100) : 0,
      timeOnRoute: duration(active) ?? (web ? null : "0m"),
      status: run.status === "COMPLETED" ? "completed" : completedStops ? "partial" : "no-collection",
      stops: stopsByRun.get(run.id) || [], ...(!web ? { adminMessages: [], templateRouteId: run.template_route_id } : {}),
    };
  });
  if (!web) return items;
  const [[count]] = await pool.query(
    `SELECT COUNT(*) AS total FROM route_runs rr JOIN drivers d ON d.id = rr.driver_id WHERE ${baseWhere}`, countParams);
  const last = runs.at(-1);
  return { items, total: Number(count.total), nextCursor: !detail && rows.length > safeLimit && last
    ? Buffer.from(JSON.stringify({ id: last.id, date: last.run_date })).toString("base64url") : null };
};
module.exports = { getHistoryForUser };
