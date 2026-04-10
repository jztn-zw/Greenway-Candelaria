const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const { log } = require("../audit/audit.service"); 

const buildSearchTokens = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

const getProfile = async (userId) => {
  const [rows] = await pool.query(
    `SELECT 
       u.id, u.full_name, u.username, u.email, u.phone,
       u.role, u.status, u.avatar_url, u.two_factor,
       u.created_at, u.last_login_at,
       b.name AS barangay_name,
       b.id   AS barangay_id
     FROM users u
     LEFT JOIN barangays b ON u.barangay_id = b.id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [userId],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "User not found" };
  }

  return rows[0];
};

const updateProfile = async (userId, data) => {
  const fields = [];
  const params = [];

  if (data.full_name) {
    fields.push("full_name = ?");
    params.push(data.full_name);
  }

  if (data.username) {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [data.username, userId],
    );
    if (existing.length > 0) {
      throw { statusCode: 409, message: "Username already taken" };
    }
    fields.push("username = ?");
    params.push(data.username);
  }

  if (data.phone !== undefined) {
    fields.push("phone = ?");
    params.push(data.phone);
  }

  if (data.barangay_id !== undefined) {
    fields.push("barangay_id = ?");
    params.push(data.barangay_id);
  }

  if (fields.length === 0) {
    return getProfile(userId);
  }

  params.push(userId);

  await pool.query(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    params,
  );

  return getProfile(userId);
};

const changePassword = async (userId, { old_password, new_password }) => {
  const [rows] = await pool.query("SELECT password FROM users WHERE id = ?", [
    userId,
  ]);

  if (rows.length === 0) {
    throw { statusCode: 404, message: "User not found" };
  }

  const isMatch = await bcrypt.compare(old_password, rows[0].password);
  if (!isMatch) {
    throw { statusCode: 400, message: "Old password is incorrect" };
  }

  const hashed = await bcrypt.hash(new_password, 12);

  await pool.query("UPDATE users SET password = ? WHERE id = ?", [
    hashed,
    userId,
  ]);

  await pool.query("DELETE FROM sessions WHERE user_id = ?", [userId]);
};

const getAll = async ({
  search,
  barangay_id,
  status,
  page = 1,
  limit = 20,
}) => {
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      u.id, u.full_name, u.username, u.email, u.phone,
      u.status, u.ban_reason, u.avatar_url, u.created_at, u.last_login_at,
      b.name AS barangay_name
    FROM users u
    LEFT JOIN barangays b ON u.barangay_id = b.id
    WHERE u.role = 'RESIDENT' AND u.deleted_at IS NULL
  `;
  const params = [];

  if (search) {
    const tokens = buildSearchTokens(search);
    if (tokens.length > 0) {
      const tokenClause = tokens
        .map(
          () =>
            `(LOWER(u.full_name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ?)`,
        )
        .join(" AND ");

      query += ` AND (${tokenClause})`;
      tokens.forEach((token) => {
        const pattern = `%${token}%`;
        params.push(pattern, pattern, pattern);
      });
    }
  }

  if (barangay_id) {
    query += ` AND u.barangay_id = ?`;
    params.push(barangay_id);
  }

  if (status) {
    query += ` AND u.status = ?`;
    params.push(status);
  }

  const countQuery = query.replace(
    /SELECT[\s\S]*?FROM/,
    "SELECT COUNT(*) as total FROM",
  );
  const [[{ total }]] = await pool.query(countQuery, params);

  query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [users] = await pool.query(query, params);

  return {
    data: users,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / limit),
    },
  };
};

const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT 
       u.id, u.full_name, u.username, u.email, u.phone,
       u.role, u.status, u.ban_reason, u.avatar_url,
       u.two_factor, u.created_at, u.last_login_at,
       b.name AS barangay_name,
       b.id   AS barangay_id
     FROM users u
     LEFT JOIN barangays b ON u.barangay_id = b.id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "User not found" };
  }

  return rows[0];
};

// ✅ Now receives adminId + ip from controller
const updateStatus = async (id, { status, ban_reason }, adminId, ip) => {
  if (status === "BANNED" && !ban_reason) {
    throw {
      statusCode: 400,
      message: "Ban reason is required when banning a user",
    };
  }

  // 1. Fetch old state BEFORE changing
  const oldUser = await getById(id);

  // 2. Perform the update
  await pool.query(
    `UPDATE users SET status = ?, ban_reason = ? WHERE id = ?`,
    [status, ban_reason || null, id]
  );

  // 3. Invalidate sessions if not active
  if (status !== "ACTIVE") {
    await pool.query("DELETE FROM sessions WHERE user_id = ?", [id]);
  }

  // 4. Determine action label clearly
  const action =
    status === "BANNED"      ? "BAN_USER"        :
    status === "DEACTIVATED" ? "DEACTIVATE_USER" :
    status === "ACTIVE"      ? "UNBAN_USER"      : "UPDATE_USER_STATUS"

  // 5. Write the audit log
  await log({
    user_id:    adminId,
    action,
    module:     "users",
    record_id:  id,
    old_value:  { status: oldUser.status, ban_reason: oldUser.ban_reason },
    new_value:  { status, ban_reason: ban_reason || null },
    ip_address: ip,
  });

  return getById(id);
};

// ✅ Now receives adminId + ip from controller
const softDelete = async (id, adminId, ip) => {
  // 1. Fetch old state BEFORE deleting
  const user = await getById(id);

  // 2. Soft delete
  await pool.query(
    `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [id],
  );

  // 3. Invalidate sessions
  await pool.query("DELETE FROM sessions WHERE user_id = ?", [id]);

  // 4. Write the audit log
  await log({
    user_id:    adminId,
    action:     "DELETE_USER",
    module:     "users",
    record_id:  id,
    old_value:  { status: user.status, deleted_at: null },
    new_value:  { deleted_at: new Date() },
    ip_address: ip,
  });

  return { message: "User deleted successfully" };
};

const getReportHistory = async (userId) => {
  const [reports] = await pool.query(
    `SELECT 
       r.id, r.reference_number, r.violation_type,
       r.status, r.priority, r.is_anonymous,
       r.created_at,
       b.name AS barangay_name
     FROM reports r
     LEFT JOIN barangays b ON r.barangay_id = b.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`,
    [userId],
  );

  return reports;
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAll,
  getById,
  updateStatus,
  softDelete,
  getReportHistory,
};
