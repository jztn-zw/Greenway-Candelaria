const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const queryWithRetry = require("../../utils/queryWithRetry");
const generateId = require("../../utils/generateId");
const SessionService = require("../sessions/sessions.service");
const auditService = require("../audit/audit.service");

const register = async ({
  full_name,
  username,
  email,
  password,
  phone,
  barangay_id,
}) => {
  // Check if email already exists
  const [existingEmail] = await queryWithRetry(
    "SELECT id FROM users WHERE email = ?",
    [email],
  );
  if (existingEmail.length > 0) {
    throw { statusCode: 409, message: "Email already in use" };
  }

  // Check if username already exists
  const [existingUsername] = await queryWithRetry(
    "SELECT id FROM users WHERE username = ?",
    [username],
  );
  if (existingUsername.length > 0) {
    throw { statusCode: 409, message: "Username already taken" };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);
  const id = generateId();

  // Ensure submitted barangay exists.
  const [barangayRows] = await queryWithRetry(
    "SELECT id FROM barangays WHERE id = ?",
    [barangay_id],
  );
  if (barangayRows.length === 0) {
    throw { statusCode: 400, message: "Invalid barangay selected" };
  }

  // Insert user
  await queryWithRetry(
    `INSERT INTO users 
     (id, full_name, username, email, password, phone, barangay_id, role)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'RESIDENT')`,
    [
      id,
      full_name,
      username,
      email,
      hashedPassword,
      phone || null,
      barangay_id,
    ],
  );

  return { id, full_name, username, email, role: "RESIDENT" };
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
    `SELECT u.*, b.name AS barangay_name
     FROM users u
     LEFT JOIN barangays b ON b.id = u.barangay_id
     WHERE (u.email = ? OR u.username = ?) AND u.deleted_at IS NULL`,
    [identifier, identifier],
  );

  if (users.length === 0) {
    auditService.log({
      user_id: null,
      action: "FAILED_LOGIN",
      module: "auth",
      ...loginContext,
      new_value: { ...loginContext.new_value, reason: "Invalid credentials" },
    }).catch(() => {});
    throw { statusCode: 401, message: "Invalid email or password" };
  }

  const user = users[0];

  // Check status
  if (user.status === "DEACTIVATED") {
    auditService.log({
      user_id: user.id,
      action: "FAILED_LOGIN",
      module: "auth",
      record_id: user.id,
      ...loginContext,
      new_value: { ...loginContext.new_value, role: user.role, reason: "Account deactivated" },
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
      // Keep account-management notes private; the admin can still see the
      // reason in the back office, but it must not be exposed at login.
      message: "Account unavailable",
    };
  }

  // Verify password
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
    throw { statusCode: 401, message: "Invalid email or password" };
  }

  // Generate token
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await SessionService.createSession({
    userId: user.id,
    token,
    device: req?.headers ? req.headers["user-agent"] : null,
    ip: req?.ip,
    expiresAt,
  });
  await queryWithRetry("UPDATE users SET last_login_at = NOW() WHERE id = ?", [
    user.id,
  ]);

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
    user: {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar_url: user.avatar_url,
      barangay_id: user.barangay_id,
      barangay_name: user.barangay_name || null,
    },
  };
};

const logout = async (token, userId) => {
  await SessionService.revokeSession(token);

  if (!userId) return;

  const [driverRows] = await queryWithRetry(
    "SELECT id, truck_id FROM drivers WHERE user_id = ?",
    [userId],
  );

  if (driverRows.length > 0 && driverRows[0].truck_id) {
    await queryWithRetry("UPDATE trucks SET status = 'OFFLINE' WHERE id = ?", [
      driverRows[0].truck_id,
    ]);
  }
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
    `SELECT u.id, u.full_name, u.username, u.email, u.role, u.status,
            u.avatar_url, u.phone, u.barangay_id, u.last_login_at,
            b.name AS barangay_name
     FROM users u
     LEFT JOIN barangays b ON b.id = u.barangay_id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [userId],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "User not found" };
  }

  return rows[0];
};

module.exports = { register, login, logout, changePassword, getMe };
