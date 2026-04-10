const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");

// ─── Base fetch ────────────────────────────────────────────

const getById = async (id) => {
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
    `SELECT b.id, b.name, b.zone
     FROM announcement_barangays ab
     JOIN barangays b ON b.id = ab.barangay_id
     WHERE ab.announcement_id = ?`,
    [id],
  );
  announcement.barangays = barangays;

  return announcement;
};

// ─── Get All ───────────────────────────────────────────────

const getAll = async (filters = {}) => {
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

  query += " ORDER BY a.created_at DESC";

  const [announcements] = await pool.query(query, params);

  // Attach barangays to each
  for (const a of announcements) {
    const [barangays] = await pool.query(
      `SELECT b.id, b.name, b.zone
       FROM announcement_barangays ab
       JOIN barangays b ON b.id = ab.barangay_id
       WHERE ab.announcement_id = ?`,
      [a.id],
    );
    a.barangays = barangays;
  }

  return announcements;
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

  return getById(id);
};

// ─── Update ────────────────────────────────────────────────

const update = async (id, data) => {
  await getById(id);

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
  if (data.status === "ACTIVE") {
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

  return getById(id);
};

// ─── Delete ────────────────────────────────────────────────

const remove = async (id) => {
  await getById(id);

  await pool.query("DELETE FROM announcements WHERE id = ?", [id]);

  return { message: "Announcement deleted successfully" };
};

// ─── Mark as Read ──────────────────────────────────────────

const markAsRead = async (announcementId, userId) => {
  await getById(announcementId);

  const [existing] = await pool.query(
    "SELECT id FROM announcement_read_receipts WHERE announcement_id = ? AND user_id = ?",
    [announcementId, userId],
  );

  if (existing.length > 0) {
    return { already_read: true };
  }

  await pool.query(
    `INSERT INTO announcement_read_receipts (id, announcement_id, user_id)
     VALUES (?, ?, ?)`,
    [generateId(), announcementId, userId],
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
  getAll,
  getById,
  create,
  update,
  remove,
  markAsRead,
  getReceipts,
};
