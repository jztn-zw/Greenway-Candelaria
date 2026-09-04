const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const getHandshakeToken = (socket) => {
  const handshakeToken = socket.handshake?.auth?.token;
  const authHeader = socket.handshake?.headers?.authorization;

  if (typeof handshakeToken === "string" && handshakeToken.trim()) {
    return handshakeToken.trim();
  }
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
};

const authenticateSocketUser = async (socket, allowedRoles = null) => {
  const cachedUser = socket.data?.authUser;
  const cachedExpiry = Number(socket.data?.authSessionExpiresAt || 0);
  if (cachedUser && cachedExpiry > Date.now()) {
    return !allowedRoles || allowedRoles.has(cachedUser.role) ? cachedUser : null;
  }

  const token = getHandshakeToken(socket);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT
         u.id,
         u.role,
         u.status,
         u.barangay_id,
         s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?
         AND s.expires_at > NOW()
         AND u.id = ?
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [token, decoded.id],
    );
    const user = rows[0];
    if (!user || user.status === "DEACTIVATED" || user.status === "BANNED") {
      return null;
    }
    if (allowedRoles && !allowedRoles.has(user.role)) return null;

    const expiresAt = new Date(user.expires_at).getTime();
    socket.data.authUser = user;
    socket.data.authSessionExpiresAt = Number.isFinite(expiresAt)
      ? expiresAt
      : Date.now() + 60_000;
    return user;
  } catch {
    return null;
  }
};

module.exports = { authenticateSocketUser };
