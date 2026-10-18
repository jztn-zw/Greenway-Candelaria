const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const { sendCollectorPushAlert } = require('./push.service');
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
  // Resident preferences control phone push only; keep the durable inbox intact.
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
  void sendCollectorPushAlert(payload);

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
    void sendCollectorPushAlert(notification);
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
  const [residents] = await db.query(
    "SELECT u.id FROM users u WHERE u.role = 'RESIDENT' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL",
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
  const streetFilter = street_id ? " AND u.street_id = ?" : "";
  const params = street_id ? [barangay_id, street_id] : [barangay_id];
  const [residents] = await db.query(
    `SELECT u.id FROM users u WHERE u.barangay_id = ?${streetFilter} AND u.role = 'RESIDENT' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL`,
    params,
  );
  const userIds = residents.map((r) => r.id);
  return sendToMany({ user_ids: userIds, type, title, body, ref_id, ref_module, metadata, db, emit });
};

const filterActiveNotificationUserIds = async (userIds, db = pool) => {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueUserIds.length === 0) return [];

  const [rows] = await db.query(
    `SELECT u.id
     FROM users u
     WHERE u.id IN (?)
       AND u.status = 'ACTIVE'
       AND u.deleted_at IS NULL`,
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

const excludeUnavailablePostNotifications = `
  AND NOT (
    (n.type = 'NEW_POST' OR n.ref_module = 'posts')
    AND NOT EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = n.ref_id AND p.deleted_at IS NULL AND p.status = 'PUBLISHED'
        AND (p.published_at IS NULL OR n.created_at >= p.published_at)
    )
  )
`;

// ─── Get My Notifications (Paginated) ──────────────────────

const getMyNotifications = async (userId, filters = {}) => {
  const webHistory = filters.web_category !== undefined;
  const hideAdminCollectorMessages = webHistory ? `
    AND NOT (n.title LIKE 'New Collector Message:%'
      AND EXISTS (SELECT 1 FROM users notification_owner
        WHERE notification_owner.id = n.user_id AND notification_owner.role = 'ADMIN'))
  ` : "";
  let query = `
    SELECT n.* FROM notifications n
    WHERE n.user_id = ?
    ${excludeExpiredAnnouncementNotifications}
    ${excludeUnavailablePostNotifications}
    ${hideAdminCollectorMessages}
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
  if (webHistory && filters.web_category !== "all") {
    const adminCategory = `CASE
      WHEN n.ref_module = 'reports' OR n.type = 'REPORT_UPDATE' THEN 'reports'
      WHEN n.ref_module = 'announcements' OR n.type = 'ANNOUNCEMENT' THEN 'announcements'
      WHEN n.ref_module = 'posts' OR n.type = 'NEW_POST' THEN 'content'
      WHEN n.ref_module IN ('tracking','routes','drivers','trucks','truck-breakdowns','schedule','driver-messages')
        OR n.type IN ('COLLECTION_REMINDER','TRUCK_IS_NEAR','COLLECTION_DONE','MISSED_COLLECTION') THEN 'operations'
      ELSE 'all' END`;
    const categories = {
      "admin:reports": `(${adminCategory}) = 'reports'`,
      "admin:announcements": `(${adminCategory}) = 'announcements'`,
      "admin:content": `(${adminCategory}) = 'content'`,
      "admin:operations": `(${adminCategory}) = 'operations'`,
      "resident:collection": "n.type IN ('COLLECTION_REMINDER','TRUCK_IS_NEAR','COLLECTION_DONE','MISSED_COLLECTION')",
      "resident:reports": "n.type = 'REPORT_UPDATE'",
      "resident:content": "n.type = 'NEW_POST'",
      "resident:announcements": "n.type = 'ANNOUNCEMENT'",
    };
    if (!Object.hasOwn(categories, filters.web_category)) throw { statusCode: 400, message: "Invalid notification category" };
    filterQuery += ` AND ${categories[filters.web_category]}`;
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
  let offset = Number.isFinite(requestedOffset)
    ? Math.max(0, requestedOffset)
    : 0;
  query += " LIMIT ? OFFSET ?";
  params.push(filters.category !== undefined ? limit + 1 : limit, offset);

  const countSql = `SELECT COUNT(*) AS total, UTC_TIMESTAMP(3) AS server_time
     FROM notifications n
     WHERE n.user_id = ?
     ${excludeExpiredAnnouncementNotifications}
     ${excludeUnavailablePostNotifications}
     ${hideAdminCollectorMessages}
     ${filterQuery}`;
  let countResult;
  if (webHistory) {
    [countResult] = await pool.query(countSql, countParams);
    const total = Number(countResult[0].total);
    if (offset >= total) offset = Math.max(0, (Math.ceil(total / limit) - 1) * limit);
    params[params.length - 1] = offset;
  }
  const [rows] = await pool.query(query, params);
  if (!countResult) [countResult] = await pool.query(countSql, countParams);
  let summary;
  if (webHistory) {
    const [counts] = await pool.query(`SELECT COUNT(*) AS history_total,
      COALESCE(SUM(n.is_read = FALSE), 0) AS unread_count,
      COALESCE(SUM(n.is_read = FALSE AND (n.type = 'NEW_POST' OR n.ref_module = 'posts')), 0) AS unread_content_count,
      COALESCE(SUM(n.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND n.created_at <= NOW()), 0) AS recent_count
      FROM notifications n WHERE n.user_id = ? ${excludeExpiredAnnouncementNotifications} ${excludeUnavailablePostNotifications} ${hideAdminCollectorMessages}`, [userId]);
    summary = { history_total: Number(counts[0].history_total), unread_count: Number(counts[0].unread_count), unread_content_count: Number(counts[0].unread_content_count), recent_count: Number(counts[0].recent_count) };
  }

  const paged = filters.category !== undefined;
  const notifications = paged ? rows.slice(0, limit) : rows;
  const last = notifications.at(-1);
  const date = last?.created_at instanceof Date
    ? last.created_at.toISOString().replace("T", " ").replace("Z", "") : String(last?.created_at ?? "");
  return {
    notifications,
    server_time: countResult[0].server_time,
    ...summary,
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
     ${excludeExpiredAnnouncementNotifications}
     ${excludeUnavailablePostNotifications}`,
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

const markAllAsRead = async (userId, category, postId) => {
  if (category !== undefined && category !== "content") throw { statusCode: 400, message: "Invalid notification category" };
  if (postId !== undefined && (category !== "content" || typeof postId !== "string" || !postId.trim())) {
    throw { statusCode: 400, message: "Invalid post notification scope" };
  }
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE${category === "content" ? " AND (type = 'NEW_POST' OR ref_module = 'posts')" : ""}${postId !== undefined ? " AND ref_id = ?" : ""}`,
    postId !== undefined ? [userId, postId] : [userId],
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
  filterActiveNotificationUserIds,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOne,
  clearAll,
};
