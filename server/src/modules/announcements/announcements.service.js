const { emitAdminDataChanged } = require("../../sockets/adminChanges.socket");
const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const {
  notifyAllResidents,
  notifyBarangayResidents,
  sendToMany,
  emitStoredNotifications,
  filterNotificationEnabledUserIds,
} = require("../notifications/notifications.service");
const auditService = require("../audit/audit.service");
const {
  emitNotificationReferenceRemoved,
  emitNotificationReferenceRemovedToUser,
  emitNotificationReferenceUpdatedToUser,
} = require("../../sockets/notifications.socket");

// ─── Base fetch ────────────────────────────────────────────

const getById = async (id, viewer = null, db = pool) => {
  const [rows] = await db.query(
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
  const [barangays] = await db.query(
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

const getCalendarEntry = async (announcementId, db = pool) => {
  const [rows] = await db.query(
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

const syncResidentCalendarEntry = async (announcement, data, db = pool) => {
  const existingEntry = await getCalendarEntry(announcement.id, db);
  const showOnCalendar = data.show_on_calendar === undefined
    ? Boolean(existingEntry)
    : data.show_on_calendar;

  if (showOnCalendar && !["SCHEDULE_CHANGE", "HOLIDAY_REMINDER", "COMMUNITY_EVENT"].includes(announcement.type)) {
    throw { statusCode: 400, message: "Only event and schedule-related announcements can appear on the resident calendar." };
  }

  if (!showOnCalendar) {
    if (existingEntry) {
      await db.query("UPDATE schedules SET deleted_at = NOW() WHERE id = ?", [existingEntry.id]);
    }
    return;
  }

  const eventDate = data.calendar_date ?? existingEntry?.event_date ?? announcementCalendarDate(announcement);
  if (!eventDate) {
    throw { statusCode: 400, message: "Select the resident calendar date." };
  }
  if (existingEntry) {
    await db.query(
      `UPDATE schedules
       SET title = ?, description = ?, event_date = ?, start_time = NULL, end_time = NULL, location = NULL,
           event_type = 'COMMUNITY_EVENT', visibility = 'PUBLIC', status = 'UPCOMING'
       WHERE id = ?`,
      [announcement.title, announcement.body, eventDate, existingEntry.id],
    );
    return;
  }

  await db.query(
    `INSERT INTO schedules
       (id, title, description, event_date, start_time, end_time, event_type, visibility,
        location, status, created_by, announcement_id)
     VALUES (?, ?, ?, ?, ?, ?, 'COMMUNITY_EVENT', 'PUBLIC', ?, 'UPCOMING', ?, ?)`,
    [generateId(), announcement.title, announcement.body, eventDate, null, null, null, announcement.created_by, announcement.id],
  );
};

// ─── Get All ───────────────────────────────────────────────

const getAll = async (filters = {}, viewer = null) => {
  const isAdmin = viewer?.role === "ADMIN";
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

  if (filters.status && filters.status !== "all") {
    query += " AND a.status = ?";
    params.push(filters.status);
  } else if (isAdmin && (filters.page || filters.limit)) {
    query += " AND a.status <> 'ARCHIVED'";
  }

  if (filters.type && filters.type !== "all") {
    query += " AND a.type = ?";
    params.push(filters.type);
  }

  if (!isAdmin) {
    query += " AND a.status = 'ACTIVE' AND (a.expires_at IS NULL OR a.expires_at > NOW())";
    query += " AND (a.target_all = TRUE OR EXISTS (SELECT 1 FROM announcement_barangays visible_ab WHERE visible_ab.announcement_id = a.id AND visible_ab.barangay_id = ?))";
    params.push(viewer?.barangay_id || "");
  }

  if (isAdmin && filters.search) {
    query += " AND (a.title LIKE ? OR a.body LIKE ?)";
    const search = `%${String(filters.search).trim()}%`;
    params.push(search, search);
  }

  const sortClauses = {
    newest: "COALESCE(a.sent_at, a.scheduled_at, a.created_at) DESC",
    oldest: "COALESCE(a.sent_at, a.scheduled_at, a.created_at) ASC",
    "most-read": "read_count DESC, a.created_at DESC",
  };
  query += ` ORDER BY ${isAdmin ? sortClauses[filters.sort] || sortClauses.newest : "a.created_at DESC"}`;

  let page = 1;
  let limit = null;
  let total = null;
  if (isAdmin && (filters.page || filters.limit)) {
    page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
    limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 10));
    const countQuery = `SELECT COUNT(*) AS total FROM (${query.replace(/ORDER BY[\s\S]*$/, "")}) filtered_announcements`;
    const [countRows] = await pool.query(countQuery, params);
    total = Number(countRows[0]?.total ?? 0);
    query += " LIMIT ? OFFSET ?";
    params.push(limit, (page - 1) * limit);
  }

  const [announcements] = await pool.query(query, params);

  // Attach all barangays in one query instead of issuing one query per row.
  const announcementIds = announcements.map((announcement) => announcement.id);
  const barangaysByAnnouncement = new Map();
  if (announcementIds.length > 0) {
    const [barangays] = await pool.query(
      `SELECT ab.announcement_id, b.id, b.name, NULL AS zone
       FROM announcement_barangays ab
       JOIN barangays b ON b.id = ab.barangay_id
       WHERE ab.announcement_id IN (?)
       ORDER BY b.name ASC`,
      [announcementIds],
    );
    barangays.forEach((barangay) => {
      const list = barangaysByAnnouncement.get(barangay.announcement_id) || [];
      list.push({ id: barangay.id, name: barangay.name, zone: barangay.zone });
      barangaysByAnnouncement.set(barangay.announcement_id, list);
    });
  }
  announcements.forEach((announcement) => {
    announcement.barangays = barangaysByAnnouncement.get(announcement.id) || [];
  });

  if (limit === null) return announcements;

  const [summaryRows] = await pool.query(
    `SELECT
       SUM(a.status <> 'ARCHIVED') AS all_count,
       SUM(a.status = 'ACTIVE') AS active_count,
       SUM(a.status = 'SCHEDULED') AS scheduled_count,
       SUM(a.status = 'DRAFT') AS draft_count,
       SUM(a.status = 'ARCHIVED') AS archived_count,
       (SELECT COUNT(DISTINCT CONCAT(n.ref_id, ':', n.user_id))
        FROM notifications n
        JOIN announcements active_a ON active_a.id = n.ref_id
        WHERE n.ref_module = 'announcements' AND active_a.status = 'ACTIVE') AS total_recipients,
       (SELECT COUNT(*)
        FROM announcement_read_receipts r
        JOIN announcements active_a ON active_a.id = r.announcement_id
        WHERE active_a.status = 'ACTIVE') AS total_reads
     FROM announcements a`,
  );
  const summary = summaryRows[0] || {};
  return {
    items: announcements,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    statusCounts: {
      all: Number(summary.all_count ?? 0),
      Active: Number(summary.active_count ?? 0),
      Scheduled: Number(summary.scheduled_count ?? 0),
      Draft: Number(summary.draft_count ?? 0),
      Archived: Number(summary.archived_count ?? 0),
    },
    metrics: {
      active: Number(summary.active_count ?? 0),
      scheduled: Number(summary.scheduled_count ?? 0),
      drafts: Number(summary.draft_count ?? 0),
      totalRecipients: Number(summary.total_recipients ?? 0),
      totalReads: Number(summary.total_reads ?? 0),
    },
  };
};

const mergeDeliveryResults = (results) => ({
  sent: results.reduce((sum, result) => sum + result.sent, 0),
  ids: results.flatMap((result) => result.ids),
  notifications: results.flatMap((result) => result.notifications || []),
});

const notifyRecipients = async (announcement, { db = pool, emit = true } = {}) => {
  const payload = {
    type: "ANNOUNCEMENT",
    title: announcement.title,
    body: announcement.body,
    ref_id: announcement.id,
    ref_module: "announcements",
    metadata: { category: announcement.type },
  };
  if (announcement.target_all) return notifyAllResidents({ ...payload, db, emit });
  const results = await Promise.all(announcement.barangays.map((barangay) =>
    notifyBarangayResidents({ ...payload, barangay_id: barangay.id, db, emit }),
  ));
  return mergeDeliveryResults(results);
};

const activateDueAnnouncements = async () => {
  const [expiring] = await pool.query(
    "SELECT id FROM announcements WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= NOW()",
  );
  await pool.query(
    "UPDATE announcements SET status = 'ARCHIVED', archived_at = COALESCE(archived_at, NOW()) WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= NOW()",
  );
  if (expiring.length) emitAdminDataChanged(["announcements", "schedule", "dashboard", "analytics"]);
  expiring.forEach((announcement) =>
    emitNotificationReferenceRemoved("announcements", announcement.id),
  );
  const [due] = await pool.query(
    "SELECT id FROM announcements WHERE status = 'SCHEDULED' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()",
  );
  for (const row of due) {
    const connection = await pool.getConnection();
    let delivery = { notifications: [] };
    try {
      await connection.beginTransaction();
      const [locked] = await connection.query(
        "SELECT id FROM announcements WHERE id = ? AND status = 'SCHEDULED' AND scheduled_at <= NOW() FOR UPDATE",
        [row.id],
      );
      if (locked.length === 0) {
        await connection.rollback();
        continue;
      }

      const announcement = await getById(row.id, null, connection);
      delivery = await notifyRecipients(announcement, { db: connection, emit: false });
      await connection.query(
        "UPDATE announcements SET status = 'ACTIVE', sent_at = COALESCE(sent_at, scheduled_at, NOW()) WHERE id = ?",
        [row.id],
      );
      await connection.commit();
      emitAdminDataChanged(["announcements", "schedule", "dashboard", "analytics"]);
      emitStoredNotifications(delivery.notifications);
    } catch (err) {
      await connection.rollback();
      // The row remains SCHEDULED, so the next scheduler pass retries delivery.
      console.error("[Notify] ❌ Scheduled announcement failed and will retry:", err.message);
    } finally {
      connection.release();
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

  const connection = await pool.getConnection();
  let created;
  let delivery = { notifications: [] };
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO announcements
         (id, title, body, type, status,
          target_all, scheduled_at, expires_at, sent_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${sentAt}, ?)`,
      [id, title, body, type, status, target_all, scheduled_at || null, expires_at || null, adminId],
    );

    if (!target_all && barangay_ids.length > 0) {
      const rows = barangay_ids.map((barangayId) => [generateId(), id, barangayId]);
      await connection.query(
        "INSERT INTO announcement_barangays (id, announcement_id, barangay_id) VALUES ?",
        [rows],
      );
    }

    created = await getById(id, null, connection);
    await syncResidentCalendarEntry(created, data, connection);
    if (created.status === "ACTIVE") {
      delivery = await notifyRecipients(created, { db: connection, emit: false });
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  emitStoredNotifications(delivery.notifications);

  await auditService.log({
    user_id: adminId,
    action: "CREATE_ANNOUNCEMENT",
    module: "announcements",
    record_id: created.id,
    new_value: { title: created.title, type: created.type, status: created.status },
  }).catch(() => {});

  return getById(created.id);
};

// ─── Update ────────────────────────────────────────────────

const getTargetResidentIds = async (announcement, db = pool) => {
  const params = [];
  let targetFilter = "";
  if (!announcement.target_all) {
    const barangayIds = announcement.barangays.map((barangay) => barangay.id);
    if (barangayIds.length === 0) return [];
    targetFilter = " AND u.barangay_id IN (?)";
    params.push(barangayIds);
  }
  const [rows] = await db.query(
    `SELECT u.id
     FROM users u
     WHERE u.role = 'RESIDENT'
       AND u.status = 'ACTIVE'
       AND u.deleted_at IS NULL${targetFilter}`,
    params,
  );
  return rows.map((row) => row.id);
};

const reconcileActiveRecipients = async (existing, updated, db) => {
  const [notificationRows] = await db.query(
    "SELECT DISTINCT user_id FROM notifications WHERE ref_module = 'announcements' AND ref_id = ?",
    [updated.id],
  );
  const existingRecipientIds = notificationRows.map((row) => row.user_id);
  const oldTargetIds = new Set(await getTargetResidentIds(existing, db));
  const newTargetIds = await getTargetResidentIds(updated, db);
  const newTargetSet = new Set(newTargetIds);
  const removedUserIds = existingRecipientIds.filter((userId) => !newTargetSet.has(userId));
  const newlyTargetedIds = newTargetIds.filter((userId) => !oldTargetIds.has(userId));
  const enabledNewUserIds = await filterNotificationEnabledUserIds(newlyTargetedIds, "ANNOUNCEMENT", db);

  if (removedUserIds.length > 0) {
    await db.query(
      "DELETE FROM notifications WHERE ref_module = 'announcements' AND ref_id = ? AND user_id IN (?)",
      [updated.id, removedUserIds],
    );
    await db.query(
      "DELETE FROM announcement_read_receipts WHERE announcement_id = ? AND user_id IN (?)",
      [updated.id, removedUserIds],
    );
  }

  const retainedUserIds = existingRecipientIds.filter((userId) => newTargetSet.has(userId));
  const metadata = { category: updated.type };
  if (retainedUserIds.length > 0) {
    await db.query(
      `UPDATE notifications
       SET title = ?, body = ?, metadata = ?
       WHERE ref_module = 'announcements' AND ref_id = ? AND user_id IN (?)`,
      [updated.title, updated.body, JSON.stringify(metadata), updated.id, retainedUserIds],
    );
  }

  const delivery = await sendToMany({
    user_ids: enabledNewUserIds,
    type: "ANNOUNCEMENT",
    title: updated.title,
    body: updated.body,
    ref_id: updated.id,
    ref_module: "announcements",
    metadata,
    db,
    emit: false,
  });

  return { delivery, removedUserIds, retainedUserIds, metadata };
};

const update = async (id, data, actorId) => {
  const connection = await pool.getConnection();
  let existing;
  let updated;
  let delivery = { notifications: [] };
  let audienceChanges = { removedUserIds: [], retainedUserIds: [], metadata: null };

  try {
    await connection.beginTransaction();
    await connection.query("SELECT id FROM announcements WHERE id = ? FOR UPDATE", [id]);
    existing = await getById(id, null, connection);

    const effectiveStatus = data.status ?? existing.status;
    const effectiveTargetAll = data.target_all ?? Boolean(existing.target_all);
    const effectiveBarangayIds = data.barangay_ids ?? existing.barangays.map((barangay) => barangay.id);
    const effectiveScheduledAt = data.scheduled_at !== undefined ? data.scheduled_at : existing.scheduled_at;
    const effectiveExpiresAt = data.expires_at !== undefined ? data.expires_at : existing.expires_at;
    const effectiveType = data.type ?? existing.type;
    const existingCalendar = Boolean(existing.calendar_event_id);
    const effectiveShowOnCalendar = data.show_on_calendar ?? existingCalendar;
    const effectiveCalendarDate = data.calendar_date !== undefined
      ? data.calendar_date
      : existing.calendar_date;

    if (!effectiveTargetAll && effectiveBarangayIds.length === 0) {
      throw { statusCode: 400, message: "Select at least one barangay." };
    }
    if (effectiveStatus === "SCHEDULED") {
      const scheduledDate = effectiveScheduledAt ? new Date(effectiveScheduledAt) : null;
      if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
        throw { statusCode: 400, message: "A valid broadcast time is required." };
      }
      if (scheduledDate <= new Date()) {
        throw { statusCode: 400, message: "Broadcast time must be in the future." };
      }
    }
    if (effectiveExpiresAt) {
      const expiryDate = new Date(effectiveExpiresAt);
      if (Number.isNaN(expiryDate.getTime())) {
        throw { statusCode: 400, message: "Expiry time is invalid." };
      }
      if (effectiveStatus !== "DRAFT" && expiryDate <= new Date()) {
        throw { statusCode: 400, message: "Expiry time must be in the future." };
      }
      if (effectiveScheduledAt && expiryDate <= new Date(effectiveScheduledAt)) {
        throw { statusCode: 400, message: "Expiry must be after the broadcast time." };
      }
    }
    if (effectiveShowOnCalendar && !effectiveCalendarDate) {
      throw { statusCode: 400, message: "Select the resident calendar date." };
    }
    if (
      effectiveShowOnCalendar &&
      !["SCHEDULE_CHANGE", "HOLIDAY_REMINDER", "COMMUNITY_EVENT"].includes(effectiveType)
    ) {
      throw { statusCode: 400, message: "Only event and schedule-related announcements can appear on the resident calendar." };
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
    await connection.query(
      `UPDATE announcements SET ${fields.join(", ")} WHERE id = ?`,
      params,
    );
  }

  // Replace barangays if provided
  if (data.barangay_ids !== undefined) {
    await connection.query(
      "DELETE FROM announcement_barangays WHERE announcement_id = ?",
      [id],
    );

    if (!data.target_all && data.barangay_ids.length > 0) {
      for (const barangayId of data.barangay_ids) {
        await connection.query(
          `INSERT INTO announcement_barangays (id, announcement_id, barangay_id)
           VALUES (?, ?, ?)`,
          [generateId(), id, barangayId],
        );
      }
    }
  }

    updated = await getById(id, null, connection);
    await syncResidentCalendarEntry(updated, data, connection);

    if (updated.status === "ACTIVE" && existing.status !== "ACTIVE" && existing.status !== "ARCHIVED") {
      delivery = await notifyRecipients(updated, { db: connection, emit: false });
    } else if (updated.status === "ACTIVE" && existing.status === "ACTIVE") {
      const reconciled = await reconcileActiveRecipients(existing, updated, connection);
      delivery = reconciled.delivery;
      audienceChanges = reconciled;
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  emitStoredNotifications(delivery.notifications);
  audienceChanges.removedUserIds.forEach((userId) =>
    emitNotificationReferenceRemovedToUser(userId, "announcements", updated.id),
  );
  audienceChanges.retainedUserIds.forEach((userId) =>
    emitNotificationReferenceUpdatedToUser(userId, "announcements", updated.id, {
      title: updated.title,
      body: updated.body,
      metadata: audienceChanges.metadata,
    }),
  );

  auditService.log({
    user_id: actorId,
    action: existing.status === "ARCHIVED" && updated.status === "ACTIVE"
      ? "RESTORE_ANNOUNCEMENT"
      : "UPDATE_ANNOUNCEMENT",
    module: "announcements",
    record_id: updated.id,
    old_value: { title: existing.title, status: existing.status },
    new_value: { title: updated.title, status: updated.status },
  }).catch(() => {});

  if (updated.status !== "ACTIVE" && existing.status === "ACTIVE") {
    emitNotificationReferenceRemoved("announcements", updated.id);
  }

  return getById(updated.id);
};

// ─── Archive ───────────────────────────────────────────────

const remove = async (id, actorId) => {
  const existing = await getById(id);

  if (existing.status !== "ARCHIVED") {
    await pool.query(
      "UPDATE announcements SET status = 'ARCHIVED', archived_at = NOW() WHERE id = ?",
      [id],
    );
  }
  emitNotificationReferenceRemoved("announcements", id);

  auditService.log({
    user_id: actorId,
    action: "ARCHIVE_ANNOUNCEMENT",
    module: "announcements",
    record_id: id,
    old_value: { title: existing.title },
  }).catch(() => {});

  return { message: "Announcement archived successfully" };
};

// Permanent removal is deliberately restricted to announcements that are
// already archived. Active resident content can only be archived first.
const destroyArchived = async (id, actorId) => {
  const existing = await getById(id);
  if (existing.status !== "ARCHIVED") {
    throw { statusCode: 409, message: "Only archived announcements can be permanently deleted." };
  }

  const [notificationRecipients] = await pool.query(
    "SELECT DISTINCT user_id FROM notifications WHERE ref_module = 'announcements' AND ref_id = ?", [id]);
  await pool.query(
    "DELETE FROM notifications WHERE ref_module = 'announcements' AND ref_id = ?", [id]);
  for (const { user_id } of notificationRecipients) emitNotificationReferenceRemovedToUser(user_id, "announcements", id);
  await pool.query("DELETE FROM announcements WHERE id = ?", [id]);
  emitNotificationReferenceRemoved("announcements", id);

  await auditService.log({
    user_id: actorId,
    action: "DELETE_ARCHIVED_ANNOUNCEMENT",
    module: "announcements",
    record_id: id,
    old_value: { title: existing.title, archived_at: existing.archived_at },
  }).catch(() => {});

  return { message: "Archived announcement permanently deleted" };
};

// Re-issue an announcement notification only to residents who originally
// received it and still have no announcement read receipt.
const resendToUnread = async (id, actorId) => {
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

  const enabledUserIds = await filterNotificationEnabledUserIds(
    recipients.map((recipient) => recipient.user_id),
    "ANNOUNCEMENT",
  );
  const result = await sendToMany({
    user_ids: enabledUserIds,
    type: "ANNOUNCEMENT",
    title: announcement.title,
    body: announcement.body,
    ref_id: announcement.id,
    ref_module: "announcements",
    metadata: { category: announcement.type, resend: true },
  });

  await auditService.log({
    user_id: actorId,
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

  if (expired.length) emitAdminDataChanged(["announcements", "dashboard", "analytics"]);
  return expired.length;
};

// ─── Mark as Read ──────────────────────────────────────────

const markAsRead = async (announcementId, user) => {
  await getById(announcementId, user);

  const [result] = await pool.query(
    `INSERT IGNORE INTO announcement_read_receipts (id, announcement_id, user_id)
     VALUES (?, ?, ?)`,
    [generateId(), announcementId, user.id],
  );

  return result.affectedRows === 0 ? { already_read: true } : { read: true };
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
