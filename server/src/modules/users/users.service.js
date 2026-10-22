const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");
const { validateResidentLocation } = require("./residentLocation");
const { updateProfileSchema } = require("./users.schema");

// Serialize settings creation and area writes with account deletion. A request
// authenticated on another device may still be waiting when deletion commits.
const withActiveAccount = async (userId, operation) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [owners] = await connection.query(
      "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL AND status = 'ACTIVE' FOR UPDATE", [userId],
    );
    if (!owners.length) throw { statusCode: 403, message: "Account unavailable" };
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};

const getProfile = async (userId) => {
  const [users] = await pool.query(
    `SELECT 
       u.id, u.full_name, u.username, u.email, u.phone,
       u.role, u.status, u.avatar_url, u.two_factor, u.resident_location,
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
  if (data.resident_location !== undefined) {
    const address = updateProfileSchema.parse(data);
    await withActiveAccount(userId, async connection => {
      const [[owner]] = await connection.query("SELECT role FROM users WHERE id = ?", [userId]);
      if (owner?.role !== "RESIDENT") throw { statusCode: 403, message: "Collection locations are available for resident accounts only" };
      const [[street]] = await connection.query(
        "SELECT id, barangay_id, coverage_path, coverage_edit FROM barangay_streets WHERE id = ? AND barangay_id = ? FOR UPDATE",
        [address.street_id, address.barangay_id],
      );
      const location = validateResidentLocation(address.resident_location, street);
      await connection.query("UPDATE users SET barangay_id = ?, street_id = ?, resident_location = ? WHERE id = ? AND deleted_at IS NULL",
        [address.barangay_id, address.street_id, JSON.stringify(location), userId]);
      await connection.query(
        "INSERT INTO user_settings (id, user_id, primary_barangay_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE primary_barangay_id = VALUES(primary_barangay_id)",
        [uuidv4(), userId, address.barangay_id],
      );
    });
    return getProfile(userId);
  }
  const fields = [];
  const params = [];

  // Optional onboarding coordinates cannot follow a later address change.
  // Evaluate the original address before assigning any new IDs below.
  if (data.barangay_id || data.street_id !== undefined) {
    const matches = [];
    if (data.barangay_id) { matches.push('barangay_id <=> ?'); params.push(data.barangay_id); }
    if (data.street_id !== undefined || data.barangay_id) { matches.push('street_id <=> ?'); params.push(data.street_id || null); }
    fields.push(`resident_location = CASE WHEN ${matches.map(value => `(${value})`).join(' AND ')} THEN resident_location ELSE NULL END`);
  }

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
  if (data.email !== undefined) {
    const [owners] = await pool.query("SELECT role FROM users WHERE id = ? AND deleted_at IS NULL", [userId]);
    if (owners[0]?.role !== "RESIDENT") throw { statusCode: 403, message: "Contact email changes are available for resident accounts only" };
    fields.push("email = ?");
    params.push(data.email || null);
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
    if (error.code === "ER_DUP_ENTRY" && data.email !== undefined && /email/i.test(error.sqlMessage || error.message || ""))
      throw { statusCode: 409, message: "Email is already in use", field: "email" };
    if (error.code === "ER_DUP_ENTRY" && data.username) {
      throw { statusCode: 409, message: "Username is already in use" };
    }
    throw error;
  }

  if (data.barangay_id) {
    await withActiveAccount(userId, (connection) => connection.query(
      `INSERT INTO user_settings (id, user_id, primary_barangay_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE primary_barangay_id = VALUES(primary_barangay_id)`,
      [uuidv4(), userId, data.barangay_id],
    ));
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
      u.role, u.status, u.profile_completed, u.avatar_url, u.created_at, u.last_login_at,
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

const getDeletedResidentCount = async () => {
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'RESIDENT' AND deleted_at IS NOT NULL",
  );
  return Number(total || 0);
};

const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT 
       u.id, u.full_name, u.username, u.email, u.phone,
       u.role, u.status, u.profile_completed, u.ban_reason, u.avatar_url,
       u.two_factor, u.created_at, u.last_login_at,
       b.name AS barangay_name,
       b.id   AS barangay_id,
       bs.name AS street_name
     FROM users u
     LEFT JOIN barangays b ON u.barangay_id = b.id
     LEFT JOIN barangay_streets bs ON u.street_id = bs.id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "User not found" };
  }

  return rows[0];
};

// Keep account access, session revocation, and the audit outcome atomic.
const updateStatus = async (id, { status, ban_reason }, adminId, ip) => {
  const reason = status === "BANNED" && typeof ban_reason === "string" ? ban_reason.trim() : null;
  if (!["ACTIVE", "DEACTIVATED", "BANNED"].includes(status)) {
    throw { statusCode: 400, message: "Invalid account status" };
  }
  if (status === "BANNED" && (!reason || reason.length > 255)) {
    throw { statusCode: 400, message: "A ban reason of 1 to 255 characters is required" };
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT id, full_name, email, role, status, ban_reason FROM users WHERE id = ? AND deleted_at IS NULL FOR UPDATE", [id],
    );
    const oldUser = rows[0];
    if (!oldUser) throw { statusCode: 404, message: "User not found" };
    if (oldUser.role === "RESIDENT") {
      if (status === "DEACTIVATED") {
        throw { statusCode: 400, message: "Residents manage their own account deactivation" };
      }
      if (oldUser.status === "DEACTIVATED") {
        throw { statusCode: 409, message: "Deactivated resident accounts are read-only in Resident Manager" };
      }
    }
    // Repeated requests preserve the first outcome and its original reason.
    if (oldUser.status !== status) {
      await connection.query("UPDATE users SET status = ?, ban_reason = ? WHERE id = ?", [status, reason, id]);
      if (status !== "ACTIVE") await connection.query("DELETE FROM sessions WHERE user_id = ?", [id]);
      const action = status === "BANNED" ? "BAN_USER" : status === "DEACTIVATED" ? "DEACTIVATE_USER" : "UNBAN_USER";
      await auditService.logInTransaction(connection, {
        user_id: adminId, action, module: "users", record_id: id,
        old_value: { user_name: oldUser.full_name, email: oldUser.email, role: oldUser.role, status: oldUser.status, ban_reason: oldUser.ban_reason },
        new_value: { user_name: oldUser.full_name, email: oldUser.email, role: oldUser.role, status, ban_reason: reason },
        ip_address: ip,
      });
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
  return getById(id);
};

// ✅ Soft delete with complete actor and target user info in audit log
const softDelete = async (id, adminId, ip) => {
  // 1. Fetch old state BEFORE deleting
  const user = await getById(id);

  // 2. Soft delete
  await pool.query(
    `UPDATE users SET resident_location = NULL, deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
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
const readUserSettings = async (connection, userId) => {
  // Try to fetch existing settings
  const [rows] = await connection.query(
    "SELECT * FROM user_settings WHERE user_id = ?",
    [userId],
  );

  if (rows.length > 0) return { ...rows[0], reminder_timing: "3h" };

  // Auto-create default settings row for new users
  const id = uuidv4();
  await connection.query(
    `INSERT INTO user_settings (id, user_id) VALUES (?, ?)`,
    [id, userId],
  );

  const [newRows] = await connection.query(
    "SELECT * FROM user_settings WHERE user_id = ?",
    [userId],
  );
  return { ...newRows[0], reminder_timing: "3h" };
};

const getUserSettings = (userId) => withActiveAccount(userId, (connection) => readUserSettings(connection, userId));

const updateUserSettings = (userId, data) => withActiveAccount(userId, async (connection) => {
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
      const [barangays] = await connection.query("SELECT id FROM barangays WHERE id = ?", [
        data.primary_barangay_id,
      ]);
      if (barangays.length === 0) {
        throw { statusCode: 400, message: "Invalid barangay selected" };
      }
    }
    // Evaluate the previous barangay before assigning the new one. Re-saving
    // the same barangay keeps its street; changing or clearing it cannot leave
    // an address pointing to a street in another barangay.
    await connection.query("UPDATE users SET resident_location = CASE WHEN barangay_id <=> ? THEN resident_location ELSE NULL END, street_id = CASE WHEN barangay_id <=> ? THEN street_id ELSE NULL END, barangay_id = ? WHERE id = ? AND deleted_at IS NULL", [
      data.primary_barangay_id || null,
      data.primary_barangay_id || null,
      data.primary_barangay_id || null,
      userId,
    ]);
  }

  if (fields.length > 0) {
    await readUserSettings(connection, userId);
    params.push(userId);
    await connection.query(
      `UPDATE user_settings SET ${fields.join(", ")} WHERE user_id = ?`,
      params,
    );
  }

  return readUserSettings(connection, userId);
});

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
  getDeletedResidentCount,
  getById,
  updateStatus,
  softDelete,
  getReportHistory,
  getUserSettings,
  updateUserSettings,
  getAdminSettings,
  updateAdminSettings,
};
