const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { error } = require("../utils/apiResponse");
const hashSessionToken = require("../utils/hashSessionToken");
const { hasNewerSession } = require("../modules/sessions/sessions.service");

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
       WHERE token IN (?, ?) AND user_id = ? AND expires_at > NOW()`,
      [hashSessionToken(token), token, decoded.id],
    );

    if (sessions.length === 0) {
      if (await hasNewerSession(decoded.id, decoded.iat)) {
        return res.status(401).json({ success: false, code: "SESSION_REPLACED",
          message: "You have been signed out because this account was signed in on another browser or device. Sign in again to continue here." });
      }
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
      return error(res, "Account unavailable", 403);
    }

    req.user = user;
    req.token = token;
    req.sessionId = sessions[0].id;

    if (user.role === "RESIDENT" && (user.profile_completed === 0 || user.profile_completed === false) &&
        req.baseUrl !== "/api/auth" && req.baseUrl !== "/api/barangays") {
      return error(res, "Complete your resident profile before continuing", 403);
    }

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
