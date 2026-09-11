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
  metadata = null,
}) => {
  const id = generateId();

  await pool.query(
    `INSERT INTO notifications
       (id, user_id, type, title, body, ref_id, ref_module, metadata, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
    [id, user_id, type, title, body, ref_id, ref_module, metadata ? JSON.stringify(metadata) : null],
  );

  const payload = {
    id,
    user_id,
    type,
    title,
    body,
    ref_id,
    ref_module,
    metadata,
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
  metadata = null,
}) => {
  if (!user_ids || user_ids.length === 0) return { sent: 0, ids: [] };

  // Filter unique valid user IDs
  const uniqueUserIds = [...new Set(user_ids.filter(Boolean))];
  if (uniqueUserIds.length === 0) return { sent: 0, ids: [] };

  const ids = [];
  const rows = [];
  const now = new Date();
  // The database stores timestamps as UTC. mysql serializes Date instances in
  // the machine's local timezone, so send an explicit UTC SQL datetime value.
  const utcNow = now.toISOString().slice(0, 19).replace("T", " ");

  for (const uid of uniqueUserIds) {
    const id = generateId();
    ids.push(id);
    rows.push([id, uid, type, title, body, ref_id, ref_module, metadata ? JSON.stringify(metadata) : null, 0, utcNow]);
  }

  // Efficient batch insert in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await pool.query(
      `INSERT INTO notifications
          (id, user_id, type, title, body, ref_id, ref_module, metadata, is_read, created_at)
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
      metadata,
      is_read: 0,
      created_at: now.toISOString(),
    });
  }

  return { sent: ids.length, ids };
};

// ─── Notify All Active Residents ───────────────────────────

const notifyAllResidents = async ({ type, title, body, ref_id, ref_module, metadata = null }) => {
  const preferenceColumn = type === "ANNOUNCEMENT" ? "notif_announcements" : type === "NEW_POST" ? "notif_new_content" : type === "COLLECTION_REMINDER" ? "notif_collection_reminders" : type === "TRUCK_IS_NEAR" ? "notif_truck_near" : type === "COLLECTION_DONE" ? "notif_collection_done" : type === "MISSED_COLLECTION" ? "notif_collection_skipped" : null;
  const preferenceFilter = preferenceColumn ? ` AND COALESCE(s.${preferenceColumn}, TRUE) = TRUE` : "";
  const [residents] = await pool.query(
    `SELECT u.id FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.role = 'RESIDENT' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL${preferenceFilter}`,
  );
  const userIds = residents.map((r) => r.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module, metadata });
};

// ─── Notify Barangay Residents ─────────────────────────────

const notifyBarangayResidents = async ({
  barangay_id,
  type,
  title,
  body,
  ref_id,
  ref_module,
  metadata = null,
}) => {
  const preferenceColumn = type === "ANNOUNCEMENT" ? "notif_announcements" : type === "NEW_POST" ? "notif_new_content" : type === "COLLECTION_REMINDER" ? "notif_collection_reminders" : type === "TRUCK_IS_NEAR" ? "notif_truck_near" : type === "COLLECTION_DONE" ? "notif_collection_done" : type === "MISSED_COLLECTION" ? "notif_collection_skipped" : null;
  const preferenceFilter = preferenceColumn ? ` AND COALESCE(s.${preferenceColumn}, TRUE) = TRUE` : "";
  const [residents] = await pool.query(
    `SELECT u.id FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.barangay_id = ? AND u.role = 'RESIDENT' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL${preferenceFilter}`,
    [barangay_id],
  );
  const userIds = residents.map((r) => r.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module, metadata });
};

// ─── Notify All Admins ─────────────────────────────────────

const notifyAdmins = async ({ type, title, body, ref_id, ref_module }) => {
  const [admins] = await pool.query(
    "SELECT id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' AND deleted_at IS NULL",
  );
  const userIds = admins.map((a) => a.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module });
};

// Keep notification history in the database, but do not show an announcement
// notification after its linked announcement has expired or been archived.
const excludeExpiredAnnouncementNotifications = `
  AND NOT (
    n.ref_module = 'announcements'
    AND EXISTS (
      SELECT 1
      FROM announcements a
      WHERE a.id = n.ref_id
        AND (
          a.status = 'ARCHIVED'
          OR (a.expires_at IS NOT NULL AND a.expires_at <= NOW())
        )
    )
  )
`;

// ─── Get My Notifications (Paginated) ──────────────────────

const getMyNotifications = async (userId, filters = {}) => {
  let query = `
    SELECT n.* FROM notifications n
    WHERE n.user_id = ?
    ${excludeExpiredAnnouncementNotifications}
  `;
  const params = [userId];

  if (filters.type) {
    query += " AND n.type = ?";
    params.push(filters.type);
  }

  if (filters.is_read !== undefined && filters.is_read !== "all") {
    query += " AND n.is_read = ?";
    params.push(filters.is_read === "true" || filters.is_read === "1" ? 1 : 0);
  }

  query += " ORDER BY created_at DESC";

  const limit = parseInt(filters.limit, 10) || 20;
  const offset = parseInt(filters.offset, 10) || 0;
  query += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM notifications n
     WHERE n.user_id = ?
     ${excludeExpiredAnnouncementNotifications}`,
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
    `SELECT COUNT(*) AS count
     FROM notifications n
     WHERE n.user_id = ?
       AND n.is_read = FALSE
     ${excludeExpiredAnnouncementNotifications}`,
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
