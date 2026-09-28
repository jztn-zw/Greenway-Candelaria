const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const {
  emitNotificationToUser,
  emitNotificationToBarangay,
  emitNotificationToAdmins,
} = require("../../sockets/notifications.socket");

const NOTIFICATION_TYPES = new Set([
  "COLLECTION_REMINDER",
  "TRUCK_IS_NEAR",
  "COLLECTION_DONE",
  "REPORT_UPDATE",
  "NEW_POST",
  "ANNOUNCEMENT",
  "MISSED_COLLECTION",
  "SYSTEM",
]);

const getPreferenceColumn = (type) => {
  const preferenceColumns = {
    ANNOUNCEMENT: "notif_announcements",
    NEW_POST: "notif_new_content",
    COLLECTION_REMINDER: "notif_collection_reminders",
    TRUCK_IS_NEAR: "notif_truck_near",
    COLLECTION_DONE: "notif_collection_done",
    MISSED_COLLECTION: "notif_collection_skipped",
    REPORT_UPDATE: "notif_report_updates",
  };

  return preferenceColumns[type] || null;
};

const isNotificationEnabledForUser = async (userId, type, db = pool) => {
  const preferenceColumn = getPreferenceColumn(type);
  if (!preferenceColumn) return true;

  const [rows] = await db.query(
    `SELECT
       u.role,
       COALESCE(s.${preferenceColumn}, TRUE) AS enabled,
       COALESCE(s.reminder_on, TRUE) AS reminder_on
       FROM users u
       LEFT JOIN user_settings s ON s.user_id = u.id
      WHERE u.id = ?`,
    [userId],
  );

  // Notification preferences apply to the resident web portal only. Accounts
  // without a settings record preserve the existing default-enabled behavior.
  return rows.length === 0 || rows[0].role !== "RESIDENT" || (
    Boolean(rows[0].enabled) &&
    (type !== "COLLECTION_REMINDER" || Boolean(rows[0].reminder_on))
  );
};

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
  if (!(await isNotificationEnabledForUser(user_id, type))) return null;

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
  db = pool,
  emit = true,
}) => {
  if (!user_ids || user_ids.length === 0) return { sent: 0, ids: [], notifications: [] };

  // Filter unique valid user IDs
  const uniqueUserIds = [...new Set(user_ids.filter(Boolean))];
  if (uniqueUserIds.length === 0) return { sent: 0, ids: [], notifications: [] };

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
    await db.query(
      `INSERT INTO notifications
          (id, user_id, type, title, body, ref_id, ref_module, metadata, is_read, created_at)
       VALUES ?`,
      [chunk],
    );
  }

  const notifications = uniqueUserIds.map((uid, index) => ({
      id: ids[index],
      user_id: uid,
      type,
      title,
      body,
      ref_id,
      ref_module,
      metadata,
      is_read: 0,
      created_at: now.toISOString(),
  }));

  if (emit) emitStoredNotifications(notifications);

  return { sent: ids.length, ids, notifications };
};

const emitStoredNotifications = (notifications = []) => {
  notifications.forEach((notification) => {
    emitNotificationToUser(notification.user_id, notification);
  });
};

// ─── Notify All Active Residents ───────────────────────────

const notifyAllResidents = async ({
  type,
  title,
  body,
  ref_id,
  ref_module,
  metadata = null,
  db = pool,
  emit = true,
}) => {
  const preferenceColumn = getPreferenceColumn(type);
  const preferenceFilter = preferenceColumn
    ? ` AND COALESCE(s.${preferenceColumn}, TRUE) = TRUE${type === "COLLECTION_REMINDER" ? " AND COALESCE(s.reminder_on, TRUE) = TRUE" : ""}`
    : "";
  const [residents] = await db.query(
    `SELECT u.id FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.role = 'RESIDENT' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL${preferenceFilter}`,
  );
  const userIds = residents.map((r) => r.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module, metadata, db, emit });
};

// ─── Notify Barangay Residents ─────────────────────────────

const notifyBarangayResidents = async ({
  barangay_id,
  street_id = null,
  type,
  title,
  body,
  ref_id,
  ref_module,
  metadata = null,
  db = pool,
  emit = true,
}) => {
  const preferenceColumn = getPreferenceColumn(type);
  const preferenceFilter = preferenceColumn ? ` AND COALESCE(s.${preferenceColumn}, TRUE) = TRUE${type === "COLLECTION_REMINDER" ? " AND COALESCE(s.reminder_on, TRUE) = TRUE" : ""}` : "";
  const streetFilter = street_id ? " AND u.street_id = ?" : "";
  const params = street_id ? [barangay_id, street_id] : [barangay_id];
  const [residents] = await db.query(
    `SELECT u.id FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.barangay_id = ?${streetFilter} AND u.role = 'RESIDENT' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL${preferenceFilter}`,
    params,
  );
  const userIds = residents.map((r) => r.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module, metadata, db, emit });
};

const filterNotificationEnabledUserIds = async (userIds, type, db = pool) => {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueUserIds.length === 0) return [];
  const preferenceColumn = getPreferenceColumn(type);
  if (!preferenceColumn) return uniqueUserIds;

  const [rows] = await db.query(
    `SELECT u.id
     FROM users u
     LEFT JOIN user_settings s ON s.user_id = u.id
     WHERE u.id IN (?)
       AND u.status = 'ACTIVE'
       AND u.deleted_at IS NULL
       AND (u.role <> 'RESIDENT' OR COALESCE(s.${preferenceColumn}, TRUE) = TRUE)`,
    [uniqueUserIds],
  );
  return rows.map((row) => row.id);
};

// ─── Notify All Admins ─────────────────────────────────────

const adminPreferenceByCategory = {
  reports: "notif_admin_reports",
  route_issues: "notif_admin_route_issues",
  driver_messages: "notif_admin_driver_messages",
};

const notifyAdmins = async ({ type, title, body, ref_id, ref_module, category, metadata = null, db = pool, emit = true }) => {
  const preferenceColumn = adminPreferenceByCategory[category];
  const [admins] = await db.query(
    `SELECT u.id FROM users u
     LEFT JOIN user_settings s ON s.user_id = u.id
     WHERE u.role = 'ADMIN' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
       ${preferenceColumn ? `AND COALESCE(s.${preferenceColumn}, 1) = 1` : ""}`,
  );
  const userIds = admins.map((a) => a.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module, metadata, db, emit });
};

// Keep notification history in the database, but only expose it while its
// linked announcement is currently available to the requesting resident.
const excludeExpiredAnnouncementNotifications = `
  AND NOT (
    n.ref_module = 'announcements'
    AND EXISTS (
      SELECT 1
      FROM announcements a
      WHERE a.id = n.ref_id
        AND (
          a.status <> 'ACTIVE'
          OR (a.expires_at IS NOT NULL AND a.expires_at <= NOW())
          OR NOT (
            a.target_all = TRUE
            OR EXISTS (
              SELECT 1
              FROM announcement_barangays ab
              JOIN users notification_user ON notification_user.id = n.user_id
              WHERE ab.announcement_id = a.id
                AND ab.barangay_id = notification_user.barangay_id
            )
          )
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
  const countParams = [userId];
  let filterQuery = "";

  if (filters.type) {
    const type = String(filters.type).toUpperCase();
    if (!NOTIFICATION_TYPES.has(type)) {
      throw { statusCode: 400, message: "Invalid notification type filter" };
    }
    filterQuery += " AND n.type = ?";
    params.push(type);
    countParams.push(type);
  }

  if (filters.is_read !== undefined && filters.is_read !== "all") {
    const isRead = filters.is_read === "true" || filters.is_read === "1" ? 1 : 0;
    filterQuery += " AND n.is_read = ?";
    params.push(isRead);
    countParams.push(isRead);
  }

  if (filters.category && filters.category !== "all") {
    const categories = {
      routes: " AND n.ref_module IN ('routes', 'tracking')",
      announcements: " AND (COALESCE(n.ref_module, '') NOT IN ('routes', 'tracking')) AND (n.ref_module = 'announcements' OR n.type = 'ANNOUNCEMENT')",
      dispatch: " AND COALESCE(n.ref_module, '') NOT IN ('routes', 'tracking', 'announcements') AND n.type <> 'ANNOUNCEMENT'",
    };
    if (!categories[filters.category]) throw { statusCode: 400, message: "Invalid notification category" };
    filterQuery += categories[filters.category];
  }
  query += filterQuery;
  if (filters.cursor) {
    let cursor;
    try { cursor = JSON.parse(Buffer.from(String(filters.cursor), "base64url").toString()); } catch { /* validated below */ }
    if (!cursor || typeof cursor.id !== "string" || !cursor.id || typeof cursor.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(cursor.date)) {
      throw { statusCode: 400, message: "Invalid notification cursor" };
    }
    query += " AND (n.created_at < ? OR (n.created_at = ? AND n.id < ?))";
    params.push(cursor.date, cursor.date, cursor.id);
  }
  query += " ORDER BY n.created_at DESC, n.id DESC";

  const requestedLimit = Number.parseInt(filters.limit, 10);
  const requestedOffset = Number.parseInt(filters.offset, 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(100, Math.max(1, requestedLimit))
    : 20;
  const offset = Number.isFinite(requestedOffset)
    ? Math.max(0, requestedOffset)
    : 0;
  query += " LIMIT ? OFFSET ?";
  params.push(filters.category !== undefined ? limit + 1 : limit, offset);

  const [rows] = await pool.query(query, params);

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM notifications n
     WHERE n.user_id = ?
     ${excludeExpiredAnnouncementNotifications}
     ${filterQuery}`,
    countParams,
  );

  const paged = filters.category !== undefined;
  const notifications = paged ? rows.slice(0, limit) : rows;
  const last = notifications.at(-1);
  const date = last?.created_at instanceof Date
    ? last.created_at.toISOString().replace("T", " ").replace("Z", "") : String(last?.created_at ?? "");
  return {
    notifications,
    ...(paged ? { next_cursor: rows.length > limit && last
      ? Buffer.from(JSON.stringify({ date, id: last.id })).toString("base64url") : null } : {}),
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
  emitStoredNotifications,
  filterNotificationEnabledUserIds,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOne,
  clearAll,
};
