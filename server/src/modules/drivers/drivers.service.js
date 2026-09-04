const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const auditService = require("../audit/audit.service");

// ─── Helpers ──────────────────────────────────────────────

const baseSelect = `
  SELECT
    d.id,
    d.status_msg,
    d.created_at,
    d.updated_at,
    u.id           AS user_id,
    u.full_name,
    u.username,
    u.email,
    u.phone,
    u.status       AS account_status,
    u.avatar_url,
    t.id           AS truck_id,
    t.name         AS truck_name,
    t.plate_number AS truck_plate,
    t.status       AS truck_status,
    (
      SELECT MAX(dm.created_at)
      FROM driver_messages dm
      WHERE dm.driver_id = d.id
        AND dm.sent_by = u.id
    )              AS status_msg_created_at,
    (
      SELECT MAX(s.created_at)
      FROM sessions s
      WHERE s.user_id = u.id
    )              AS last_login
  FROM drivers d
  JOIN  users  u ON u.id = d.user_id
  LEFT JOIN trucks t ON t.id = d.truck_id
`;

// ─── Get All ───────────────────────────────────────────────

const getAll = async () => {
  const [rows] = await pool.query(
    `${baseSelect} WHERE u.deleted_at IS NULL ORDER BY d.created_at ASC`,
  );
  return rows;
};

// ─── Get By ID ─────────────────────────────────────────────

const getById = async (id) => {
  const [rows] = await pool.query(
    `${baseSelect} WHERE d.id = ? AND u.deleted_at IS NULL`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Driver not found" };
  }

  return rows[0];
};

// ─── Get By User ID (for /me route) ───────────────────────

const getByUserId = async (userId) => {
  const [rows] = await pool.query(
    `${baseSelect} WHERE d.user_id = ? AND u.deleted_at IS NULL`,
    [userId],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Driver profile not found" };
  }

  return rows[0];
};

// ─── Create ────────────────────────────────────────────────

const create = async ({
  full_name,
  username,
  email,
  phone,
  password,
  truck_id,
}) => {
  // Check duplicate email
  const [emailCheck] = await pool.query(
    "SELECT id FROM users WHERE email = ?",
    [email],
  );
  if (emailCheck.length > 0) {
    throw { statusCode: 409, message: "Email already in use" };
  }

  // Check duplicate username
  const [usernameCheck] = await pool.query(
    "SELECT id FROM users WHERE username = ?",
    [username],
  );
  if (usernameCheck.length > 0) {
    throw { statusCode: 409, message: "Username already taken" };
  }

  // Validate truck if provided
  if (truck_id) {
    const [truckCheck] = await pool.query(
      "SELECT id FROM trucks WHERE id = ?",
      [truck_id],
    );
    if (truckCheck.length === 0) {
      throw { statusCode: 404, message: "Truck not found" };
    }

    const [assignedTruck] = await pool.query(
      `SELECT d.id
         FROM drivers d
         JOIN users u ON u.id = d.user_id
        WHERE d.truck_id = ?
          AND u.deleted_at IS NULL
        LIMIT 1`,
      [truck_id],
    );
    if (assignedTruck.length > 0) {
      throw {
        statusCode: 409,
        message: "Truck is already assigned to another collector",
      };
    }
  }

  const userId = generateId();
  const driverId = generateId();
  const hashed = await bcrypt.hash(password, 12);

  // Insert user row
  await pool.query(
    `INSERT INTO users (id, full_name, username, email, phone, password, role)
     VALUES (?, ?, ?, ?, ?, ?, 'DRIVER')`,
    [userId, full_name, username, email, phone || null, hashed],
  );

  // Insert driver row
  await pool.query(
    `INSERT INTO drivers (id, user_id, truck_id) VALUES (?, ?, ?)`,
    [driverId, userId, truck_id || null],
  );

  return getById(driverId);
};

// ─── Update ────────────────────────────────────────────────

const update = async (id, data) => {
  const driver = await getById(id);

  // Update users table fields
  const userFields = [];
  const userParams = [];

  if (data.full_name !== undefined) {
    userFields.push("full_name = ?");
    userParams.push(data.full_name);
  }

  if (data.phone !== undefined) {
    userFields.push("phone = ?");
    userParams.push(data.phone);
  }

  if (userFields.length > 0) {
    userParams.push(driver.user_id);
    await pool.query(
      `UPDATE users SET ${userFields.join(", ")} WHERE id = ?`,
      userParams,
    );
  }

  // Update drivers table fields
  const driverFields = [];
  const driverParams = [];

  if (data.truck_id !== undefined) {
    // Validate truck if not null
    if (data.truck_id !== null) {
      const [truckCheck] = await pool.query(
        "SELECT id FROM trucks WHERE id = ?",
        [data.truck_id],
      );
      if (truckCheck.length === 0) {
        throw { statusCode: 404, message: "Truck not found" };
      }

      const [assignedTruck] = await pool.query(
        `SELECT d.id
           FROM drivers d
           JOIN users u ON u.id = d.user_id
          WHERE d.truck_id = ?
            AND d.id <> ?
            AND u.deleted_at IS NULL
          LIMIT 1`,
        [data.truck_id, id],
      );
      if (assignedTruck.length > 0) {
        throw {
          statusCode: 409,
          message: "Truck is already assigned to another collector",
        };
      }
    }
    driverFields.push("truck_id = ?");
    driverParams.push(data.truck_id);
  }

  if (data.status_msg !== undefined) {
    driverFields.push("status_msg = ?");
    driverParams.push(data.status_msg);
  }

  if (driverFields.length > 0) {
    driverParams.push(id);
    await pool.query(
      `UPDATE drivers SET ${driverFields.join(", ")} WHERE id = ?`,
      driverParams,
    );
  }

  return getById(id);

  if (data.status_msg !== undefined) {
    driverFields.push("status_msg = ?");
    driverParams.push(data.status_msg);
  }

  if (driverFields.length > 0) {
    driverParams.push(id);
    await pool.query(
      `UPDATE drivers SET ${driverFields.join(", ")} WHERE id = ?`,
      driverParams,
    );
  }

  return getById(id);
};

// ─── Assign Truck ──────────────────────────────────────────

const assignTruck = async (id, truck_id) => {
  const existing = await getById(id);

  if (truck_id !== null) {
    const [truckCheck] = await pool.query(
      "SELECT id FROM trucks WHERE id = ?",
      [truck_id],
    );
    if (truckCheck.length === 0) {
      throw { statusCode: 404, message: "Truck not found" };
    }

    const [assignedTruck] = await pool.query(
      `SELECT d.id
         FROM drivers d
         JOIN users u ON u.id = d.user_id
        WHERE d.truck_id = ?
          AND d.id <> ?
          AND u.deleted_at IS NULL
        LIMIT 1`,
      [truck_id, id],
    );
    if (assignedTruck.length > 0) {
      throw {
        statusCode: 409,
        message: "Truck is already assigned to another collector",
      };
    }
  }

  await pool.query("UPDATE drivers SET truck_id = ? WHERE id = ?", [
    truck_id,
    id,
  ]);

  const updated = await getById(id);

  auditService.log({
    user_id: "admin",
    action: "ASSIGN_DRIVER_TRUCK",
    module: "drivers",
    record_id: id,
    old_value: { driver: existing.full_name, truck: existing.truck_name },
    new_value: { driver: updated.full_name, truck: updated.truck_name },
  }).catch(() => {});

  return updated;
};

// ─── Update Driver Status Message (self) ───────────────────

const insertDriverMessage = async ({ driver_id, sent_by, route_id, message }) => {
  await pool.query(
    `INSERT INTO driver_messages (id, driver_id, sent_by, route_id, message, is_read)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [generateId(), driver_id, sent_by, route_id ?? null, message, 0],
  );
};
const updateStatusMsg = async (userId, status_msg, route_id) => {
  const driver = await getByUserId(userId);

  await pool.query("UPDATE drivers SET status_msg = ? WHERE id = ?", [
    status_msg,
    driver.id,
  ]);

  await insertDriverMessage({
    driver_id: driver.id,
    sent_by: userId,
    route_id: route_id ?? null,
    message: status_msg,
  });

  return getByUserId(userId);
};

const sendAdminMessageToDriver = async (
  senderUserId,
  driverUserId,
  routeId,
  message,
) => {
  const driver = await getByUserId(driverUserId);

  await insertDriverMessage({
    driver_id: driver.id,
    sent_by: senderUserId,
    route_id: routeId,
    message,
  });

  return { message: "Message saved", driver_id: driver.id };
};

const getMyMessages = async (userId, routeId, limit = 100) => {
  const driver = await getByUserId(userId);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 300));
  const hasRouteFilter = Boolean(routeId);

  const sql = `
    SELECT
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
     WHERE dm.driver_id = ?
     ${hasRouteFilter ? "AND dm.route_id = ?" : ""}
     ORDER BY dm.created_at ASC
     LIMIT ?`;

  const params = hasRouteFilter
    ? [driver.id, routeId, safeLimit]
    : [driver.id, safeLimit];

  const [rows] = await pool.query(sql, params);

  return rows;
};

const getMessagesForAdmin = async (driverId, routeId, limit = 100) => {
  await getById(driverId);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 300));
  const hasRouteFilter = Boolean(routeId);

  const sql = `
    SELECT
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
     WHERE dm.driver_id = ?
     ${hasRouteFilter ? "AND dm.route_id = ?" : ""}
     ORDER BY dm.created_at ASC
     LIMIT ?`;

  const params = hasRouteFilter
    ? [driverId, routeId, safeLimit]
    : [driverId, safeLimit];

  const [rows] = await pool.query(sql, params);
  return rows;
};

const markMyMessagesAsRead = async (userId, routeId) => {
  const driver = await getByUserId(userId);
  if (!routeId) return { read: 0 };

  const [result] = await pool.query(
    `UPDATE driver_messages
     SET is_read = TRUE
     WHERE driver_id = ?
       AND route_id = ?
       AND sent_by <> ?
       AND is_read = FALSE`,
    [driver.id, routeId, userId],
  );

  return { read: result.affectedRows ?? 0 };
};

const formatDateLabel = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTimeLabel = (value) => {
  if (!value) return "-";

  // MySQL TIME column (HH:mm:ss)
  const timeMatch = String(value).match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const [, h, m] = timeMatch;
    const temp = new Date();
    temp.setHours(Number(h), Number(m), 0, 0);
    return temp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const getActivityLog = async (driverId, limit = 30) => {
  const driver = await getById(driverId);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));

  const [routeRows] = await pool.query(
    `SELECT
       r.id                                  AS route_id,
       COALESCE(r.name, CONCAT('Route ', LEFT(r.id, 6))) AS route_name,
       r.start_time                          AS route_start_time,
       r.created_at                          AS route_created_at,
       COUNT(rs.id)                          AS barangays_total,
       SUM(CASE WHEN rs.status = 'DONE' THEN 1 ELSE 0 END) AS barangays_completed,
       MIN(rs.completed_at)                  AS first_completed_at,
       MAX(rs.completed_at)                  AS last_completed_at
     FROM routes r
     LEFT JOIN route_stops rs ON rs.route_id = r.id
     WHERE r.driver_id = ?
     GROUP BY r.id, r.name, r.start_time, r.created_at
     ORDER BY COALESCE(MAX(rs.completed_at), r.created_at) DESC
     LIMIT ?`,
    [driverId, safeLimit],
  );

  if (routeRows.length === 0) {
    return [];
  }

  const routeIds = routeRows.map((row) => row.route_id);
  const placeholders = routeIds.map(() => "?").join(", ");

  const [messageRows] = await pool.query(
    `SELECT
       dm.route_id,
       dm.message,
       dm.created_at
     FROM driver_messages dm
     WHERE dm.driver_id = ?
       AND dm.sent_by = ?
       AND dm.route_id IN (${placeholders})
     ORDER BY dm.created_at DESC`,
    [driverId, driver.user_id, ...routeIds],
  );

  const messagesByRoute = new Map();
  for (const row of messageRows) {
    if (!messagesByRoute.has(row.route_id)) {
      messagesByRoute.set(row.route_id, []);
    }
    const bucket = messagesByRoute.get(row.route_id);
    if (bucket.length < 5) {
      bucket.push(row.message);
    }
  }

  return routeRows.map((row) => {
    const eventDate = row.last_completed_at || row.first_completed_at || row.route_created_at;

    return {
      route_id: row.route_id,
      date: formatDateLabel(eventDate),
      route: row.route_name,
      barangays_completed: Number(row.barangays_completed) || 0,
      barangays_total: Number(row.barangays_total) || 0,
      start_time: formatTimeLabel(row.first_completed_at || row.route_start_time),
      end_time: formatTimeLabel(row.last_completed_at),
      status_messages: messagesByRoute.get(row.route_id) || [],
    };
  });
};

const getMyHistory = async (userId, limit = 50) => {
  const driver = await getByUserId(userId);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));

  const [routeRows] = await pool.query(
    `SELECT
       r.id           AS route_id,
       COALESCE(r.name, CONCAT('Route ', LEFT(r.id, 6))) AS route_name,
       r.day_of_week,
       r.start_time,
       r.status       AS route_status,
       COALESCE(r.waste_type, 'General') AS waste_type,
       r.created_at,
       r.updated_at,
       t.id           AS truck_id,
       t.name         AS truck_name,
       t.plate_number AS truck_plate
     FROM routes r
     LEFT JOIN trucks t ON t.id = r.truck_id
     WHERE r.driver_id = ?
     ORDER BY r.created_at DESC
     LIMIT ?`,
    [driver.id, safeLimit],
  );

  if (routeRows.length === 0) {
    return [];
  }

  const routeIds = routeRows.map((r) => r.route_id);
  const placeholders = routeIds.map(() => "?").join(", ");

  const [stopsRows] = await pool.query(
    `SELECT
       rs.id             AS stop_id,
       rs.route_id,
       rs.stop_order,
       rs.status         AS stop_status,
       rs.completed_at,
       rs.skipped_reason,
       rs.distance_km,
       b.id              AS barangay_id,
       b.name            AS barangay_name,
       (SELECT COUNT(*) FROM users u WHERE u.barangay_id = b.id AND u.deleted_at IS NULL) AS residents_count
     FROM route_stops rs
     JOIN barangays b ON b.id = rs.barangay_id
     WHERE rs.route_id IN (${placeholders})
     ORDER BY rs.stop_order ASC`,
    routeIds,
  );

  const stopsByRoute = new Map();
  for (const stop of stopsRows) {
    if (!stopsByRoute.has(stop.route_id)) {
      stopsByRoute.set(stop.route_id, []);
    }
    stopsByRoute.get(stop.route_id).push({
      stopNumber: stop.stop_order,
      barangay: stop.barangay_name,
      status: stop.stop_status === "DONE" ? "done" : stop.stop_status === "MISSED" ? "skipped" : "pending",
      time: stop.completed_at ? new Date(stop.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "N/A",
      skipReason: stop.skipped_reason || null,
      residentsNotified: stop.residents_count || 0,
    });
  }

  return routeRows.map((r) => {
    const stops = stopsByRoute.get(r.route_id) || [];
    const totalStops = stops.length;
    const completedStops = stops.filter((s) => s.status === "done").length;
    const skippedStops = stops.filter((s) => s.status === "skipped").length;
    const completionPct = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;
    const status = completedStops === totalStops && totalStops > 0 ? "completed" : completedStops > 0 ? "partial" : "no-collection";

    const dateObj = new Date(r.created_at);
    const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const dayOfWeek = r.day_of_week.charAt(0) + r.day_of_week.slice(1).toLowerCase();

    return {
      id: r.route_id,
      date: dateStr,
      dayOfWeek,
      routeName: r.route_name,
      wasteType: r.waste_type,
      truckName: r.truck_name || "Truck A",
      truckPlate: r.truck_plate || "N/A",
      totalStops,
      completedStops,
      skippedStops,
      completionPct,
      timeOnRoute: "2h 45m",
      status,
      stops,
      adminMessages: [],
    };
  });
};

// ─── Delete ────────────────────────────────────────────────

const remove = async (id) => {
  const driver = await getById(id);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Release truck assignment first so this truck can be reassigned later.
    await connection.query("UPDATE drivers SET truck_id = NULL WHERE id = ?", [id]);

    // Soft delete the user — sets deleted_at.
    await connection.query("UPDATE users SET deleted_at = NOW() WHERE id = ?", [
      driver.user_id,
    ]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { message: "Driver removed successfully" };
};

module.exports = {
  getAll,
  getById,
  getByUserId,
  create,
  update,
  assignTruck,
  updateStatusMsg,
  sendAdminMessageToDriver,
  getMyMessages,
  getMessagesForAdmin,
  markMyMessagesAsRead,
  getActivityLog,
  getMyHistory,
  remove,
};


