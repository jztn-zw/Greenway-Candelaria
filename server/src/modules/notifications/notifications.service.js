const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const {
  emitNotificationToUser,
  emitNotificationToBarangay,
  emitNotificationToAdmins,
} = require("../../sockets/notifications.socket");

// ─── Single User Notification ──────────────────────────────

const sendToUser = async ({
  user_id,
  type,
  title,
  body,
  ref_id = null,
  ref_module = null,
}) => {
  const id = generateId();

  await pool.query(
    `INSERT INTO notifications
       (id, user_id, type, title, body, ref_id, ref_module, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
    [id, user_id, type, title, body, ref_id, ref_module],
  );

  const payload = {
    id,
    user_id,
    type,
    title,
    body,
    ref_id,
    ref_module,
    is_read: 0,
    created_at: new Date().toISOString(),
  };

  emitNotificationToUser(user_id, payload);

  return id;
};

// ─── Batch Notification (Multiple Users) ───────────────────

const sendToMany = async ({
  user_ids,
  type,
  title,
  body,
  ref_id = null,
  ref_module = null,
}) => {
  if (!user_ids || user_ids.length === 0) return { sent: 0, ids: [] };

  // Filter unique valid user IDs
  const uniqueUserIds = [...new Set(user_ids.filter(Boolean))];
  if (uniqueUserIds.length === 0) return { sent: 0, ids: [] };

  const ids = [];
  const rows = [];
  const now = new Date();

  for (const uid of uniqueUserIds) {
    const id = generateId();
    ids.push(id);
    rows.push([id, uid, type, title, body, ref_id, ref_module, 0, now]);
  }

  // Efficient batch insert in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await pool.query(
      `INSERT INTO notifications
         (id, user_id, type, title, body, ref_id, ref_module, is_read, created_at)
       VALUES ?`,
      [chunk],
    );
  }

  // Emit socket events to each user
  for (let i = 0; i < uniqueUserIds.length; i++) {
    const uid = uniqueUserIds[i];
    const notifId = ids[i];
    emitNotificationToUser(uid, {
      id: notifId,
      user_id: uid,
      type,
      title,
      body,
      ref_id,
      ref_module,
      is_read: 0,
      created_at: now.toISOString(),
    });
  }

  return { sent: ids.length, ids };
};

// ─── Notify All Active Residents ───────────────────────────

const notifyAllResidents = async ({ type, title, body, ref_id, ref_module }) => {
  const [residents] = await pool.query(
    "SELECT id FROM users WHERE role = 'RESIDENT' AND status = 'ACTIVE' AND deleted_at IS NULL",
  );
  const userIds = residents.map((r) => r.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module });
};

// ─── Notify Barangay Residents ─────────────────────────────

const notifyBarangayResidents = async ({
  barangay_id,
  type,
  title,
  body,
  ref_id,
  ref_module,
}) => {
  const [residents] = await pool.query(
    "SELECT id FROM users WHERE barangay_id = ? AND role = 'RESIDENT' AND status = 'ACTIVE' AND deleted_at IS NULL",
    [barangay_id],
  );
  const userIds = residents.map((r) => r.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module });
};

// ─── Notify All Admins ─────────────────────────────────────

const notifyAdmins = async ({ type, title, body, ref_id, ref_module }) => {
  const [admins] = await pool.query(
    "SELECT id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' AND deleted_at IS NULL",
  );
  const userIds = admins.map((a) => a.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module });
};

// ─── Get My Notifications (Paginated) ──────────────────────

const getMyNotifications = async (userId, filters = {}) => {
  let query = `
    SELECT * FROM notifications
    WHERE user_id = ?
  `;
  const params = [userId];

  if (filters.type) {
    query += " AND type = ?";
    params.push(filters.type);
  }

  if (filters.is_read !== undefined && filters.is_read !== "all") {
    query += " AND is_read = ?";
    params.push(filters.is_read === "true" || filters.is_read === "1" ? 1 : 0);
  }

  query += " ORDER BY created_at DESC";

  const limit = parseInt(filters.limit, 10) || 20;
  const offset = parseInt(filters.offset, 10) || 0;
  query += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);

  const [countResult] = await pool.query(
    "SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?",
    [userId],
  );

  return {
    notifications: rows,
    total: countResult[0].total,
    limit,
    offset,
  };
};

// ─── Get Unread Count ──────────────────────────────────────

const getUnreadCount = async (userId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE",
    [userId],
  );

  return { unread: rows[0].count };
};

// ─── Mark One as Read ──────────────────────────────────────

const markAsRead = async (id, userId) => {
  const [rows] = await pool.query(
    "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
    [id, userId],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Notification not found" };
  }

  await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = ?", [
    id,
  ]);

  return { read: true };
};

// ─── Mark All as Read ──────────────────────────────────────

const markAllAsRead = async (userId) => {
  await pool.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
    [userId],
  );

  return { read: true };
};

// ─── Delete One ────────────────────────────────────────────

const deleteOne = async (id, userId) => {
  const [rows] = await pool.query(
    "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
    [id, userId],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Notification not found" };
  }

  await pool.query("DELETE FROM notifications WHERE id = ?", [id]);

  return { message: "Notification deleted" };
};

// ─── Clear All ─────────────────────────────────────────────

const clearAll = async (userId) => {
  await pool.query("DELETE FROM notifications WHERE user_id = ?", [userId]);

  return { message: "All notifications cleared" };
};

module.exports = {
  sendToUser,
  sendToMany,
  notifyAllResidents,
  notifyBarangayResidents,
  notifyAdmins,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOne,
  clearAll,
};
