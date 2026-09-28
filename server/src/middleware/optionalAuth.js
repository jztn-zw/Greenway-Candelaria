const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const hashSessionToken = require("../utils/hashSessionToken");

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await pool.query(
      `SELECT u.id, u.role, u.status, u.barangay_id
       FROM users u
       JOIN sessions s ON s.user_id = u.id
       WHERE u.id = ?
         AND u.deleted_at IS NULL
         AND u.status = 'ACTIVE'
         AND s.token IN (?, ?)
         AND s.expires_at > NOW()
       LIMIT 1`,
      [decoded.id, hashSessionToken(token), token],
    );
    req.user = users[0] || null;
  } catch {
    req.user = null;
  }

  next();
};
