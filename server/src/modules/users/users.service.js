const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");

const getProfile = async (userId) => {
  const [users] = await pool.query(
    `SELECT 
       u.id, u.full_name, u.username, u.email, u.phone,
       u.role, u.status, u.avatar_url, u.two_factor,
       u.created_at, u.last_login_at,
       b.name AS barangay_name,
       b.id   AS barangay_id,
       bs.id  AS street_id,
       bs.name AS street_name,
       bs.area AS street_area
     FROM users u
     LEFT JOIN barangays b ON u.barangay_id = b.id
     LEFT JOIN barangay_streets bs ON u.street_id = bs.id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [userId],
  );

  if (users.length === 0) {
    throw { statusCode: 404, message: "User not found" };
  }

  return users[0];
};

const updateProfile = async (userId, data) => {
  const fields = [];
  const params = [];

  if (data.full_name) {
    fields.push("full_name = ?");
    params.push(data.full_name);
  }
  if (data.username) {
    const [existingUsers] = await pool.query(
      `SELECT id
       FROM users
       WHERE username = ? AND id <> ?
       LIMIT 1`,
      [data.username, userId]
    );

    if (existingUsers.length > 0) {
      throw { statusCode: 409, message: "Username is already in use" };
    }

    fields.push("username = ?");
    params.push(data.username);
  }
  if (data.phone !== undefined) {
    fields.push("phone = ?");
    params.push(data.phone || null);
  }
  if (data.barangay_id) {
    const [barangays] = await pool.query("SELECT id FROM barangays WHERE id = ?", [
      data.barangay_id,
    ]);
    if (barangays.length === 0) {
      throw { statusCode: 400, message: "Invalid barangay selected" };
    }
    fields.push("barangay_id = ?");
    params.push(data.barangay_id);
    if (data.street_id === undefined) {
      fields.push("street_id = NULL");
    }
  }
  if (data.street_id !== undefined) {
    if (data.street_id) {
      const [streets] = data.barangay_id
        ? await pool.query(
            `SELECT id FROM barangay_streets WHERE id = ? AND barangay_id = ?`,
            [data.street_id, data.barangay_id],
          )
        : await pool.query(
            `SELECT bs.id
             FROM barangay_streets bs
             JOIN users u ON u.id = ?
             WHERE bs.id = ? AND bs.barangay_id = u.barangay_id`,
            [userId, data.street_id],
          );
      if (streets.length === 0) {
        throw { statusCode: 400, message: "Select a street from your barangay" };
      }
    }
    fields.push("street_id = ?");
    params.push(data.street_id || null);
  }
  if (data.avatar_url !== undefined) {
    fields.push("avatar_url = ?");
    params.push(data.avatar_url);
  }
  if (data.two_factor !== undefined) {
    fields.push("two_factor = ?");
    params.push(data.two_factor);
  }

  if (fields.length === 0) {
    return getProfile(userId);
  }

  params.push(userId);

  try {
    await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY" && data.username) {
      throw { statusCode: 409, message: "Username is already in use" };
    }
    throw error;
  }

  if (data.barangay_id) {
    await pool.query(
      `INSERT INTO user_settings (id, user_id, primary_barangay_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE primary_barangay_id = VALUES(primary_barangay_id)`,
      [uuidv4(), userId, data.barangay_id],
    );
  }

  return getProfile(userId);
};

const changePassword = async (userId, { old_password, new_password }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.query(
      "SELECT password FROM users WHERE id = ? AND deleted_at IS NULL FOR UPDATE",
      [userId],
    );
    if (users.length === 0) throw { statusCode: 404, message: "User not found" };
    if (!(await bcrypt.compare(old_password, users[0].password))) {
      throw { statusCode: 400, message: "Current password is incorrect" };
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    await connection.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
    // A password change invalidates every existing token, including other devices.
    await connection.query("DELETE FROM sessions WHERE user_id = ?", [userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  auditService.log({
    user_id: userId,
    action: "CHANGE_PASSWORD",
    module: "auth",
    record_id: userId,
    new_value: { changed: true },
  }).catch(() => {});

  return { message: "Password updated successfully" };
};

const getAll = async (filters = {}) => {
  const {
    role,
    status,
    barangay_id,
    search,
    page = 1,
    limit = 10,
  } = filters;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = ["u.deleted_at IS NULL"];
  const params = [];

  if (role) {
    where.push("u.role = ?");
    params.push(role);
  }
  if (status) {
    where.push("u.status = ?");
    params.push(status);
  }
  if (barangay_id) {
    where.push("u.barangay_id = ?");
    params.push(barangay_id);
  }
  if (search) {
    where.push("(u.full_name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = where.join(" AND ");

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM users u 
    LEFT JOIN barangays b ON u.barangay_id = b.id 
    WHERE ${whereClause}
  `;
  const [[{ total }]] = await pool.query(countQuery, params);

  const selectQuery = `
    SELECT 
      u.id, u.full_name, u.username, u.email, u.phone,
      u.role, u.status, u.avatar_url, u.created_at, u.last_login_at,
      b.name AS barangay_name,
      (SELECT COUNT(*) FROM reports r WHERE r.user_id = u.id) AS reports_count
    FROM users u
    LEFT JOIN barangays b ON u.barangay_id = b.id
    WHERE ${whereClause}
    ORDER BY u.created_at DESC 
    LIMIT ? OFFSET ?
  `;

  const [users] = await pool.query(selectQuery, [...params, parseInt(limit), parseInt(offset)]);

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

// ✅ Status update with complete actor and target user info in audit log
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
    status === "ACTIVE"      ? "UNBAN_USER"      : "UPDATE_USER_STATUS";

  // 5. Write the audit log with rich target details
  await auditService.log({
    user_id:    adminId,
    action,
    module:     "users",
    record_id:  id,
    old_value:  { user_name: oldUser.full_name, email: oldUser.email, role: oldUser.role, status: oldUser.status, ban_reason: oldUser.ban_reason },
    new_value:  { user_name: oldUser.full_name, email: oldUser.email, role: oldUser.role, status, ban_reason: ban_reason || null },
    ip_address: ip,
  });

  return getById(id);
};

// ✅ Soft delete with complete actor and target user info in audit log
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

  // 4. Write the audit log with rich target details
  await auditService.log({
    user_id:    adminId,
    action:     "DELETE_USER",
    module:     "users",
    record_id:  id,
    old_value:  { user_name: user.full_name, email: user.email, role: user.role, status: user.status },
    new_value:  { user_name: user.full_name, email: user.email, role: user.role, status: "DELETED" },
    ip_address: ip,
  });

  return { message: "User deleted successfully" };
};

const getReportHistory = async (userId) => {
  const [reports] = await pool.query(
    `SELECT 
       r.id, r.reference_number, r.violation_type,
       r.status,
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

// ─── User Settings ────────────────────────────────────────────────────────────
const getUserSettings = async (userId) => {
  // Try to fetch existing settings
  const [rows] = await pool.query(
    "SELECT * FROM user_settings WHERE user_id = ?",
    [userId],
  );

  if (rows.length > 0) return { ...rows[0], reminder_timing: "3h" };

  // Auto-create default settings row for new users
  const id = uuidv4();
  await pool.query(
    `INSERT INTO user_settings (id, user_id) VALUES (?, ?)`,
    [id, userId],
  );

  const [newRows] = await pool.query(
    "SELECT * FROM user_settings WHERE user_id = ?",
    [userId],
  );
  return { ...newRows[0], reminder_timing: "3h" };
};

const updateUserSettings = async (userId, data) => {
  const allowed = [
    "notif_collection_reminders",
    "notif_truck_near",
    "notif_collection_done",
    "notif_collection_skipped",
    "notif_report_updates",
    "notif_new_content",
    "notif_announcements",
    "primary_barangay_id",
    "reminder_on",
    "reminder_timing",
  ];

  const fields = [];
  const params = [];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      params.push(data[key]);
    }
  }

  // Sync primary_barangay_id → users.barangay_id
  if (data.primary_barangay_id !== undefined) {
    if (data.primary_barangay_id) {
      const [barangays] = await pool.query("SELECT id FROM barangays WHERE id = ?", [
        data.primary_barangay_id,
      ]);
      if (barangays.length === 0) {
        throw { statusCode: 400, message: "Invalid barangay selected" };
      }
    }
    await pool.query("UPDATE users SET barangay_id = ? WHERE id = ?", [
      data.primary_barangay_id || null,
      userId,
    ]);
  }

  if (fields.length > 0) {
    params.push(userId);
    await pool.query(
      `UPDATE user_settings SET ${fields.join(", ")} WHERE user_id = ?`,
      params,
    );
  }

  return getUserSettings(userId);
};

const adminPreferenceColumns = [
  "notif_admin_reports",
  "notif_admin_route_issues",
  "notif_admin_driver_messages",
];

const getAdminSettings = async (userId) => {
  const [rows] = await pool.query(
    `SELECT ${adminPreferenceColumns.map((column) => `COALESCE(${column}, 1) AS ${column}`).join(", ")}
     FROM user_settings WHERE user_id = ?`,
    [userId],
  );
  return Object.fromEntries(adminPreferenceColumns.map((column) => [column, rows.length ? Boolean(rows[0][column]) : true]));
};

const updateAdminSettings = async (userId, data) => {
  const columns = adminPreferenceColumns.filter((column) => data[column] !== undefined);
  if (columns.length === 0) throw { statusCode: 400, message: "At least one alert preference is required" };
  await pool.query(
    `INSERT INTO user_settings (id, user_id, ${columns.join(", ")})
     VALUES (?, ?, ${columns.map(() => "?").join(", ")})
     ON DUPLICATE KEY UPDATE ${columns.map((column) => `${column} = VALUES(${column})`).join(", ")}`,
    [uuidv4(), userId, ...columns.map((column) => data[column])],
  );
  return getAdminSettings(userId);
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
  getUserSettings,
  updateUserSettings,
  getAdminSettings,
  updateAdminSettings,
};
