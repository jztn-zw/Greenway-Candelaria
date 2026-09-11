const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const {
  notifyAllResidents,
  notifyBarangayResidents,
  sendToMany,
} = require("../notifications/notifications.service");
const auditService = require("../audit/audit.service");
const { emitNotificationReferenceRemoved } = require("../../sockets/notifications.socket");

// ─── Base fetch ────────────────────────────────────────────

const getById = async (id, viewer = null) => {
  const [rows] = await pool.query(
    `SELECT
       a.*,
       u.full_name  AS created_by_name,
       u.avatar_url AS created_by_avatar,
       calendar_event.id AS calendar_event_id,
       calendar_event.event_date AS calendar_date,
       calendar_event.start_time AS calendar_start_time,
       calendar_event.end_time AS calendar_end_time,
       calendar_event.location AS calendar_location,
       (a.expires_at IS NOT NULL AND a.expires_at <= NOW()) AS is_expired,
       (SELECT COUNT(DISTINCT r.user_id) FROM announcement_read_receipts r WHERE r.announcement_id = a.id) AS read_count,
       (SELECT COUNT(DISTINCT n.user_id) FROM notifications n WHERE n.ref_module = 'announcements' AND n.ref_id = a.id) AS recipient_count
     FROM announcements a
     JOIN users u ON u.id = a.created_by
     LEFT JOIN schedules calendar_event
       ON calendar_event.announcement_id = a.id AND calendar_event.deleted_at IS NULL
     WHERE a.id = ?`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Announcement not found" };
  }

  const announcement = rows[0];

  // Attach targeted barangays
  const [barangays] = await pool.query(
    `SELECT b.id, b.name, NULL AS zone
     FROM announcement_barangays ab
     JOIN barangays b ON b.id = ab.barangay_id
     WHERE ab.announcement_id = ?`,
    [id],
  );
  announcement.barangays = barangays;

  if (viewer && viewer.role !== "ADMIN") {
    // Use the database clock for the same UTC comparison used by the resident
    // feed and expiry scheduler. This avoids server/browser timezone drift.
    const expired = Boolean(announcement.is_expired);
    const isTargeted = announcement.target_all || barangays.some((b) => b.id === viewer.barangay_id);
    if (announcement.status !== "ACTIVE" || expired || !isTargeted) {
      throw { statusCode: 404, message: "Announcement not found" };
    }
  }

  return announcement;
};

const getCalendarEntry = async (announcementId) => {
  const [rows] = await pool.query(
    `SELECT id, event_date, start_time, end_time, location
     FROM schedules
     WHERE announcement_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [announcementId],
  );
  return rows[0] || null;
};

const announcementCalendarDate = (announcement) => {
  const value = announcement.scheduled_at || announcement.sent_at || new Date();
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

const syncResidentCalendarEntry = async (announcement, data) => {
  const existingEntry = await getCalendarEntry(announcement.id);
  const showOnCalendar = data.show_on_calendar === undefined
    ? Boolean(existingEntry)
    : data.show_on_calendar;

  if (showOnCalendar && !["SCHEDULE_CHANGE", "HOLIDAY_REMINDER", "COMMUNITY_EVENT"].includes(announcement.type)) {
    throw { statusCode: 400, message: "Only event and schedule-related announcements can appear on the resident calendar." };
  }

  if (!showOnCalendar) {
    if (existingEntry) {
      await pool.query("UPDATE schedules SET deleted_at = NOW() WHERE id = ?", [existingEntry.id]);
    }
    return;
  }

  const eventDate = data.calendar_date ?? existingEntry?.event_date ?? announcementCalendarDate(announcement);
  if (!eventDate) {
    throw { statusCode: 400, message: "Select the resident calendar date." };
  }
  if (existingEntry) {
    await pool.query(
      `UPDATE schedules
       SET title = ?, description = ?, event_date = ?, start_time = NULL, end_time = NULL, location = NULL,
           event_type = 'COMMUNITY_EVENT', visibility = 'PUBLIC', status = 'UPCOMING'
       WHERE id = ?`,
      [announcement.title, announcement.body, eventDate, existingEntry.id],
    );
    return;
  }

  await pool.query(
    `INSERT INTO schedules
       (id, title, description, event_date, start_time, end_time, event_type, visibility,
        location, status, created_by, announcement_id)
     VALUES (?, ?, ?, ?, ?, ?, 'COMMUNITY_EVENT', 'PUBLIC', ?, 'UPCOMING', ?, ?)`,
    [generateId(), announcement.title, announcement.body, eventDate, null, null, null, announcement.created_by, announcement.id],
  );
};

// ─── Get All ───────────────────────────────────────────────

const getAll = async (filters = {}, viewer = null) => {
  let query = `
    SELECT
      a.*,
       u.full_name AS created_by_name,
       calendar_event.id AS calendar_event_id,
       calendar_event.event_date AS calendar_date,
       calendar_event.start_time AS calendar_start_time,
       calendar_event.end_time AS calendar_end_time,
       calendar_event.location AS calendar_location,
       (SELECT COUNT(DISTINCT r.user_id) FROM announcement_read_receipts r WHERE r.announcement_id = a.id) AS read_count,
       (SELECT COUNT(DISTINCT n.user_id) FROM notifications n WHERE n.ref_module = 'announcements' AND n.ref_id = a.id) AS recipient_count
     FROM announcements a
     JOIN users u ON u.id = a.created_by
     LEFT JOIN schedules calendar_event
       ON calendar_event.announcement_id = a.id AND calendar_event.deleted_at IS NULL
    WHERE 1=1
  `;

  const params = [];

  if (filters.status) {
    query += " AND a.status = ?";
    params.push(filters.status);
  }

  if (filters.type) {
    query += " AND a.type = ?";
    params.push(filters.type);
  }

  if (viewer?.role !== "ADMIN") {
    query += " AND a.status = 'ACTIVE' AND (a.expires_at IS NULL OR a.expires_at > NOW())";
    query += " AND (a.target_all = TRUE OR EXISTS (SELECT 1 FROM announcement_barangays visible_ab WHERE visible_ab.announcement_id = a.id AND visible_ab.barangay_id = ?))";
    params.push(viewer?.barangay_id || "");
  }

  query += " ORDER BY a.created_at DESC";

  const [announcements] = await pool.query(query, params);

  // Attach barangays to each
  for (const a of announcements) {
    const [barangays] = await pool.query(
      `SELECT b.id, b.name, NULL AS zone
       FROM announcement_barangays ab
       JOIN barangays b ON b.id = ab.barangay_id
       WHERE ab.announcement_id = ?`,
      [a.id],
    );
    a.barangays = barangays;
  }

  return announcements;
};

const notifyRecipients = async (announcement) => {
  const payload = {
    type: "ANNOUNCEMENT",
    title: announcement.title,
    body: announcement.body,
    ref_id: announcement.id,
    ref_module: "announcements",
    metadata: { category: announcement.type },
  };
  if (announcement.target_all) return notifyAllResidents(payload);
  return Promise.all(announcement.barangays.map((barangay) =>
    notifyBarangayResidents({ ...payload, barangay_id: barangay.id }),
  ));
};

const activateDueAnnouncements = async () => {
  const [expiring] = await pool.query(
    "SELECT id FROM announcements WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= NOW()",
  );
  await pool.query(
    "UPDATE announcements SET status = 'ARCHIVED', archived_at = COALESCE(archived_at, NOW()) WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= NOW()",
  );
  expiring.forEach((announcement) =>
    emitNotificationReferenceRemoved("announcements", announcement.id),
  );
  const [due] = await pool.query(
    "SELECT id FROM announcements WHERE status = 'SCHEDULED' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()",
  );
  for (const row of due) {
    const [result] = await pool.query(
      "UPDATE announcements SET status = 'ACTIVE', sent_at = COALESCE(sent_at, scheduled_at, NOW()) WHERE id = ? AND status = 'SCHEDULED'",
      [row.id],
    );
    if (result.affectedRows === 1) {
      const announcement = await getById(row.id);
      notifyRecipients(announcement).catch((err) => console.error("[Notify] ❌ Scheduled announcement failed:", err.message));
    }
  }
};

// ─── Create ────────────────────────────────────────────────

const create = async (adminId, data) => {
  const {
    title,
    body,
    type,
    status,
    target_all,
    scheduled_at,
    expires_at,
    barangay_ids = [],
    show_on_calendar,
  } = data;

  const id = generateId();
  // Use the database's UTC clock. A JavaScript Date can otherwise be written
  // as a local wall-clock value into this UTC TIMESTAMP column.
  const sentAt = status === "ACTIVE" ? "NOW()" : "NULL";

  await pool.query(
    `INSERT INTO announcements
       (id, title, body, type, status,
        target_all, scheduled_at, expires_at, sent_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${sentAt}, ?)`,
    [
      id,
      title,
      body,
      type,
      status,
      target_all,
      scheduled_at || null,
      expires_at || null,
      adminId,
    ],
  );

  // Insert targeted barangays if target_all is false
  if (!target_all && barangay_ids.length > 0) {
    for (const barangayId of barangay_ids) {
      await pool.query(
        `INSERT INTO announcement_barangays (id, announcement_id, barangay_id)
         VALUES (?, ?, ?)`,
        [generateId(), id, barangayId],
      );
    }
  }

  const created = await getById(id);
  await syncResidentCalendarEntry(created, data);

  await auditService.log({
    user_id: adminId,
    action: "CREATE_ANNOUNCEMENT",
    module: "announcements",
    record_id: created.id,
    new_value: { title: created.title, type: created.type, status: created.status },
  }).catch(() => {});

  // Finish persisting recipient notifications before returning success. Keeping this
  // work in the background allowed a server restart/request teardown to leave a
  // targeted announcement active without creating any recipient notifications.
  if (created.status === "ACTIVE") {
    try {
      await notifyRecipients(created);
    } catch (err) {
      console.error("[Notify] ❌ Announcement broadcast failed:", err.message);
    }
  }

  return getById(created.id);
};

// ─── Update ────────────────────────────────────────────────

const update = async (id, data) => {
  const existing = await getById(id);

  // Updates can turn a draft into a scheduled announcement, so enforce the
  // same time rules here instead of relying only on the create validator.
  if (data.status === "SCHEDULED") {
    const scheduledAt = data.scheduled_at ?? existing.scheduled_at;
    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
      throw { statusCode: 400, message: "A valid broadcast time is required." };
    }
    if (new Date(scheduledAt) <= new Date()) {
      throw { statusCode: 400, message: "Broadcast time must be in the future." };
    }

    const expiresAt = data.expires_at ?? existing.expires_at;
    if (expiresAt && new Date(expiresAt) <= new Date(scheduledAt)) {
      throw { statusCode: 400, message: "Expiry must be after the broadcast time." };
    }
  }

  // Activating or restoring a notice must never retain a past expiry. When an
  // expired archived notice is edited, use the new expiry supplied by the
  // editor (or null when the admin removes the expiry), not its old value.
  if (data.status === "ACTIVE") {
    const effectiveExpiresAt =
      data.expires_at !== undefined ? data.expires_at : existing.expires_at;
    if (effectiveExpiresAt && new Date(effectiveExpiresAt) <= new Date()) {
      throw { statusCode: 400, message: "Expiry time must be in the future." };
    }
  }

  const fields = [];
  const params = [];

  const map = {
    title: "title",
    body: "body",
    type: "type",
    status: "status",
    target_all: "target_all",
    scheduled_at: "scheduled_at",
    expires_at: "expires_at",
  };

  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(data[key]);
    }
  }

  if (data.status === "ARCHIVED" && existing.status !== "ARCHIVED") {
    fields.push("archived_at = NOW()");
  }

  // A restored notice keeps its original broadcast time and does not notify again.
  if (data.status === "ACTIVE" && existing.status === "ARCHIVED") {
    fields.push("archived_at = NULL");
  }

  // Auto set sent_at only for a first publication, never for a restore.
  if (data.status === "ACTIVE" && existing.status !== "ACTIVE" && existing.status !== "ARCHIVED") {
    fields.push("sent_at = NOW()");
  }

  if (fields.length > 0) {
    params.push(id);
    await pool.query(
      `UPDATE announcements SET ${fields.join(", ")} WHERE id = ?`,
      params,
    );
  }

  // Replace barangays if provided
  if (data.barangay_ids !== undefined) {
    await pool.query(
      "DELETE FROM announcement_barangays WHERE announcement_id = ?",
      [id],
    );

    if (!data.target_all && data.barangay_ids.length > 0) {
      for (const barangayId of data.barangay_ids) {
        await pool.query(
          `INSERT INTO announcement_barangays (id, announcement_id, barangay_id)
           VALUES (?, ?, ?)`,
          [generateId(), id, barangayId],
        );
      }
    }
  }

  const updated = await getById(id);
  await syncResidentCalendarEntry(updated, data);

  auditService.log({
    user_id: updated.created_by,
    action: existing.status === "ARCHIVED" && updated.status === "ACTIVE"
      ? "RESTORE_ANNOUNCEMENT"
      : "UPDATE_ANNOUNCEMENT",
    module: "announcements",
    record_id: updated.id,
    old_value: { title: existing.title, status: existing.status },
    new_value: { title: updated.title, status: updated.status },
  }).catch(() => {});

  if (data.status === "ACTIVE" && existing.status !== "ACTIVE" && existing.status !== "ARCHIVED") {
    try {
      await notifyRecipients(updated);
    } catch (err) {
      console.error("[Notify] ❌ Announcement broadcast failed:", err.message);
    }
  }

  if (data.status === "ARCHIVED" && existing.status !== "ARCHIVED") {
    emitNotificationReferenceRemoved("announcements", updated.id);
  }

  return getById(updated.id);
};

// ─── Archive ───────────────────────────────────────────────

const remove = async (id) => {
  const existing = await getById(id);

  if (existing.status !== "ARCHIVED") {
    await pool.query(
      "UPDATE announcements SET status = 'ARCHIVED', archived_at = NOW() WHERE id = ?",
      [id],
    );
  }
  emitNotificationReferenceRemoved("announcements", id);

  auditService.log({
    user_id: existing.created_by,
    action: "ARCHIVE_ANNOUNCEMENT",
    module: "announcements",
    record_id: id,
    old_value: { title: existing.title },
  }).catch(() => {});

  return { message: "Announcement archived successfully" };
};

// Permanent removal is deliberately restricted to announcements that are
// already archived. Active resident content can only be archived first.
const destroyArchived = async (id) => {
  const existing = await getById(id);
  if (existing.status !== "ARCHIVED") {
    throw { statusCode: 409, message: "Only archived announcements can be permanently deleted." };
  }

  await pool.query(
    "DELETE FROM notifications WHERE ref_module = 'announcements' AND ref_id = ?",
    [id],
  );
  await pool.query("DELETE FROM announcements WHERE id = ?", [id]);
  emitNotificationReferenceRemoved("announcements", id);

  await auditService.log({
    user_id: existing.created_by,
    action: "DELETE_ARCHIVED_ANNOUNCEMENT",
    module: "announcements",
    record_id: id,
    old_value: { title: existing.title, archived_at: existing.archived_at },
  }).catch(() => {});

  return { message: "Archived announcement permanently deleted" };
};

// Re-issue an announcement notification only to residents who originally
// received it and still have no announcement read receipt.
const resendToUnread = async (id) => {
  const announcement = await getById(id);

  if (announcement.status !== "ACTIVE") {
    throw { statusCode: 409, message: "Only active announcements can be resent." };
  }
  if (announcement.expires_at && new Date(announcement.expires_at) <= new Date()) {
    throw { statusCode: 409, message: "Expired announcements cannot be resent." };
  }

  const [recipients] = await pool.query(
    `SELECT DISTINCT n.user_id
     FROM notifications n
     WHERE n.ref_module = 'announcements'
       AND n.ref_id = ?
       AND NOT EXISTS (
         SELECT 1
         FROM announcement_read_receipts r
         WHERE r.announcement_id = n.ref_id AND r.user_id = n.user_id
       )`,
    [id],
  );

  const result = await sendToMany({
    user_ids: recipients.map((recipient) => recipient.user_id),
    type: "ANNOUNCEMENT",
    title: announcement.title,
    body: announcement.body,
    ref_id: announcement.id,
    ref_module: "announcements",
    metadata: { category: announcement.type, resend: true },
  });

  await auditService.log({
    user_id: announcement.created_by,
    action: "RESEND_ANNOUNCEMENT_TO_UNREAD",
    module: "announcements",
    record_id: id,
    new_value: { recipients: result.sent },
  }).catch(() => {});

  return { sent: result.sent };
};

// Permanently remove archived records after their 30-day recovery window. The
// audit entry is intentionally retained as a historical record.
const purgeArchivedAnnouncements = async () => {
  const [expired] = await pool.query(
    `SELECT id, title, created_by
     FROM announcements
     WHERE status = 'ARCHIVED'
       AND archived_at IS NOT NULL
       AND archived_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
  );

  for (const announcement of expired) {
    await pool.query(
      "DELETE FROM notifications WHERE ref_module = 'announcements' AND ref_id = ?",
      [announcement.id],
    );
    await pool.query("DELETE FROM announcements WHERE id = ?", [announcement.id]);
    await auditService.log({
      user_id: announcement.created_by,
      action: "PURGE_ARCHIVED_ANNOUNCEMENT",
      module: "announcements",
      record_id: announcement.id,
      old_value: { title: announcement.title, archived_for_days: 30 },
    }).catch(() => {});
  }

  return expired.length;
};

// ─── Mark as Read ──────────────────────────────────────────

const markAsRead = async (announcementId, user) => {
  await getById(announcementId, user);

  const [existing] = await pool.query(
    "SELECT id FROM announcement_read_receipts WHERE announcement_id = ? AND user_id = ?",
    [announcementId, user.id],
  );

  if (existing.length > 0) {
    return { already_read: true };
  }

  await pool.query(
    `INSERT INTO announcement_read_receipts (id, announcement_id, user_id)
     VALUES (?, ?, ?)`,
    [generateId(), announcementId, user.id],
  );

  return { read: true };
};

// ─── Get Read Analytics (admin) ────────────────────────────
// Delivery means an announcement notification was created for that resident.
// A confirmed read is recorded only when that resident opens the announcement.
const getReceipts = async (announcementId) => {
  await getById(announcementId);

  const [summaryRows] = await pool.query(
    `SELECT
       COUNT(DISTINCT n.user_id) AS recipients,
       COUNT(DISTINCT r.user_id) AS read_count
     FROM notifications n
     LEFT JOIN announcement_read_receipts r
       ON r.announcement_id = n.ref_id AND r.user_id = n.user_id
     WHERE n.ref_module = 'announcements' AND n.ref_id = ?`,
    [announcementId],
  );

  const [barangays] = await pool.query(
    `SELECT
       COALESCE(b.name, 'No barangay') AS name,
       COUNT(DISTINCT n.user_id) AS received,
       COUNT(DISTINCT r.user_id) AS \`read\`
     FROM notifications n
     JOIN users u ON u.id = n.user_id
     LEFT JOIN barangays b ON b.id = u.barangay_id
     LEFT JOIN announcement_read_receipts r
       ON r.announcement_id = n.ref_id AND r.user_id = n.user_id
     WHERE n.ref_module = 'announcements' AND n.ref_id = ?
     GROUP BY b.id, b.name
     ORDER BY name ASC`,
    [announcementId],
  );

  const recipients = Number(summaryRows[0]?.recipients ?? 0);
  const readCount = Number(summaryRows[0]?.read_count ?? 0);
  return {
    recipients,
    read_count: readCount,
    unread_count: Math.max(0, recipients - readCount),
    barangays: barangays.map((row) => ({
      name: row.name,
      received: Number(row.received ?? 0),
      read: Number(row.read ?? 0),
    })),
  };
};


module.exports = {
  activateDueAnnouncements,
  purgeArchivedAnnouncements,
  getAll,
  getById,
  create,
  update,
  remove,
  destroyArchived,
  resendToUnread,
  markAsRead,
  getReceipts,
};
