const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");

// ─── Internal helper — used by other modules too ───────────

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
       (id, user_id, type, title, body, ref_id, ref_module)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, user_id, type, title, body, ref_id, ref_module],
  );

  return id;
};

// ─── Send to multiple users (admin manual send) ────────────

const sendToMany = async ({
  user_ids,
  type,
  title,
  body,
  ref_id,
  ref_module,
}) => {
  const ids = [];

  for (const user_id of user_ids) {
    // Validate user exists
    const [userCheck] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL",
      [user_id],
    );

    if (userCheck.length === 0) continue;

    const id = await sendToUser({
      user_id,
      type,
      title,
      body,
      ref_id,
      ref_module,
    });
    ids.push(id);
  }

  return { sent: ids.length, ids };
};

// ─── Get my notifications ──────────────────────────────────

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

  if (filters.is_read !== undefined) {
    query += " AND is_read = ?";
    params.push(filters.is_read === "true" ? 1 : 0);
  }

  query += " ORDER BY created_at DESC";

  // Pagination
  const limit = parseInt(filters.limit) || 20;
  const offset = parseInt(filters.offset) || 0;
  query += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);

  return rows;
};

// ─── Get unread count ──────────────────────────────────────

const getUnreadCount = async (userId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE",
    [userId],
  );

  return { unread: rows[0].count };
};

// ─── Mark one as read ──────────────────────────────────────

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

// ─── Mark all as read ─────────────────────────────────────

const markAllAsRead = async (userId) => {
  await pool.query(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
    [userId],
  );

  return { read: true };
};

// ─── Delete one ────────────────────────────────────────────

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

// ─── Clear all ─────────────────────────────────────────────

const clearAll = async (userId) => {
  await pool.query("DELETE FROM notifications WHERE user_id = ?", [userId]);

  return { message: "All notifications cleared" };
};

module.exports = {
  sendToUser,
  sendToMany,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOne,
  clearAll,
};
