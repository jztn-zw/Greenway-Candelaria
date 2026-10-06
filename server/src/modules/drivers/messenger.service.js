const { createHash } = require("node:crypto");
const { pool } = require("../../config/db");
const { notifyAdmins, sendToMany, emitStoredNotifications } = require("../notifications/notifications.service");

const fail = (message, statusCode = 400) => { throw { statusCode, message }; };
const optionalId = (value) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value || value.length > 64) fail("Invalid message reference");
  return value;
};
const messageLimit = (value = 50) => {
  if (typeof value !== "string" && typeof value !== "number") fail("Invalid message limit");
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 300) fail("Message limit must be an integer from 1 to 300");
  return limit;
};
const readCursor = (value) => {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length > 256) fail("Invalid message cursor");
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString());
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(parsed.time) || typeof parsed.id !== "string" || !parsed.id || parsed.id.length > 64) fail("Invalid message cursor");
    return parsed;
  } catch { fail("Invalid message cursor"); }
};
const projection = `dm.id, dm.route_id, dm.message, dm.is_read, dm.created_at,
  u.id AS sender_id, u.avatar_url AS sender_avatar_url,
  u.role AS sender_role, COALESCE(NULLIF(u.full_name, ''), 'MENRO Admin') AS sender_name`;
const normalize = (row) => ({ ...row, is_read: Boolean(row.is_read) });

// Web messenger is scoped to a collector, rather than the currently active route.
const getConversation = async (driverId, query = {}, viewerRole = "DRIVER") => {
  const limit = messageLimit(query.limit);
  const cursor = readCursor(query.cursor);
  const targetId = optionalId(query.message_id);
  const params = [driverId];
  if (cursor) params.push(cursor.time, cursor.time, cursor.id);
  params.push(limit + 1);
  const [rows] = await pool.query(`SELECT ${projection} FROM driver_messages dm
    JOIN users u ON u.id = dm.sent_by WHERE dm.driver_id = ?
    ${cursor ? "AND (dm.created_at < ? OR (dm.created_at = ? AND dm.id < ?))" : ""}
    ORDER BY dm.created_at DESC, dm.id DESC LIMIT ?`, params);
  const hasMore = rows.length > limit;
  const window = rows.slice(0, limit);
  const last = window[window.length - 1];
  const [[counts]] = await pool.query(`SELECT COUNT(*) AS unread_count FROM driver_messages dm
    JOIN users u ON u.id = dm.sent_by WHERE dm.driver_id = ? AND u.role ${viewerRole === "ADMIN" ? "=" : "<>"} 'DRIVER' AND dm.is_read = FALSE`, [driverId]);
  let target = null;
  if (targetId) {
    target = window.find((row) => row.id === targetId);
    if (!target) {
      const [selected] = await pool.query(`SELECT ${projection} FROM driver_messages dm
        JOIN users u ON u.id = dm.sent_by WHERE dm.driver_id = ? AND dm.id = ?`, [driverId, targetId]);
      if (!selected.length) fail("Message is no longer available", 404);
      target = selected[0];
    }
  }
  return { items: window.reverse().map(normalize), target: target ? normalize(target) : null,
    unreadCount: Number(counts.unread_count),
    nextCursor: hasMore ? Buffer.from(JSON.stringify({ time: last.created_at, id: last.id })).toString("base64url") : null };
};

const findDriver = async (userId, driverId) => {
  const [rows] = await pool.query(`SELECT d.id, d.user_id FROM drivers d JOIN users u ON u.id = d.user_id
    WHERE ${driverId ? "d.id" : "d.user_id"} = ? AND u.deleted_at IS NULL AND u.status = 'ACTIVE'`, [driverId || userId]);
  if (!rows.length) fail("Collector not found", 404);
  return rows[0];
};

const sendMessage = async (sender, driver, input) => {
  if (typeof input.message !== "string" || !input.message.trim() || input.message.trim().length > 1000) fail("Message must contain 1 to 1000 characters");
  if (typeof input.request_id !== "string" || !/^[a-f0-9-]{36}$/i.test(input.request_id)) fail("Invalid message request ID");
  const routeId = optionalId(input.route_id);
  const message = input.message.trim();
  // The same sender/request pair always produces the same saved message ID.
  const hash = createHash("sha256").update(`${sender.id}:${input.request_id}`).digest("hex");
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  const connection = await pool.getConnection();
  let delivery = { notifications: [] };
  let saved;
  try {
    await connection.beginTransaction();
    // Serialize writes per conversation, including concurrent retries.
    const [locked] = await connection.query("SELECT id FROM drivers WHERE id = ? FOR UPDATE", [driver.id]);
    if (!locked.length) fail("Collector not found", 404);
    const [existing] = await connection.query("SELECT id, driver_id, message, route_id FROM driver_messages WHERE id = ?", [id]);
    if (existing.length) {
      if (existing[0].driver_id !== driver.id || existing[0].message !== message || (existing[0].route_id ?? null) !== (routeId ?? null)) fail("This request ID was already used for another message", 409);
    } else {
      if (routeId) {
        const [runs] = await connection.query("SELECT id FROM route_runs WHERE id = ? AND driver_id = ?", [routeId, driver.id]);
        if (!runs.length) fail("The selected route is not assigned to this collector");
      }
      await connection.query("INSERT INTO driver_messages (id, driver_id, sent_by, route_id, message, is_read) VALUES (?, ?, ?, ?, ?, FALSE)", [id, driver.id, sender.id, routeId ?? null, message]);
      const metadata = { destination: "messages", driver_id: driver.id, message_id: id, route_id: routeId ?? null };
      delivery = sender.role === "DRIVER"
        ? await notifyAdmins({ category: "driver_messages", type: "SYSTEM", title: `New Collector Message: ${sender.full_name || "Collector"}`, body: message,
          ref_id: driver.id, ref_module: "driver-messages", metadata, db: connection, emit: false })
        : await sendToMany({ user_ids: [driver.user_id], type: "SYSTEM", title: "New Dispatch Message", body: message,
          ref_id: routeId ?? driver.id, ref_module: "driver-messages", metadata, db: connection, emit: false });
    }
    const [rows] = await connection.query(`SELECT ${projection} FROM driver_messages dm JOIN users u ON u.id = dm.sent_by WHERE dm.id = ?`, [id]);
    saved = normalize(rows[0]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  emitStoredNotifications(delivery.notifications);
  return saved;
};

// The schema permits one non-deleted admin account. Incoming messages use the
// existing read flag independently of optional notification alerts.
const getAdminUnread = async () => {
  const [rows] = await pool.query(`SELECT dm.driver_id, COUNT(*) AS unread_count
    FROM driver_messages dm JOIN users u ON u.id = dm.sent_by
    JOIN drivers d ON d.id = dm.driver_id JOIN users collector ON collector.id = d.user_id
    WHERE u.role = 'DRIVER' AND dm.is_read = FALSE
      AND collector.status = 'ACTIVE' AND collector.deleted_at IS NULL
    GROUP BY dm.driver_id`);
  const byDriver = rows.map((row) => ({ driverId: row.driver_id, unreadCount: Number(row.unread_count) }));
  return { unreadCount: byDriver.reduce((total, driver) => total + driver.unreadCount, 0), byDriver };
};
const markAdminRead = async (driverId, adminId, ids) => {
  if (!Array.isArray(ids) || !ids.length || ids.length > 301 || ids.some((id) => typeof id !== "string" || !id || id.length > 64)) fail("Invalid message IDs");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE driver_messages SET is_read = TRUE
      WHERE driver_id = ? AND id IN (?) AND is_read = FALSE
        AND sent_by IN (SELECT id FROM users WHERE role = 'DRIVER')`, [driverId, ids]);
    await conn.query(`UPDATE notifications SET is_read = TRUE
      WHERE user_id = ? AND ref_module = 'driver-messages'
        AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.message_id')) IN (
          SELECT id FROM driver_messages WHERE driver_id = ? AND id IN (?)
            AND sent_by IN (SELECT id FROM users WHERE role = 'DRIVER')
        )`, [adminId, driverId, ids]);
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
  return { read: true };
};
module.exports = { getConversation, findDriver, sendMessage, messageLimit, optionalId, getAdminUnread, markAdminRead };
