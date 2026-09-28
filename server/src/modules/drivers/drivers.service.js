const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const routeRunsService = require("../routes/routeRuns.service");
const generateId = require("../../utils/generateId");
const auditService = require("../audit/audit.service");
const { sendToMany, emitStoredNotifications, notifyAdmins } = require("../notifications/notifications.service");

// ─── Helpers ──────────────────────────────────────────────

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";

const parseStoredUtcDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const normalized = String(value).trim().replace(" ", "T");
  const hasTimeZone = normalized.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(normalized);
  const date = new Date(hasTimeZone ? normalized : `${normalized}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatHistoryDate = (value) => {
  const date = parseStoredUtcDate(value);
  return date
    ? new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
    : "Unknown date";
};

const formatHistoryTime = (value) => {
  const date = parseStoredUtcDate(value);
  return date
    ? new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
    : "N/A";
};

// Routes display the driver assigned at the time they are scheduled. When a
// truck receives its first driver later, link only its previously unassigned
// routes—never overwrite a route that already names a different driver.
const linkUnassignedRoutesToDriver = async (truckId, driverId, executor = pool) => {
  if (!truckId || !driverId) return;

  await executor.query(
    `UPDATE routes
        SET driver_id = ?
      WHERE truck_id = ?
        AND driver_id IS NULL`,
    [driverId, truckId],
  );
};

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
    u.last_login_at AS last_login,
    t.id           AS truck_id,
    t.name         AS truck_name,
    t.plate_number AS truck_plate,
    t.status       AS truck_status,
    t.availability_status AS truck_availability,
    t.truck_model  AS truck_model,
    (
      SELECT MAX(dm.created_at)
      FROM driver_messages dm
      WHERE dm.driver_id = d.id
        AND dm.sent_by = u.id
    )              AS status_msg_created_at
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

const resetPassword = async (id, adminUserId, password) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT d.user_id FROM drivers d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = ? AND u.deleted_at IS NULL FOR UPDATE`,
      [id],
    );
    if (!rows.length) throw { statusCode: 404, message: "Collector not found" };

    const hashedPassword = await bcrypt.hash(password, 12);
    await connection.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, rows[0].user_id]);
    await connection.query("DELETE FROM sessions WHERE user_id = ?", [rows[0].user_id]);
    await connection.commit();

    auditService.log({
      user_id: adminUserId,
      action: "RESET_DRIVER_PASSWORD",
      module: "drivers",
      record_id: id,
      new_value: { sessions_revoked: true },
    }).catch(() => {});
    return { reset: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ─── Create ────────────────────────────────────────────────

const create = async ({
  full_name,
  username,
  email,
  phone,
  password,
  truck_id,
}, adminUserId, ipAddress = null) => {
  const userId = generateId();
  const driverId = generateId();
  const hashed = await bcrypt.hash(password, 12);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (truck_id) await assertTruckAssignable(connection, truck_id);
    const [emailCheck] = await connection.query("SELECT id FROM users WHERE email = ?", [email]);
    if (emailCheck.length) throw { statusCode: 409, message: "Email already in use" };
    const [usernameCheck] = await connection.query("SELECT id FROM users WHERE username = ?", [username]);
    if (usernameCheck.length) throw { statusCode: 409, message: "Username already taken" };

    await connection.query(
      `INSERT INTO users (id, full_name, username, email, phone, password, role)
       VALUES (?, ?, ?, ?, ?, ?, 'DRIVER')`,
      [userId, full_name, username, email, phone || null, hashed],
    );
    await connection.query(
      "INSERT INTO drivers (id, user_id, truck_id) VALUES (?, ?, ?)",
      [driverId, userId, truck_id || null],
    );
    await linkUnassignedRoutesToDriver(truck_id, driverId, connection);
    if (truck_id) {
      const [[truck]] = await connection.query("SELECT name FROM trucks WHERE id = ?", [truck_id]);
      await auditService.logInTransaction(connection, {
        user_id: adminUserId, action: "ASSIGN_DRIVER_TRUCK", module: "trucks",
        record_id: driverId, ip_address: ipAddress,
        old_value: { driver: full_name, truck: null, truck_id: null },
        new_value: { driver: full_name, truck: truck?.name || null, truck_id },
      });
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      throw { statusCode: 409, message: "Email, username, or truck assignment already exists" };
    }
    throw error;
  } finally {
    connection.release();
  }
  return getById(driverId);
};

// ─── Update ────────────────────────────────────────────────

const assertTruckAssignable = async (connection, truckId, excludeDriverId = null) => {
  const [trucks] = await connection.query("SELECT id FROM trucks WHERE id = ? FOR UPDATE", [truckId]);
  if (!trucks.length) throw { statusCode: 404, message: "Truck not found" };
  const [activeRuns] = await connection.query(
    "SELECT id FROM route_runs WHERE truck_id = ? AND status IN ('ACTIVE','PAUSED') AND (? IS NULL OR driver_id <> ?) LIMIT 1",
    [truckId, excludeDriverId, excludeDriverId]);
  if (activeRuns.length) throw { statusCode: 409, message: "Finish this truck's active run before changing its collector" };
  const [assigned] = await connection.query(
    "SELECT id FROM drivers WHERE truck_id = ? AND (? IS NULL OR id <> ?) LIMIT 1",
    [truckId, excludeDriverId, excludeDriverId],
  );
  if (assigned.length) {
    throw { statusCode: 409, message: "Truck is already assigned to another collector" };
  }
};

const update = async (id, data, adminUserId, ipAddress = null) => {
  let delivery = { notifications: [] };
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (data.truck_id) await assertTruckAssignable(connection, data.truck_id, id);
    const [drivers] = await connection.query(
      `SELECT d.user_id, d.truck_id, u.full_name, t.name AS truck_name
       FROM drivers d JOIN users u ON u.id = d.user_id
       LEFT JOIN trucks t ON t.id = d.truck_id
       WHERE d.id = ? AND u.deleted_at IS NULL FOR UPDATE`,
      [id],
    );
    if (!drivers.length) throw { statusCode: 404, message: "Collector not found" };
    if (data.truck_id !== undefined && data.truck_id !== drivers[0].truck_id) {
      const [runs] = await connection.query("SELECT id FROM route_runs WHERE driver_id = ? AND (status IN ('ACTIVE','PAUSED') OR (status = 'SCHEDULED' AND run_date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')))) LIMIT 1 FOR UPDATE", [id]);
      if (runs.length) throw { statusCode: 409, message: "Finish or cancel today's assigned run before reassigning the truck" };
    }

    const userFields = [];
    const userParams = [];
    if (data.full_name !== undefined) { userFields.push("full_name = ?"); userParams.push(data.full_name); }
    if (data.phone !== undefined) { userFields.push("phone = ?"); userParams.push(data.phone); }
    if (userFields.length) {
      await connection.query(`UPDATE users SET ${userFields.join(", ")} WHERE id = ?`, [...userParams, drivers[0].user_id]);
    }

    const driverFields = [];
    const driverParams = [];
    if (data.truck_id !== undefined) { driverFields.push("truck_id = ?"); driverParams.push(data.truck_id); }
    if (data.status_msg !== undefined) { driverFields.push("status_msg = ?"); driverParams.push(data.status_msg); }
    if (driverFields.length) {
      await connection.query(`UPDATE drivers SET ${driverFields.join(", ")} WHERE id = ?`, [...driverParams, id]);
    }
    if (data.truck_id) await linkUnassignedRoutesToDriver(data.truck_id, id, connection);
    if (data.truck_id !== undefined && data.truck_id !== drivers[0].truck_id) {
      const [[truck]] = data.truck_id
        ? await connection.query("SELECT name FROM trucks WHERE id = ?", [data.truck_id])
        : [[null]];
      await auditService.logInTransaction(connection, {
        user_id: adminUserId, action: "ASSIGN_DRIVER_TRUCK", module: "trucks",
        record_id: id, ip_address: ipAddress,
        old_value: { driver: drivers[0].full_name, truck: drivers[0].truck_name, truck_id: drivers[0].truck_id },
        new_value: { driver: data.full_name || drivers[0].full_name, truck: truck?.name || null, truck_id: data.truck_id },
      });
      delivery = await sendToMany({
        user_ids: [drivers[0].user_id], type: "SYSTEM",
        title: truck ? "Truck Assigned" : "Truck Assignment Updated",
        body: truck ? `${truck.name} is now assigned to you. Check your route before your next shift.`
          : "Your truck assignment was removed. Contact dispatch if you need assistance.",
        ref_id: id, ref_module: "drivers", metadata: { destination: "profile" }, db: connection, emit: false,
      });
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      throw { statusCode: 409, message: "Truck is already assigned to another collector" };
    }
    throw error;
  } finally {
    connection.release();
  }
  emitStoredNotifications(delivery.notifications);
  return getById(id);
};

// ─── Assign Truck ──────────────────────────────────────────

const assignTruck = (id, truck_id, adminUserId, ipAddress = null) =>
  update(id, { truck_id }, adminUserId, ipAddress);

const setAccountStatus = async (id, status, adminUserId, ipAddress = null) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT d.user_id, d.truck_id, u.status, u.full_name, t.name AS truck_name
       FROM drivers d JOIN users u ON u.id = d.user_id
       LEFT JOIN trucks t ON t.id = d.truck_id
       WHERE d.id = ? AND u.deleted_at IS NULL FOR UPDATE`,
      [id],
    );
    if (!rows.length) throw { statusCode: 404, message: "Collector not found" };
    await connection.query("UPDATE users SET status = ? WHERE id = ?", [status, rows[0].user_id]);
    if (status === "DEACTIVATED") {
      await connection.query("UPDATE drivers SET truck_id = NULL WHERE id = ?", [id]);
      await connection.query("DELETE FROM sessions WHERE user_id = ?", [rows[0].user_id]);
      if (rows[0].truck_id) {
        await auditService.logInTransaction(connection, {
          user_id: adminUserId, action: "ASSIGN_DRIVER_TRUCK", module: "trucks",
          record_id: id, ip_address: ipAddress,
          old_value: { driver: rows[0].full_name, truck: rows[0].truck_name, truck_id: rows[0].truck_id },
          new_value: { driver: rows[0].full_name, truck: null, truck_id: null },
        });
      }
    }
    await connection.commit();
    auditService.log({
      user_id: adminUserId,
      action: status === "ACTIVE" ? "REACTIVATE_DRIVER" : "DEACTIVATE_DRIVER",
      module: "drivers",
      record_id: id,
      old_value: { status: rows[0].status },
      new_value: { status },
    }).catch(() => {});
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getById(id);
};

// ─── Update Driver Status Message (self) ───────────────────

const insertDriverMessage = async ({ driver_id, sent_by, route_id, message }, db = pool) => {
  const id = generateId();
  await db.query(
    `INSERT INTO driver_messages (id, driver_id, sent_by, route_id, message, is_read)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, driver_id, sent_by, route_id ?? null, message, 0],
  );
  return id;
};
const updateStatusMsg = async (userId, status_msg, route_id) => {
  const driver = await getByUserId(userId);
  if (route_id) {
    const [runs] = await pool.query(
      "SELECT id FROM route_runs WHERE id = ? AND driver_id = ? LIMIT 1",
      [route_id, driver.id],
    );
    if (runs.length === 0) throw { statusCode: 403, message: "This route is not assigned to you" };
  }

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

const reportBreakdown = async (userId, report) => {
  const connection = await pool.getConnection();
  let delivery;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT d.id, d.truck_id, u.full_name, t.name AS truck_name, t.plate_number AS truck_plate
       FROM drivers d JOIN users u ON u.id = d.user_id
       LEFT JOIN trucks t ON t.id = d.truck_id
       WHERE d.user_id = ? AND u.deleted_at IS NULL FOR UPDATE`,
      [userId],
    );
    const driver = rows[0];
    if (!driver?.truck_id) throw { statusCode: 400, message: "No truck is assigned to you" };
    const statusMessage = `[TRUCK ISSUE${report.urgent ? " - URGENT" : ""}] ${report.category}: ${report.description}`;
    await connection.query("UPDATE drivers SET status_msg = ? WHERE id = ?", [statusMessage, driver.id]);
    await insertDriverMessage({ driver_id: driver.id, sent_by: userId, message: statusMessage }, connection);
    delivery = await notifyAdmins({
      category: "route_issues", type: "SYSTEM",
      title: `Truck breakdown: ${driver.truck_name || driver.truck_plate || "Assigned vehicle"}`,
      body: `${driver.full_name || "Collector"} reported ${report.category}${report.urgent ? " (critical road hazard)" : ""}.`,
      ref_id: driver.id, ref_module: "truck-breakdowns",
      metadata: {
        category: report.category, description: report.description, urgent: report.urgent,
        driver_name: driver.full_name, truck_name: driver.truck_name, truck_plate: driver.truck_plate,
      },
      db: connection, emit: false,
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  emitStoredNotifications(delivery.notifications);
  return { reported: true };
};

const sendAdminMessageToDriver = async (
  senderUserId,
  driverUserId,
  routeId,
  message,
) => {
  const driver = await getByUserId(driverUserId);
  const [runs] = await pool.query(
    "SELECT id FROM route_runs WHERE id = ? AND driver_id = ? LIMIT 1",
    [routeId, driver.id],
  );
  if (runs.length === 0) throw { statusCode: 400, message: "The selected route is not assigned to this collector" };

  const connection = await pool.getConnection();
  let delivery;
  let messageId;
  try {
    await connection.beginTransaction();
    messageId = await insertDriverMessage({ driver_id: driver.id, sent_by: senderUserId, route_id: routeId, message }, connection);
    delivery = await sendToMany({ user_ids: [driverUserId], type: "SYSTEM", title: "New Dispatch Message", body: message,
      ref_id: routeId, ref_module: "driver-messages", metadata: { destination: "messages", route_id: routeId, message_id: messageId },
      db: connection, emit: false });
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  emitStoredNotifications(delivery.notifications);
  return { message: "Message saved", driver_id: driver.id, message_id: messageId };
};

const getMyMessages = async (userId, routeId, limit = 100, view, messageId) => {
  require("./messenger.service").optionalId(messageId);
  const driver = await getByUserId(userId);
  const safeLimit = require("./messenger.service").messageLimit(limit);
  require("./messenger.service").optionalId(routeId);
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
     ORDER BY dm.created_at ${view === "collector" ? "DESC, dm.id DESC" : "ASC"}
     LIMIT ?`;

  const params = hasRouteFilter
    ? [driver.id, routeId, safeLimit]
    : [driver.id, safeLimit];

  const [rows] = await pool.query(sql, params);

  if (view === "collector") {
    rows.reverse();
    if (messageId && !rows.some((row) => row.id === messageId)) {
      const [target] = await pool.query(
        `SELECT dm.id, dm.driver_id, dm.route_id, dm.sent_by AS sender_user_id, dm.message, dm.is_read, dm.created_at,
         u.role AS sender_role, COALESCE(NULLIF(u.full_name, ''), u.username, 'User') AS sender_name
         FROM driver_messages dm JOIN users u ON u.id = dm.sent_by WHERE dm.driver_id = ? AND dm.id = ?`,
        [driver.id, messageId]);
      if (!target.length) throw { statusCode: 404, message: "Message is no longer available" };
      return [...target, ...rows];
    }
  }
  return rows;
};

const getMessagesForAdmin = async (driverId, routeId, limit = 100, view) => {
  await getById(driverId);
  const safeLimit = require("./messenger.service").messageLimit(limit);
  require("./messenger.service").optionalId(routeId);
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
     ORDER BY dm.created_at ${view === "web" ? "DESC, dm.id DESC" : "ASC"}
     LIMIT ?`;

  const params = hasRouteFilter
    ? [driverId, routeId, safeLimit]
    : [driverId, safeLimit];

  const [rows] = await pool.query(sql, params);
  return view === "web" ? rows.reverse() : rows;
};

const markMyMessagesAsRead = async (userId, routeId, ids) => {
  if (ids && ids.length === 0) return { read: 0 };
  const driver = await getByUserId(userId);

  const [result] = await pool.query(
    `UPDATE driver_messages
     SET is_read = TRUE
     WHERE driver_id = ?
        AND sent_by <> ?
        AND is_read = FALSE
        ${routeId ? "AND route_id = ?" : ""}
        ${ids ? "AND id IN (?)" : ""}`,
    [driver.id, userId, ...(routeId ? [routeId] : []), ...(ids ? [ids] : [])],
  );

  return { read: result.affectedRows ?? 0 };
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
  await getById(driverId);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));

  const [runRows] = await pool.query(
    `SELECT
       rr.id AS route_id,
       DATE_FORMAT(rr.run_date, '%Y-%m-%d') AS run_date,
       COALESCE(rr.route_name, CONCAT('Route ', LEFT(rr.id, 6))) AS route_name,
       rr.status, rr.scheduled_start_time, rr.collection_started_at, rr.ended_at,
       (SELECT COUNT(*) FROM route_run_stops rrs WHERE rrs.route_run_id = rr.id) AS total_stops,
       (SELECT COUNT(*) FROM route_run_stops rrs WHERE rrs.route_run_id = rr.id AND rrs.status = 'DONE') AS completed_stops
     FROM route_runs rr
     WHERE rr.driver_id = ? AND rr.status IN ('COMPLETED', 'PARTIAL')
     ORDER BY rr.run_date DESC, rr.ended_at DESC
     LIMIT ?`,
    [driverId, safeLimit],
  );
  return runRows.map((row) => ({
    route_id: row.route_id,
    date: formatHistoryDate(`${row.run_date}T12:00:00Z`),
    route: row.route_name,
    status: row.status,
    completed_stops: Number(row.completed_stops) || 0,
    total_stops: Number(row.total_stops) || 0,
    start_time: row.collection_started_at
      ? formatHistoryTime(row.collection_started_at)
      : `${formatTimeLabel(row.scheduled_start_time)} scheduled`,
    end_time: formatHistoryTime(row.ended_at),
  }));
};

const getMyHistory = async (userId, limit = 50, filters = {}) => {
  return routeRunsService.getHistoryForUser(userId, limit, filters);
};

// ─── Delete ────────────────────────────────────────────────

const remove = async (id, adminUserId, ipAddress = null) => {
  const driver = await getById(id);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Release truck assignment first so this truck can be reassigned later.
    await connection.query("UPDATE drivers SET truck_id = NULL WHERE id = ?", [id]);
    if (driver.truck_id) {
      await auditService.logInTransaction(connection, {
        user_id: adminUserId, action: "ASSIGN_DRIVER_TRUCK", module: "trucks",
        record_id: id, ip_address: ipAddress,
        old_value: { driver: driver.full_name, truck: driver.truck_name, truck_id: driver.truck_id },
        new_value: { driver: driver.full_name, truck: null, truck_id: null },
      });
    }

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
  resetPassword,
  create,
  update,
  assignTruck,
  setAccountStatus,
  updateStatusMsg,
  reportBreakdown,
  sendAdminMessageToDriver,
  getMyMessages,
  getMessagesForAdmin,
  markMyMessagesAsRead,
  getActivityLog,
  getMyHistory,
  remove,
};


