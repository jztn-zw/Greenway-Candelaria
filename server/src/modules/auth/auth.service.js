const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const queryWithRetry = require("../../utils/queryWithRetry");
const generateId = require("../../utils/generateId");
const { avatarUrlForAccount } = require("../../utils/profileAvatar");
const SessionService = require("../sessions/sessions.service");
const auditService = require("../audit/audit.service");
const { createRecoveryCode, recoverPassword, replaceRecoveryCode } = require("./auth.recovery");
const { pool } = require("../../config/db");
const { deleteResident } = require("./auth.deletion");
const { emitAdminDataChanged } = require("../../sockets/adminChanges.socket");
const { emitSessionsReplaced } = require("../../sockets/session.socket");

const register = async ({
  full_name,
  username,
  email,
  password,
  phone,
  barangay_id,
  street_id,
}) => {
  email = typeof email === "string" ? email.trim().toLowerCase() || null : null;
  const completed = Boolean(full_name && username);
  // Check if email already exists
  const [existingEmail] = email ? await queryWithRetry(
    "SELECT id FROM users WHERE email = ?",
    [email],
  ) : [[]];
  if (existingEmail.length > 0) {
    throw { statusCode: 409, message: "Email already in use" };
  }

  // Check if username already exists
  const [existingUsername] = username ? await queryWithRetry(
    "SELECT id FROM users WHERE username = ?",
    [username],
  ) : [[]];
  if (existingUsername.length > 0) {
    throw { statusCode: 409, message: "Username already taken", field: "username" };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);
  const id = generateId();
  const avatarUrl = avatarUrlForAccount(id);
  const recovery = createRecoveryCode();

  // Ensure submitted barangay exists.
  const [barangayRows] = completed ? await queryWithRetry(
    "SELECT id FROM barangays WHERE id = ?",
    [barangay_id],
  ) : [[]];
  if (completed && barangayRows.length === 0) {
    throw { statusCode: 400, message: "Invalid barangay selected" };
  }

  if (street_id) {
    const [streetRows] = await queryWithRetry(
      "SELECT id FROM barangay_streets WHERE id = ? AND barangay_id = ? AND deleted_at IS NULL",
      [street_id, barangay_id],
    );
    if (streetRows.length === 0) {
      throw { statusCode: 400, message: "Invalid street selected for this barangay" };
    }
  }

  // Insert user
  try { await queryWithRetry(
    `INSERT INTO users 
     (id, full_name, username, email, password, phone, barangay_id, street_id, avatar_url, recovery_code_hash, role, profile_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RESIDENT', ?)`,
    [
      id,
      full_name || null,
      username || null,
      email,
      hashedPassword,
      phone || null,
      barangay_id || null,
      street_id || null,
      avatarUrl,
      recovery.hash,
      completed ? 1 : 0,
    ],
  ); } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const emailConflict = email && /email/i.test(error.sqlMessage || error.message || "");
      throw { statusCode: 409, message: emailConflict ? "Email already in use" : "Username already taken", field: emailConflict ? "email" : "username" };
    }
    throw error;
  }

  return { id, full_name: full_name || "", username: username || "", email, avatar_url: avatarUrl, role: "RESIDENT", profile_completed: completed, recovery_code: recovery.code };
};

const login = async ({ identifier, password }, req) => {
  const loginContext = {
    ip_address: req?.ip || null,
    new_value: {
      request_id: req?.requestId || null,
      device: String(req?.headers?.["user-agent"] || "Unknown device").slice(0, 255),
    },
  };

  // Find user
  const [users] = await queryWithRetry(
    `SELECT u.*, b.name AS barangay_name, bs.name AS street_name, bs.area AS street_area
     FROM users u
     LEFT JOIN barangays b ON b.id = u.barangay_id
     LEFT JOIN barangay_streets bs ON bs.id = u.street_id
     WHERE u.username = ? AND u.deleted_at IS NULL`,
    [identifier],
  );

  if (users.length === 0) {
    auditService.log({
      user_id: null,
      action: "FAILED_LOGIN",
      module: "auth",
      ...loginContext,
      new_value: { ...loginContext.new_value, reason: "Invalid credentials" },
    }).catch(() => {});
    throw { statusCode: 401, message: "Invalid username or password" };
  }

  const user = users[0];

  // Verify the password before exposing account status to avoid username probing.
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    auditService.log({
      user_id: user.id,
      action: "FAILED_LOGIN",
      module: "auth",
      record_id: user.id,
      ...loginContext,
      new_value: { ...loginContext.new_value, role: user.role, reason: "Invalid credentials" },
    }).catch(() => {});
    throw { statusCode: 401, message: "Invalid username or password" };
  }

  // Keep account-management notes private; only a verified account owner sees
  // a status message, and the admin's ban reason stays in the back office.
  if (user.status === "DEACTIVATED" && !(user.role === "RESIDENT" && user.self_deactivated_at)) {
    auditService.log({
      user_id: user.id,
      action: "FAILED_LOGIN",
      module: "auth",
      record_id: user.id,
      ...loginContext,
      new_value: { ...loginContext.new_value, role: user.role, reason: "Account deleted" },
    }).catch(() => {});
    throw { statusCode: 403, message: "Account is deactivated" };
  }
  if (user.status === "BANNED") {
    auditService.log({
      user_id: user.id,
      action: "FAILED_LOGIN",
      module: "auth",
      record_id: user.id,
      ...loginContext,
      new_value: { ...loginContext.new_value, role: user.role, reason: "Account unavailable" },
    }).catch(() => {});
    throw {
      statusCode: 403,
      message: "Your account is currently restricted. Please contact MENRO for assistance.",
    };
  }

  return createLoginSession(user, req, loginContext);
};

const createLoginSession = async (user, req, loginContext) => {
  // Recovery/password changes lock this same row before revoking sessions.
  // A login verified before a reset must not issue a session after it commits.
  const connection = await pool.getConnection();
  let token;
  let reactivated = false;
  let previousTokens = [];
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      // Reading the optional marker through * also preserves active logins
      // while the additive migration is being deployed.
      "SELECT * FROM users WHERE id = ? FOR UPDATE", [user.id],
    );
    const current = rows[0];
    if (!current || current.deleted_at) throw { statusCode: 403, message: "Account unavailable" };
    const selfReactivation = current.role === "RESIDENT" && current.status === "DEACTIVATED" && current.self_deactivated_at
      && user.status === "DEACTIVATED" && user.role === "RESIDENT"
      && String(user.self_deactivated_at) === String(current.self_deactivated_at);
    if (current.status !== "ACTIVE" && !selfReactivation) throw { statusCode: 403, message: "Account unavailable" };
    if (typeof user.password === "string" && user.password !== current.password) throw { statusCode: 401, message: "Account changed. Please sign in again." };
    if (selfReactivation) {
      await connection.query("UPDATE users SET status = 'ACTIVE', self_deactivated_at = NULL WHERE id = ?", [user.id]);
      await connection.query("DELETE FROM sessions WHERE user_id = ?", [user.id]);
      await auditService.logInTransaction(connection, {
        user_id: user.id, action: "REACTIVATE_USER", module: "users", record_id: user.id, ip_address: req?.ip || null,
        old_value: { user_name: current.full_name, role: current.role, status: "DEACTIVATED" },
        new_value: { user_name: current.full_name, role: current.role, status: "ACTIVE" },
      });
      current.status = "ACTIVE";
      reactivated = true;
    }
    user.role = current.role;
    user.status = current.status;
    if (current.profile_completed !== undefined) user.profile_completed = current.profile_completed;
    token = jwt.sign({ id: user.id, role: user.role, jti: generateId() }, process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = { userId: user.id, token,
      device: req?.headers?.["user-agent"], ip: req?.ip, expiresAt };
    if (user.role === "ADMIN") previousTokens = await SessionService.replaceSessions(session, connection);
    else await SessionService.createSession(session, connection);
    await connection.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }

  void emitSessionsReplaced(previousTokens);

  if (reactivated) emitAdminDataChanged(["residents", "dashboard", "analytics", "audit"], { residents: false, collectors: false });

  if (user.role !== "RESIDENT") {
    auditService.log({
      user_id: user.id,
      action: "USER_LOGIN",
      module: "auth",
      record_id: user.id,
      ...loginContext,
      new_value: { ...loginContext.new_value, role: user.role },
    }).catch(() => {});
  }

  return {
    token,
    ...(reactivated ? { reactivated: true } : {}),
    // Setup may have completed since the credential lookup. Return one fresh
    // public profile instead of mixing the locked flag with the old area/name.
    user: await getMe(user.id),
  };
};

const logout = async (token, userId) => {
  await SessionService.revokeSession(token);
  // Truck state follows its route and accepted GPS, not another device's logout.
};

const changePassword = async (userId, { current_password, new_password }) => {
  const [users] = await queryWithRetry(
    "SELECT password FROM users WHERE id = ?",
    [userId],
  );
  if (users.length === 0) {
    throw { statusCode: 404, message: "User not found" };
  }

  const isMatch = await bcrypt.compare(current_password, users[0].password);
  if (!isMatch) {
    throw { statusCode: 400, message: "Current password is incorrect" };
  }

  const hashedPassword = await bcrypt.hash(new_password, 12);
  await queryWithRetry("UPDATE users SET password = ? WHERE id = ?", [
    hashedPassword,
    userId,
  ]);

  auditService.log({
    user_id: userId,
    action: "CHANGE_PASSWORD",
    module: "auth",
    record_id: userId,
    new_value: { changed: true },
  }).catch(() => {});
};

const getMe = async (userId) => {
  const [rows] = await queryWithRetry(
    `SELECT u.id, u.full_name, u.username, u.email, u.role, u.status, u.profile_completed,
            u.avatar_url, u.phone, u.barangay_id, u.street_id, u.last_login_at,
            b.name AS barangay_name, bs.name AS street_name, bs.area AS street_area
     FROM users u
     LEFT JOIN barangays b ON b.id = u.barangay_id
     LEFT JOIN barangay_streets bs ON bs.id = u.street_id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [userId],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "User not found" };
  }

  const user = rows[0];
  return {
    id: user.id, full_name: user.full_name || "", username: user.username || "",
    email: user.email, role: user.role, status: user.status,
    avatar_url: user.avatar_url || null, phone: user.phone || null,
    barangay_id: user.barangay_id || null, barangay_name: user.barangay_name || null,
    street_id: user.street_id || null, street_name: user.street_name || null,
    street_area: user.street_area || null, last_login_at: user.last_login_at || null,
    profile_completed: user.profile_completed !== 0 && user.profile_completed !== false,
  };
};

const completeResidentProfile = async (userId, data) => {
  await require('./auth.setup').completeResidentProfile(userId, data);
  return getMe(userId);
};
module.exports = { register, login, logout, changePassword, getMe, recoverPassword, replaceRecoveryCode, completeResidentProfile, deleteResident };
