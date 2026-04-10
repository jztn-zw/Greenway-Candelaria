const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { error } = require("../utils/apiResponse");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return error(res, "No token provided", 401);
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if session exists and not expired
    const [sessions] = await pool.query(
      `SELECT * FROM sessions 
       WHERE token = ? AND expires_at > NOW()`,
      [token],
    );

    if (sessions.length === 0) {
      return error(res, "Session expired or invalid", 401);
    }

    // Get user
    const [users] = await pool.query(
      `SELECT * FROM users 
       WHERE id = ? AND deleted_at IS NULL`,
      [decoded.id],
    );

    if (users.length === 0) {
      return error(res, "User not found", 401);
    }

    const user = users[0];

    if (user.status === "DEACTIVATED") {
      return error(res, "Account is deactivated", 403);
    }

    if (user.status === "BANNED") {
      return error(res, `Account is banned. Reason: ${user.ban_reason}`, 403);
    }

    req.user = user;
    req.token = token;

    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return error(res, "Invalid token", 401);
    }
    if (err.name === "TokenExpiredError") {
      return error(res, "Token expired", 401);
    }
    next(err);
  }
};

module.exports = authenticate;
