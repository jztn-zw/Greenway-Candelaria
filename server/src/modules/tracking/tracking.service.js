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

// Check the next scheduled active route stop (<= 750m) and notify its residents.
const checkProximityAndNotify = async (truckId, truckLat, truckLng) => {
  try {
    const [stops] = await pool.query(
      `SELECT
         rs.id AS stop_id,
         rs.route_id,
         rs.barangay_id,
         rs.notified_at,
         b.name AS barangay_name,
         b.latitude AS barangay_lat,
         b.longitude AS barangay_lng
       FROM routes r
       JOIN route_stops rs ON rs.route_id = r.id
       JOIN barangays b ON b.id = rs.barangay_id
       WHERE r.truck_id = ?
         AND r.status = 'ACTIVE'
         AND rs.status IN ('NOT_STARTED', 'IN_PROGRESS')
         AND b.latitude IS NOT NULL
         AND b.longitude IS NOT NULL
       ORDER BY rs.stop_order ASC
       LIMIT 1`,
      [truckId],
    );

    const stop = stops[0];
    if (!stop || stop.notified_at) return;

    const distanceKm = calculateHaversineDistanceKm(
      Number(truckLat),
      Number(truckLng),
      Number(stop.barangay_lat),
      Number(stop.barangay_lng),
    );
    if (!Number.isFinite(distanceKm) || distanceKm > 0.75) return;

    // Claim the alert atomically so simultaneous GPS pings cannot duplicate it.
    const [claimResult] = await pool.query(
      "UPDATE route_stops SET notified_at = NOW() WHERE id = ? AND notified_at IS NULL",
      [stop.stop_id],
    );
    if (claimResult.affectedRows === 0) return;

    try {
      await notifyBarangayResidents({
        barangay_id: stop.barangay_id,
        type: "TRUCK_IS_NEAR",
        title: `Truck Approaching: ${stop.barangay_name}`,
        body: "The collection truck is nearby. Please prepare your segregated waste.",
        ref_id: stop.route_id,
        ref_module: "tracking",
      });
    } catch (err) {
      // Release the claim so a later GPS ping can retry a failed delivery.
      await pool.query(
        "UPDATE route_stops SET notified_at = NULL WHERE id = ?",
        [stop.stop_id],
      );
      throw err;
    }
  } catch (err) {
    console.error("[Tracking]  Proximity check error:", err.message);
  }
};

const ping = async (userId, { latitude, longitude, truck_id }) => {
  const [driverRows] = await pool.query(
    "SELECT id, truck_id FROM drivers WHERE user_id = ?",
    [userId],
  );
  if (driverRows.length === 0)
    throw { statusCode: 404, message: "Driver profile not found" };

  const driver = driverRows[0];

  if (!driver.truck_id) {
    throw {
      statusCode: 400,
      message: "Driver has no truck assigned",
    };
  }

  if (driver.truck_id !== truck_id) {
    throw {
      statusCode: 403,
      message: "You can only send tracking updates for your assigned truck",
    };
  }

  const [pausedRoutes] = await pool.query(
    "SELECT id FROM routes WHERE truck_id = ? AND driver_id = ? AND status = 'PAUSED' LIMIT 1",
    [truck_id, driver.id],
  );
  if (pausedRoutes.length > 0) {
    throw { statusCode: 409, message: "Route is paused. Resume it before sending GPS updates" };
  }

  const logId = generateId();

  //  Use a transaction for robustness
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO tracking_logs (id, truck_id, driver_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)`,
      [logId, truck_id, driver.id, latitude, longitude],
    );

    await connection.query(
      `UPDATE trucks SET status = 'ON_THE_WAY' WHERE id = ?`,
      [truck_id],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  // Check proximity in background without blocking ping response
  checkProximityAndNotify(truck_id, latitude, longitude);

  const [log] = await pool.query(
    `SELECT tl.*, t.name AS truck_name, u.full_name AS driver_name
     FROM tracking_logs tl
     JOIN trucks t ON t.id = tl.truck_id
     JOIN drivers d ON d.id = tl.driver_id
     JOIN users u ON u.id = d.user_id
     WHERE tl.id = ?`,
    [logId],
  );

  return log[0];
};

// --- Get latest location per truck (live view) -------------

const getLive = async () => {
  const [rows] = await pool.query(
    `SELECT
       tl.truck_id,
       tl.driver_id,
       tl.latitude,
       tl.longitude,
       tl.created_at  AS last_ping,
       t.name         AS truck_name,
       t.plate_number AS truck_plate,
       t.status       AS truck_status,
       u.full_name    AS driver_name
     FROM tracking_logs tl
     JOIN trucks  t ON t.id = tl.truck_id
     JOIN drivers d ON d.id = tl.driver_id
     JOIN users   u ON u.id = d.user_id
     INNER JOIN (
       SELECT truck_id, MAX(created_at) AS latest
       FROM tracking_logs
       GROUP BY truck_id
     ) latest_ping
       ON tl.truck_id = latest_ping.truck_id
      AND tl.created_at = latest_ping.latest
     ORDER BY tl.created_at DESC`,
  );

  return rows;
};

// Notify dispatchers once when an active route has no GPS ping for two minutes.
// Paused routes are intentionally excluded because their GPS is expected to stop.
const notifyStaleGpsRoutes = async () => {
  const [rows] = await pool.query(
    `SELECT
       r.id AS route_id,
       t.id AS truck_id,
       t.name AS truck_name,
       COALESCE(MAX(tl.created_at), r.collection_started_at) AS last_ping,
       TIMESTAMPDIFF(
         SECOND,
         COALESCE(MAX(tl.created_at), r.collection_started_at),
         UTC_TIMESTAMP()
       ) AS seconds_since_ping
     FROM routes r
     JOIN trucks t ON t.id = r.truck_id
     LEFT JOIN tracking_logs tl ON tl.truck_id = t.id
     WHERE r.status = 'ACTIVE'
       AND r.collection_started_at IS NOT NULL
     GROUP BY r.id, t.id, t.name, r.collection_started_at
     HAVING seconds_since_ping >= ?`,
    [STALE_GPS_SECONDS],
  );

  for (const route of rows) {
    const [existing] = await pool.query(
      `SELECT id FROM notifications
       WHERE type = 'SYSTEM'
         AND ref_module = 'tracking-stale-gps'
         AND ref_id = ?
       LIMIT 1`,
      [route.route_id],
    );
    if (existing.length > 0) continue;

    // The route may have ended while this monitor pass was preparing the
    // alert. Verify it is still actively collecting before notifying admins.
    const [activeRoute] = await pool.query(
      "SELECT id FROM routes WHERE id = ? AND status = 'ACTIVE' AND collection_started_at IS NOT NULL LIMIT 1",
      [route.route_id],
    );
    if (activeRoute.length === 0) continue;

    const minutes = Math.max(2, Math.floor(Number(route.seconds_since_ping) / 60));
    await notifyAdmins({
      type: "SYSTEM",
      title: `GPS Signal Lost: ${route.truck_name}`,
      body: `No GPS update has been received for ${minutes} minutes.`,
      ref_id: route.route_id,
      ref_module: "tracking-stale-gps",
    });
  }

  return rows.length;
};

// --- Get history for a specific truck ---------------------

const getHistory = async (truckId, filters = {}) => {
  const [truckCheck] = await pool.query("SELECT id FROM trucks WHERE id = ?", [
    truckId,
  ]);

  if (truckCheck.length === 0) {
    throw { statusCode: 404, message: "Truck not found" };
  }

  const safeLimit = Math.max(1, Math.min(Number(filters.limit) || 2000, 5000));
  const params = [truckId];
  let dateClause = "";
  let targetDate = null;

  if (filters.date) {
    const date = String(filters.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw { statusCode: 400, message: "Date must use YYYY-MM-DD format" };
    }
    targetDate = date;
    dateClause =
      "AND tl.created_at >= ? AND tl.created_at < DATE_ADD(?, INTERVAL 1 DAY)";
    params.push(date, date);
  }

  params.push(safeLimit);
  const [rows] = await pool.query(
    `SELECT
       tl.*,
       t.name         AS truck_name,
       t.plate_number AS truck_plate,
       u.full_name    AS driver_name
     FROM tracking_logs tl
     JOIN trucks  t ON t.id = tl.truck_id
     JOIN drivers d ON d.id = tl.driver_id
     JOIN users   u ON u.id = d.user_id
     WHERE tl.truck_id = ?
       ${dateClause}
     ORDER BY tl.created_at ASC
     LIMIT ?`,
    params,
  );

  // Resolve scheduled route stops for this truck
  let stops = [];
  const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  let targetDay = null;
  if (targetDate) {
    const parts = String(targetDate).split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      targetDay = dayNames[d.getDay()];
    }
  }

  if (targetDate) {
    const [scheduledStops] = await pool.query(
      `SELECT
         rs.id             AS stop_id,
         rs.route_id,
         rs.stop_order,
         rs.status         AS stop_status,
         rs.completed_at,
         rs.skipped_reason,
         b.id              AS barangay_id,
         b.name            AS barangay_name,
         b.latitude,
         b.longitude
       FROM routes r
       JOIN route_stops rs ON rs.route_id = r.id
       JOIN barangays b ON b.id = rs.barangay_id
       WHERE r.truck_id = ? AND (UPPER(r.day_of_week) = ? OR UPPER(r.day_of_week) = UPPER(DAYNAME(?)))
       ORDER BY rs.stop_order ASC`,
      [truckId, targetDay || "", targetDate],
    );
    stops = scheduledStops;
  }

  if (stops.length === 0) {
    const [latestRoute] = await pool.query(
      `SELECT id FROM routes WHERE truck_id = ? ORDER BY updated_at DESC LIMIT 1`,
      [truckId],
    );
    if (latestRoute.length > 0) {
      const [fallbackStops] = await pool.query(
        `SELECT
           rs.id             AS stop_id,
           rs.route_id,
           rs.stop_order,
           rs.status         AS stop_status,
           rs.completed_at,
           rs.skipped_reason,
           b.id              AS barangay_id,
           b.name            AS barangay_name,
           b.latitude,
           b.longitude
         FROM route_stops rs
         JOIN barangays b ON b.id = rs.barangay_id
         WHERE rs.route_id = ?
         ORDER BY rs.stop_order ASC`,
        [latestRoute[0].id],
      );
      stops = fallbackStops;
    }
  }

  return { logs: rows, stops };
};

// One bounded payload for the Admin Tracking workspace. Queries are kept
// sequential to avoid a connection burst against the remote database.
const getAdminOverview = async () => {
  const trucksService = require("../trucks/trucks.service");
  const routesService = require("../routes/routes.service");
  const driversService = require("../drivers/drivers.service");

  const trucks = await trucksService.getAll();
  const routes = await routesService.getAllRoutesToday();
  const live = await getLive();
  const drivers = await driversService.getAll();

  const routeIds = routes
    .map((route) => route.route_id)
    .filter((routeId) => typeof routeId === "string" && routeId.trim());

  let messages = [];
  if (routeIds.length > 0) {
    const placeholders = routeIds.map(() => "?").join(", ");
    [messages] = await pool.query(
      `SELECT
         dm.id,
         dm.driver_id,
         dm.route_id,
         dm.sent_by AS sender_user_id,
         dm.message,
         dm.is_read,
         dm.created_at,
         u.role AS sender_role,
         COALESCE(NULLIF(u.full_name, ''), NULLIF(u.username, ''), 'User') AS sender_name
       FROM driver_messages dm
       JOIN users u ON u.id = dm.sent_by
       WHERE dm.route_id IN (${placeholders})
       ORDER BY dm.created_at DESC
       LIMIT 1000`,
      routeIds,
    );
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

  await pool.query(`UPDATE trucks SET status = 'OFFLINE' WHERE id = ?`, [
    truckId,
  ]);

  return { message: "Tracking history cleared" };
};

// In-memory cache for server-side road route proxying
const SERVER_ROUTE_CACHE = new Map();
const ROUTE_CACHE_TTL_MS = 60_000;

const ROUTING_ENDPOINTS = [
  "https://routing.openstreetmap.de/routed-car/route/v1/driving",
  "https://router.project-osrm.org/route/v1/driving",
];

const fetchRoadRoute = async (fromLng, fromLat, toLng, toLat) => {
  const cacheKey = `${Number(fromLat).toFixed(4)},${Number(fromLng).toFixed(4)}->${Number(toLat).toFixed(4)},${Number(toLng).toFixed(4)}`;
  const now = Date.now();
  const cached = SERVER_ROUTE_CACHE.get(cacheKey);
  if (cached && now - cached.timestamp < ROUTE_CACHE_TTL_MS) {
    return cached.data;
  }

  for (const baseUrl of ROUTING_ENDPOINTS) {
    const url = `${baseUrl}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "GreenWay-Fleet/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json();
      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) continue;

      const primary = data.routes[0];
      const geoJsonCoords = primary.geometry.coordinates; // [lng, lat]
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

      SERVER_ROUTE_CACHE.set(cacheKey, { data: result, timestamp: now });
      return result;
    } catch (err) {
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

module.exports = {
  ping,
  getLive,
  getHistory,
  getAdminOverview,
  clearHistory,
  calculateHaversineDistanceKm,
  checkProximityAndNotify,
  notifyStaleGpsRoutes,
  fetchRoadRoute,
};
