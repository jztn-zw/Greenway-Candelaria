const bcrypt = require("bcryptjs");
const { randomBytes } = require("node:crypto");
const { pool } = require("../../config/db");
const hashSessionToken = require("../../utils/hashSessionToken");
const audit = require("../audit/audit.service");

const deleteResident = async (userId, password, token, ip) => {
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
    // Keep the user ID as a tombstone for municipal history, but discard the
    // profile and both credential types. Never physically cascade-delete reports.
    const unusablePassword = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
    await connection.query(
      `UPDATE users SET deleted_at = UTC_TIMESTAMP(), status = 'DEACTIVATED',
       full_name = 'Deleted Resident', username = NULL, email = NULL, phone = NULL,
       avatar_url = NULL, barangay_id = NULL, street_id = NULL, resident_location = NULL, last_login_at = NULL,
       two_factor = 0, password = ?, recovery_code_hash = NULL WHERE id = ?`,
      [unusablePassword, userId],
    );
    await connection.query("DELETE FROM sessions WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM notifications WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM user_settings WHERE user_id = ?", [userId]);
    await audit.logInTransaction(connection, {
      user_id: userId, action: "DELETE_USER", module: "users", record_id: userId, ip_address: ip,
      old_value: { role: user.role, status: "ACTIVE" },
      new_value: { user_name: "Deleted Resident", role: user.role, status: "DELETED", deleted_by: "RESIDENT" },
    });
    await connection.commit();
    return { deleted: true };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};
module.exports = { deleteResident };
