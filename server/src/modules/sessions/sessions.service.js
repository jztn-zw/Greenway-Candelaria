const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const hashSessionToken = require("../../utils/hashSessionToken");

const createSession = async ({ userId, token, device, ip, expiresAt }) => {
  const id = generateId();
  await pool.query(
    `INSERT INTO sessions (id, user_id, token, device, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, hashSessionToken(token), device || null, ip || null, expiresAt],
  );
};

const revokeSession = async (token) => {
  const hashedToken = hashSessionToken(token);
  // Raw-token matching keeps sessions issued before this change valid until
  // they naturally expire. All sessions created from now on are hashed.
  await pool.query("DELETE FROM sessions WHERE token IN (?, ?)", [hashedToken, token]);
};

const getMySessions = async (userId) => {
  const [sessions] = await pool.query(
    `SELECT id, device, ip_address, created_at, expires_at
     FROM sessions
     WHERE user_id = ? AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId],
  );
  return sessions;
};

const deleteOne = async (sessionId, userId) => {
  const [rows] = await pool.query(
    "SELECT id FROM sessions WHERE id = ? AND user_id = ?",
    [sessionId, userId],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Session not found" };
  }

  await pool.query("DELETE FROM sessions WHERE id = ?", [sessionId]);
};

const deleteAll = async (userId, currentToken) => {
  const hashedToken = hashSessionToken(currentToken);
  await pool.query("DELETE FROM sessions WHERE user_id = ? AND token NOT IN (?, ?)", [
    userId,
    hashedToken,
    currentToken,
  ]);
};

module.exports = {
  createSession,
  revokeSession,
  getMySessions,
  deleteOne,
  deleteAll,
};
