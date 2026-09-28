const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const {
  notifyBarangayResidents,
  notifyAdmins,
} = require("../notifications/notifications.service");

const STALE_GPS_SECONDS = 120;

// Calculate distance in kilometers between two GPS coordinates
const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const parseCoveragePath = (value) => {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((point) => {
      if (!Array.isArray(point) || point.length < 2) return [];
      const latitude = Number(point[0]);
      const longitude = Number(point[1]);
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? [[latitude, longitude]]
        : [];
    });
  } catch {
    return [];
  }
};

// Approximate the shortest distance from a GPS point to a street segment.
// The local projection is accurate enough for the small municipal distances
// used by the 750-meter notification radius.
const distanceToSegmentKm = (latitude, longitude, start, end) => {
  const latitudeKm = 110.574;
  const longitudeKm = 111.32 * Math.cos((latitude * Math.PI) / 180);
  const startX = (start[1] - longitude) * longitudeKm;
  const startY = (start[0] - latitude) * latitudeKm;
  const endX = (end[1] - longitude) * longitudeKm;
  const endY = (end[0] - latitude) * latitudeKm;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

  if (segmentLengthSquared === 0) {
    return Math.hypot(startX, startY);
  }

  const projection = Math.max(
    0,
    Math.min(1, -(startX * segmentX + startY * segmentY) / segmentLengthSquared),
  );
  return Math.hypot(
    startX + projection * segmentX,
    startY + projection * segmentY,
  );
};

const calculateCoverageDistanceKm = (latitude, longitude, coveragePath) => {
  if (coveragePath.length === 0) return Number.POSITIVE_INFINITY;
  if (coveragePath.length === 1) {
    return calculateHaversineDistanceKm(
      latitude,
      longitude,
      coveragePath[0][0],
      coveragePath[0][1],
    );
  }

  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < coveragePath.length; index += 1) {
    nearestDistance = Math.min(
      nearestDistance,
      distanceToSegmentKm(latitude, longitude, coveragePath[index - 1], coveragePath[index]),
    );
  }
  return nearestDistance;
};


const { todaySql, truckScope } = require("./trackingAccess");
const { withRun } = require("../routes/routeLifecycle.service");
const sqlTime = (date) => date.toISOString().slice(0, 23).replace("T", " ");
const utcTime = (value) => new Date(typeof value === "string" ? value.replace(" ", "T").replace(/Z?$/, "Z") : value);
const reject = (message, statusCode = 409) => { throw { statusCode, message }; };

// Notification rows and their once-per-stop flag commit with the accepted GPS sample.
const checkProximityAndNotify = async (context, latitude, longitude) => {
  const { db, run, notifications } = context;
  const [stops] = await db.query(
    `SELECT rs.*, COALESCE(rs.stop_name, b.name) AS location,
       b.latitude, b.longitude FROM route_run_stops rs
     JOIN barangays b ON b.id = rs.barangay_id
     WHERE rs.route_run_id = ? AND rs.status IN ('NOT_STARTED','IN_PROGRESS')
     ORDER BY rs.stop_order, rs.id LIMIT 1 FOR UPDATE`, [run.id]);
  const stop = stops[0];
  if (!stop || stop.notified_at) return;
  const path = parseCoveragePath(stop.coverage_path);
  if (!path.length && (stop.latitude == null || stop.longitude == null)) return;
  const distance = path.length ? calculateCoverageDistanceKm(latitude, longitude, path)
    : calculateHaversineDistanceKm(latitude, longitude, Number(stop.latitude), Number(stop.longitude));
  if (!Number.isFinite(distance) || distance > 0.75) return;
  const delivery = await notifyBarangayResidents({
    barangay_id: stop.barangay_id, street_id: stop.street_id, type: "TRUCK_IS_NEAR",
    title: `Truck Approaching: ${stop.location}`,
    body: `The collection truck is nearby at ${stop.location}. Please prepare your segregated waste.`,
    ref_id: run.id, ref_module: "tracking",
    metadata: { route_run_id: run.id, stop_id: stop.id, street_id: stop.street_id },
    db, emit: false,
  });
  notifications.push(...delivery.notifications);
  await db.query("UPDATE route_run_stops SET notified_at = UTC_TIMESTAMP() WHERE id = ?", [stop.id]);
};

const ping = async (userId, sample) => {
  const { latitude, longitude, truck_id, route_run_id, sample_id, captured_at } = sample;
  // Older clients can omit sample metadata; web always supplies all three.
  const [runs] = await pool.query(
    `SELECT rr.id FROM route_runs rr JOIN drivers d ON d.id = rr.driver_id
     WHERE d.user_id = ? AND rr.truck_id = ? AND rr.run_date = ${todaySql}
       AND rr.status = 'ACTIVE' AND rr.collection_started_at IS NOT NULL
       AND (? IS NULL OR rr.id = ?) ORDER BY rr.collection_started_at DESC LIMIT 1`,
    [userId, truck_id, route_run_id || null, route_run_id || null]);
  if (!runs.length) reject("Start or resume today's assigned route before sending GPS");
  return withRun(runs[0].id, { id: userId, role: "DRIVER" }, async (context) => {
    const { db, run } = context;
    if (run.driver_status !== "ACTIVE" || run.driver_deleted_at ||
        run.status !== "ACTIVE" || !run.collection_started_at || !Number(run.is_today) ||
        run.truck_id !== truck_id || run.assigned_truck_id !== truck_id || run.availability_status !== "ACTIVE") {
      reject("Tracking is no longer active for this route");
    }
    const captured = captured_at ? new Date(captured_at) : new Date();
    const age = Date.now() - captured.getTime();
    if (!Number.isFinite(age) || age > 120000 || age < -5000) reject("GPS sample is expired or has an invalid capture time", 422);
    if (captured.getTime() < utcTime(run.gps_expected_since || run.collection_started_at).getTime()) reject("GPS sample predates this route", 422);
    const [latest] = await db.query("SELECT * FROM tracking_latest WHERE truck_id = ? FOR UPDATE", [truck_id]);
    if (latest[0]?.route_run_id === run.id) {
      if (latest[0].sample_id === sample_id || captured <= utcTime(latest[0].captured_at)) {
        return { accepted: false, reason: "duplicate_or_older" };
      }
      if (captured - utcTime(latest[0].captured_at) < 3000) return { accepted: false, reason: "sample_interval" };
    }
    const id = generateId();
    const sampleId = sample_id || id;
    const [duplicate] = await db.query("SELECT id FROM tracking_logs WHERE sample_id = ? LIMIT 1", [sampleId]);
    if (duplicate.length) return { accepted: false, reason: "duplicate" };
    await db.query(
      "INSERT INTO tracking_logs (id, truck_id, driver_id, latitude, longitude, route_run_id, sample_id, captured_at) VALUES (?,?,?,?,?,?,?,?)",
      [id, truck_id, run.driver_id, latitude, longitude, run.id, sampleId, sqlTime(captured)]);
    await db.query(
      `INSERT INTO tracking_latest (truck_id,route_run_id,driver_id,sample_id,latitude,longitude,captured_at,received_at)
       VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE
       route_run_id=VALUES(route_run_id), driver_id=VALUES(driver_id), sample_id=VALUES(sample_id),
       latitude=VALUES(latitude), longitude=VALUES(longitude), captured_at=VALUES(captured_at), received_at=VALUES(received_at)`,
      [truck_id, run.id, run.driver_id, sampleId, latitude, longitude, sqlTime(captured)]);
    if (run.gps_alert_at) {
      await db.query("UPDATE route_runs SET gps_alert_at = NULL WHERE id = ?", [run.id]);
      await db.query("DELETE FROM notifications WHERE ref_module = 'tracking-stale-gps' AND ref_id = ?", [run.id]);
      context.clearAlert();
    }
    await checkProximityAndNotify(context, latitude, longitude);
    return { accepted: true, truck_id, latitude, longitude, last_ping: captured.toISOString() };
  });
};

const getLive = async (viewer = { role: "ADMIN" }) => {
  const scope = truckScope(viewer);
  const resident = viewer.role === "RESIDENT";
  const columns = viewer.role === "ADMIN" ? ", tl.driver_id, t.plate_number AS truck_plate, u.full_name AS driver_name" : "";
  const [rows] = await pool.query(
    `SELECT tl.truck_id, tl.latitude, tl.longitude, tl.captured_at AS last_ping,
       t.name AS truck_name, t.status AS truck_status ${columns}
     FROM tracking_latest tl JOIN trucks t ON t.id = tl.truck_id
     JOIN route_runs rr ON rr.id = tl.route_run_id
     LEFT JOIN drivers d ON d.id = tl.driver_id LEFT JOIN users u ON u.id = d.user_id
     WHERE rr.run_date = ${todaySql} AND rr.status IN ('ACTIVE','PAUSED') AND ${scope.sql}
       AND u.status = 'ACTIVE' AND u.deleted_at IS NULL AND d.truck_id = t.id AND t.availability_status = 'ACTIVE'
       ${resident ? `AND EXISTS (SELECT 1 FROM route_run_stops rs JOIN users resident ON resident.id = ?
        WHERE rs.route_run_id = rr.id AND rs.barangay_id = resident.barangay_id
          AND (rs.street_id IS NULL OR rs.street_id = resident.street_id)
          AND rs.status IN ('NOT_STARTED','IN_PROGRESS'))` : ""}
     ORDER BY tl.captured_at DESC, tl.truck_id`,
    [...scope.params, ...(resident ? [viewer.id] : [])]);
  return rows.map((row) => ({
    truck_id: row.truck_id, truck_name: row.truck_name, truck_status: row.truck_status,
    latitude: Number(row.latitude), longitude: Number(row.longitude), last_ping: utcTime(row.last_ping).toISOString(),
    ...(viewer.role === "ADMIN" ? { driver_id: row.driver_id, driver_name: row.driver_name, truck_plate: row.truck_plate } : {}),
  }));
};

const notifyStaleGpsRoutes = async () => {
  const [rows] = await pool.query(
    `SELECT id FROM route_runs WHERE status = 'ACTIVE' AND collection_started_at IS NOT NULL
     AND run_date = ${todaySql} AND gps_alert_at IS NULL`);
  let count = 0;
  for (const row of rows) {
    await withRun(row.id, { role: "ADMIN" }, async ({ db, run, notifications }) => {
      if (run.status !== "ACTIVE" || run.gps_alert_at) return;
      const [latest] = await db.query("SELECT captured_at FROM tracking_latest WHERE route_run_id = ?", [run.id]);
      const baseline = Math.max(utcTime(run.gps_expected_since || run.collection_started_at).getTime(),
        latest[0] ? utcTime(latest[0].captured_at).getTime() : 0);
      if (Date.now() - baseline < STALE_GPS_SECONDS * 1000) return;
      const delivery = await notifyAdmins({
        category: "route_issues", type: "SYSTEM", title: `GPS Signal Lost: ${run.truck_name}`,
        body: "No GPS update has been received for at least two minutes.",
        ref_id: run.id, ref_module: "tracking-stale-gps", db, emit: false,
      });
      notifications.push(...delivery.notifications);
      await db.query("UPDATE route_runs SET gps_alert_at = UTC_TIMESTAMP() WHERE id = ?", [run.id]);
      count++;
    });
  }
  return count;
};

// --- Get history for a specific truck ---------------------

const getHistory = async (truckId, filters = {}) => {
  const [truckCheck] = await pool.query("SELECT id FROM trucks WHERE id = ?", [
    truckId,
  ]);

  if (truckCheck.length === 0) {
    throw { statusCode: 404, message: "Truck not found" };
  }

  const safeLimit = Math.max(1, Math.min(Math.trunc(Number(filters.limit)) || 2000, 5000));
  const params = [truckId];
  let dateClause = "";
  let targetDate = null;

  if (filters.date) {
    const date = String(filters.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw { statusCode: 400, message: "Date must use YYYY-MM-DD format" };
    }
    targetDate = date;
    // GPS timestamps are stored in UTC; the admin selects a Philippine day.
    const dayStart = new Date(`${date}T00:00:00+08:00`);
    if (Number.isNaN(dayStart.getTime()) ||
        new Date(dayStart.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10) !== date) {
      throw { statusCode: 400, message: "Invalid tracking history date" };
    }
    dateClause =
      "AND tl.captured_at >= ? AND tl.captured_at < ?";
    const sqlTimestamp = (value) => value.toISOString().slice(0, 19).replace("T", " ");
    params.push(sqlTimestamp(dayStart), sqlTimestamp(new Date(dayStart.getTime() + 86400000)));
  }


  if (filters.cursor) {
    if (typeof filters.cursor !== "string" || filters.cursor.length > 256) reject("Invalid history cursor", 400);
    let cursor;
    try { cursor = JSON.parse(Buffer.from(String(filters.cursor), "base64url").toString()); } catch { reject("Invalid history cursor", 400); }
    if (!cursor || typeof cursor.time !== "string" || typeof cursor.id !== "string" ||
        !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(cursor.time) || cursor.id.length > 36) reject("Invalid history cursor", 400);
    dateClause += " AND (tl.captured_at > ? OR (tl.captured_at = ? AND tl.id > ?))";
    params.push(cursor.time, cursor.time, cursor.id);
  }
  params.push(safeLimit + 1);
  const [rows] = await pool.query(
    `SELECT
       tl.*, tl.captured_at AS created_at,
       t.name         AS truck_name,
       t.plate_number AS truck_plate,
       u.full_name    AS driver_name
     FROM tracking_logs tl
     JOIN trucks  t ON t.id = tl.truck_id
     JOIN drivers d ON d.id = tl.driver_id
     JOIN users   u ON u.id = d.user_id
     WHERE tl.truck_id = ?
       ${dateClause}
     ORDER BY tl.captured_at ASC, tl.id ASC
     LIMIT ?`,
    params,
  );

  // Historical stop outcomes come from the dated run snapshot. Current route
  // templates can change and must not be presented as that day's result.
  let stops = [];
  if (targetDate) {
    const [runStops] = await pool.query(
      `SELECT
         rrs.id            AS stop_id,
         rr.id             AS route_id,
         rrs.stop_order,
         rrs.status        AS stop_status,
         rrs.completed_at,
         rrs.skipped_reason,
         rrs.coverage_path,
         b.id              AS barangay_id,
         b.name            AS barangay_name,
         COALESCE(rrs.stop_name, b.name) AS stop_name,
         b.latitude,
         b.longitude
       FROM route_runs rr
       JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
       JOIN barangays b ON b.id = rrs.barangay_id
       WHERE rr.truck_id = ? AND rr.run_date = ?
       ORDER BY rr.scheduled_start_time ASC, rr.id ASC, rrs.stop_order ASC`,
      [truckId, targetDate],
    );
    stops = runStops;
  }


  const hasMore = rows.length > safeLimit;
  const logs = rows.slice(0, safeLimit);
  const last = logs[logs.length - 1];
  const next_cursor = hasMore ? Buffer.from(JSON.stringify({time: last.created_at, id: last.id})).toString("base64url") : null;
  return { logs, stops, next_cursor };
};

// One bounded payload for the Admin Tracking workspace. Queries are kept
// sequential to avoid a connection burst against the remote database.
const getAdminOverview = async () => {
  const trucksService = require("../trucks/trucks.service");
  const routeRunsService = require("../routes/routeRuns.service");
  const driversService = require("../drivers/drivers.service");

  const trucks = await trucksService.getAll();
  const routes = await routeRunsService.getAllRoutesToday({ role: "ADMIN" });
  const live = await getLive();
  const drivers = await driversService.getAll();

  // Recent conversation messages belong to collectors, including messages sent
  // before a route starts. Bound each conversation rather than the whole fleet.
  const driverIds = drivers.map((driver) => driver.id);
  let messages = [];
  if (driverIds.length) {
    [messages] = await pool.query(`SELECT recent.id, recent.driver_id, recent.route_id,
      recent.sent_by AS sender_user_id, recent.message, recent.is_read, recent.created_at,
      u.role AS sender_role, COALESCE(NULLIF(u.full_name, ''), 'MENRO Admin') AS sender_name
      FROM (SELECT dm.*, ROW_NUMBER() OVER (PARTITION BY dm.driver_id ORDER BY dm.created_at DESC, dm.id DESC) AS message_rank
        FROM driver_messages dm WHERE dm.driver_id IN (?)) recent
      JOIN users u ON u.id = recent.sent_by WHERE recent.message_rank <= 50
      ORDER BY recent.created_at ASC, recent.id ASC`, [driverIds]);
  }

  return { trucks, routes, live, drivers, messages };
};

// --- Clear history for a specific truck -------------------

const clearHistory = async (truckId) => {
  const [truckCheck] = await pool.query("SELECT id FROM trucks WHERE id = ?", [
    truckId,
  ]);

  if (truckCheck.length === 0) {
    throw { statusCode: 404, message: "Truck not found" };
  }

  await pool.query("DELETE FROM tracking_logs WHERE truck_id = ?", [truckId]);



  return { message: "Tracking history cleared" };
};

// In-memory cache for server-side road route proxying
const SERVER_ROUTE_CACHE = new Map();
const ROUTE_CACHE_TTL_MS = 60_000;

// The configured provider receives route coordinates. It may be public or self-hosted.
const ROUTING_ENDPOINTS = process.env.ROUTING_BASE_URL ? [process.env.ROUTING_BASE_URL.replace(/\/$/, "")] : [];

const fetchRoadRouteUncached = async (fromLng, fromLat, toLng, toLat) => {
  const cacheKey = `${Number(fromLat).toFixed(4)},${Number(fromLng).toFixed(4)}->${Number(toLat).toFixed(4)},${Number(toLng).toFixed(4)}`;
  const now = Date.now();
  const cached = SERVER_ROUTE_CACHE.get(cacheKey);
  if (cached && now - cached.timestamp < ROUTE_CACHE_TTL_MS) {
    return cached.data;
  }

  for (const baseUrl of ROUTING_ENDPOINTS) {
    const url = `${baseUrl}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    // Stay within the web client's eight-second request deadline, including body reads.
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "GreenWay-Fleet/1.0" },
        signal: controller.signal,
      });
      if (!response.ok) continue;

      const data = await response.json();
      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) continue;

      const primary = data.routes[0];
      const geoJsonCoords = primary.geometry?.coordinates; // [lng, lat]
      if (!Array.isArray(geoJsonCoords) || geoJsonCoords.length < 2 ||
        !geoJsonCoords.every((point) => Array.isArray(point) && point.length >= 2 &&
          Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
          Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)) continue;
      const coordinates = geoJsonCoords.map(([lng, lat]) => [lat, lng]); // [lat, lng]
      const distanceMeters = Number(primary.distance) || 0;
      const distanceKm = Number((distanceMeters / 1000).toFixed(2));
      const durationSeconds = Number(primary.duration) || 0;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

      const result = {
        coordinates,
        distanceMeters,
        distanceKm,
        durationSeconds,
        durationMinutes,
        source: "osrm",
      };

      for (const [key, entry] of SERVER_ROUTE_CACHE) if (now - entry.timestamp >= ROUTE_CACHE_TTL_MS) SERVER_ROUTE_CACHE.delete(key);
      if (SERVER_ROUTE_CACHE.size >= 256) SERVER_ROUTE_CACHE.delete(SERVER_ROUTE_CACHE.keys().next().value);
      SERVER_ROUTE_CACHE.set(cacheKey, { data: result, timestamp: now });
      return result;
    } catch {
      // An unavailable provider falls back to an explicitly marked estimate.
    } finally {
      clearTimeout(timeout);
    }
  }

  const distanceKm = calculateHaversineDistanceKm(
    parseFloat(fromLat),
    parseFloat(fromLng),
    parseFloat(toLat),
    parseFloat(toLng),
  );
  const distanceMeters = Math.round(distanceKm * 1000);
  const durationMinutes = Math.max(1, Math.round((distanceKm / 22) * 60));

  return {
    coordinates: [
      [parseFloat(fromLat), parseFloat(fromLng)],
      [parseFloat(toLat), parseFloat(toLng)],
    ],
    distanceMeters,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationSeconds: durationMinutes * 60,
    durationMinutes,
    source: "haversine",
  };
};


const roadRequests = new Map();
const fetchRoadRoute = async (...coordinates) => {
  const key = coordinates.map((value) => Number(value).toFixed(4)).join(",");
  if (roadRequests.has(key)) return roadRequests.get(key);
  if (roadRequests.size >= 24) reject("Routing is busy. Please retry shortly.", 429);
  const request = fetchRoadRouteUncached(...coordinates);
  roadRequests.set(key, request);
  try { return await request; } finally { roadRequests.delete(key); }
};

// Optional retention is explicit so deployment does not silently erase archives.
let lastRetentionPass = 0;
const pruneTrackingHistory = async () => {
  const days = Number(process.env.TRACKING_RETENTION_DAYS);
  if (!Number.isInteger(days) || days < 7 || Date.now() - lastRetentionPass < 3600000) return 0;
  const [result] = await pool.query(
    "DELETE FROM tracking_logs WHERE captured_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY) ORDER BY captured_at LIMIT 5000", [days]);
  lastRetentionPass = Date.now();
  return result.affectedRows;
};
module.exports = {
  ping,
  pruneTrackingHistory,
  getLive,
  getHistory,
  getAdminOverview,
  clearHistory,
  calculateHaversineDistanceKm,
  checkProximityAndNotify,
  notifyStaleGpsRoutes,
  fetchRoadRoute,
};
