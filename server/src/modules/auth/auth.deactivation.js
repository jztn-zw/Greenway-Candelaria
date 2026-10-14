const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const hashSessionToken = require("../../utils/hashSessionToken");
const audit = require("../audit/audit.service");

const deactivateResident = async (userId, password, token, ip) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT id, full_name, password, role, status, deleted_at FROM users WHERE id = ? FOR UPDATE", [userId]);
    const user = rows[0];
    if (!user || user.deleted_at) throw { statusCode: 404, message: "Account unavailable" };
    if (user.role !== "RESIDENT" || user.status !== "ACTIVE") throw { statusCode: 403, message: "Account unavailable" };
    const [sessions] = await connection.query(
      "SELECT user_id FROM sessions WHERE user_id = ? AND token IN (?, ?) AND expires_at > NOW() LIMIT 1",
      [userId, hashSessionToken(token), token],
    );
    if (!sessions.length) throw { statusCode: 401, message: "Session expired or invalid" };
    if (!(await bcrypt.compare(password, user.password))) throw { statusCode: 400, message: "Current password is incorrect" };
    await connection.query("UPDATE users SET status = 'DEACTIVATED', self_deactivated_at = UTC_TIMESTAMP(3) WHERE id = ?", [userId]);
    await connection.query("DELETE FROM sessions WHERE user_id = ?", [userId]);
    await audit.logInTransaction(connection, {
      user_id: userId, action: "DEACTIVATE_USER", module: "users", record_id: userId, ip_address: ip,
      old_value: { user_name: user.full_name, role: user.role, status: "ACTIVE" },
      new_value: { user_name: user.full_name, role: user.role, status: "DEACTIVATED", deactivated_by: "RESIDENT" },
    });
    await connection.commit();
    return { deactivated: true };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};
module.exports = { deactivateResident };
