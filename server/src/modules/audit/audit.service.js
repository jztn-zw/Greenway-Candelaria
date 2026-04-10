const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");

// ─── Internal helper — called by other modules ─────────────

const log = async ({
  user_id,
  action,
  module,
  record_id = null,
  old_value = null,
  new_value = null,
  ip_address = null,
}) => {
  const id = generateId();

  await pool.query(
    `INSERT INTO audit_logs
       (id, user_id, action, module, record_id, old_value, new_value, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      user_id,
      action,
      module,
      record_id,
      old_value ? JSON.stringify(old_value) : null,
      new_value ? JSON.stringify(new_value) : null,
      ip_address,
    ],
  );

  return id;
};

// ─── Get All (with filters + pagination) ──────────────────

const getAll = async (filters = {}) => {
  let query = `
    SELECT
      al.*,
      u.full_name  AS user_name,
      u.email      AS user_email,
      u.role       AS user_role,
      u.avatar_url AS user_avatar
    FROM audit_logs al
    JOIN users u ON u.id = al.user_id
    WHERE 1=1
  `;
  const params = [];

  if (filters.user_id) {
    query += " AND al.user_id = ?";
    params.push(filters.user_id);
  }

  if (filters.module) {
    query += " AND al.module = ?";
    params.push(filters.module);
  }

  if (filters.action) {
    query += " AND al.action LIKE ?";
    params.push(`%${filters.action}%`);
  }

  if (filters.from) {
    query += " AND al.created_at >= ?";
    params.push(filters.from);
  }

  if (filters.to) {
    query += " AND al.created_at <= ?";
    params.push(filters.to);
  }

  query += " ORDER BY al.created_at DESC";

  const limit = parseInt(filters.limit) || 50;
  const offset = parseInt(filters.offset) || 0;
  query += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);

  return rows;
};

// ─── Get One ───────────────────────────────────────────────

const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
       al.*,
       u.full_name  AS user_name,
       u.email      AS user_email,
       u.role       AS user_role,
       u.avatar_url AS user_avatar
     FROM audit_logs al
     JOIN users u ON u.id = al.user_id
     WHERE al.id = ?`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Audit log not found" };
  }

  return rows[0];
};

// ─── Clear All (Super Admin only) ─────────────────────────

const clearAll = async () => {
  await pool.query("DELETE FROM audit_logs");
  return { message: "Audit logs cleared successfully" };
};

module.exports = {
  log,
  getAll,
  getById,
  clearAll,
};
