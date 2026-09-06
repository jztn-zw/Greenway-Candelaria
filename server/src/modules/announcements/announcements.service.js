const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const {
  notifyAllResidents,
  notifyBarangayResidents,
} = require("../notifications/notifications.service");
const auditService = require("../audit/audit.service");

// ─── Base fetch ────────────────────────────────────────────

const getById = async (id, viewer = null) => {
  const [rows] = await pool.query(
    `SELECT
       a.*,
       u.full_name  AS created_by_name,
       u.avatar_url AS created_by_avatar,
       (SELECT COUNT(*) FROM announcement_read_receipts WHERE announcement_id = a.id) AS read_count
     FROM announcements a
     JOIN users u ON u.id = a.created_by
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
    const expired = announcement.expires_at && new Date(announcement.expires_at) <= new Date();
    const isTargeted = announcement.target_all || barangays.some((b) => b.id === viewer.barangay_id);
    if (announcement.status !== "ACTIVE" || expired || !isTargeted) {
      throw { statusCode: 404, message: "Announcement not found" };
    }
  }

  return announcement;
};

// ─── Get All ───────────────────────────────────────────────

const getAll = async (filters = {}, viewer = null) => {
  let query = `
    SELECT
      a.*,
      u.full_name AS created_by_name,
      (SELECT COUNT(*) FROM announcement_read_receipts WHERE announcement_id = a.id) AS read_count
    FROM announcements a
    JOIN users u ON u.id = a.created_by
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

  if (filters.priority) {
    query += " AND a.priority = ?";
    params.push(filters.priority);
  }

  if (filters.is_featured) {
    query += " AND a.is_featured = TRUE";
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
    title: announcement.priority === "URGENT" ? `🚨 ${announcement.title}` : announcement.title,
    body: announcement.body,
    ref_id: announcement.id,
    ref_module: "announcements",
  };
  if (announcement.target_all) return notifyAllResidents(payload);
  return Promise.all(announcement.barangays.map((barangay) =>
    notifyBarangayResidents({ ...payload, barangay_id: barangay.id }),
  ));
};

const activateDueAnnouncements = async () => {
  await pool.query(
    "UPDATE announcements SET status = 'ARCHIVED' WHERE status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= NOW()",
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
    priority,
    status,
    is_featured,
    target_all,
    scheduled_at,
    expires_at,
    barangay_ids = [],
  } = data;

  const id = generateId();
  const sentAt = status === "ACTIVE" ? new Date() : null;

  await pool.query(
    `INSERT INTO announcements
       (id, title, body, type, priority, status, is_featured,
        target_all, scheduled_at, expires_at, sent_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      body,
      type,
      priority,
      status,
      is_featured,
      target_all,
      scheduled_at || null,
      expires_at || null,
      sentAt,
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

  await auditService.log({
    user_id: adminId,
    action: "CREATE_ANNOUNCEMENT",
    module: "announcements",
    record_id: created.id,
    new_value: { title: created.title, type: created.type, priority: created.priority, status: created.status },
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

  return created;
};

// ─── Update ────────────────────────────────────────────────

const update = async (id, data) => {
  const existing = await getById(id);

  const fields = [];
  const params = [];

  const map = {
    title: "title",
    body: "body",
    type: "type",
    priority: "priority",
    status: "status",
    is_featured: "is_featured",
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

  // Auto set sent_at when activating
  if (data.status === "ACTIVE" && existing.status !== "ACTIVE") {
    fields.push("sent_at = ?");
    params.push(new Date());
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

  auditService.log({
    user_id: updated.created_by,
    action: "UPDATE_ANNOUNCEMENT",
    module: "announcements",
    record_id: updated.id,
    old_value: { title: existing.title, status: existing.status, priority: existing.priority },
    new_value: { title: updated.title, status: updated.status, priority: updated.priority },
  }).catch(() => {});

  if (data.status === "ACTIVE" && existing.status !== "ACTIVE") {
    try {
      await notifyRecipients(updated);
    } catch (err) {
      console.error("[Notify] ❌ Announcement broadcast failed:", err.message);
    }
  }

  return updated;
};

// ─── Delete ────────────────────────────────────────────────

const remove = async (id) => {
  const existing = await getById(id);

  await pool.query("DELETE FROM announcements WHERE id = ?", [id]);

  auditService.log({
    user_id: existing.created_by,
    action: "DELETE_ANNOUNCEMENT",
    module: "announcements",
    record_id: id,
    old_value: { title: existing.title },
  }).catch(() => {});

  return { message: "Announcement deleted successfully" };
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

// ─── Get Read Receipts (admin) ─────────────────────────────

const getReceipts = async (announcementId) => {
  await getById(announcementId);

  const [rows] = await pool.query(
    `SELECT
       r.id,
       r.read_at,
       u.id         AS user_id,
       u.full_name  AS user_name,
       u.email      AS user_email,
       u.avatar_url AS user_avatar
     FROM announcement_read_receipts r
     JOIN users u ON u.id = r.user_id
     WHERE r.announcement_id = ?
     ORDER BY r.read_at DESC`,
    [announcementId],
  );

  return rows;
};


module.exports = {
  activateDueAnnouncements,
  getAll,
  getById,
  create,
  update,
  remove,
  markAsRead,
  getReceipts,
};
