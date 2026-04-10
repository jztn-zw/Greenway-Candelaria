const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const queryWithRetry = require("../../utils/queryWithRetry");
const generateId = require("../../utils/generateId");

// 🌟 IMPORT OUR NEW SESSION SERVICE
const SessionService = require("../sessions/sessions.service");

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
  // Find user
  const [users] = await queryWithRetry(
    `SELECT u.*, b.name AS barangay_name
     FROM users u
     LEFT JOIN barangays b ON b.id = u.barangay_id
     WHERE (u.email = ? OR u.username = ?) AND u.deleted_at IS NULL`,
    [identifier, identifier],
  );

  if (users.length === 0) {
    throw { statusCode: 401, message: "Invalid email or password" };
  }

  const user = users[0];

  // Check status
  if (user.status === "DEACTIVATED") {
    throw { statusCode: 403, message: "Account is deactivated" };
  }
  if (user.status === "BANNED") {
    throw {
      statusCode: 403,
      message: `Account is banned. Reason: ${user.ban_reason}`,
    };
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
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
    device: req.headers["user-agent"],
    ip: req.ip,
    expiresAt,
  });
  await queryWithRetry("UPDATE users SET last_login_at = NOW() WHERE id = ?", [
    user.id,
  ]);

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
    "SELECT truck_id FROM drivers WHERE user_id = ?",
    [userId],
  );

  const truckId = driverRows[0]?.truck_id;
  if (!truckId) return;

  await queryWithRetry("UPDATE trucks SET status = 'OFFLINE' WHERE id = ?", [truckId]);
};

const getMe = async (userId) => {
  const [users] = await queryWithRetry(
    `SELECT
      u.id, u.full_name, u.username, u.email, u.phone, u.role, u.status,
      u.avatar_url, u.barangay_id, b.name AS barangay_name, u.two_factor, u.created_at
     FROM users u
     LEFT JOIN barangays b ON b.id = u.barangay_id
     WHERE u.id = ?`,
    [userId],
  );

  if (users.length === 0) {
    throw { statusCode: 404, message: "User not found" };
  }

  return users[0];
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};

