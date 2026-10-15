const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../../config/db');

const hashRecoveryCode = code => createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');
const createRecoveryCode = () => {
  const code = randomBytes(16).toString('hex').toUpperCase().match(/.{4}/g).join('-');
  return { code, hash: hashRecoveryCode(code) };
};
const unavailable = () => ({ statusCode: 401, message: 'Account or recovery code could not be verified.' });
const isAvailable = user => user && user.status === 'ACTIVE' && !user.deleted_at;

const recoverPassword = async ({ recovery_code, new_password }) => {
  const hash = hashRecoveryCode(recovery_code);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Lock the code owner so concurrent attempts cannot consume the same code.
    const [users] = await connection.query(
      // * tolerates installations without the retired self-deactivation marker.
      'SELECT * FROM users WHERE recovery_code_hash = ? LIMIT 2 FOR UPDATE',
      [hash],
    );
    if (users.length !== 1) throw unavailable();
    const user = users[0];
    const selfDeactivated = user && !user.deleted_at && user.role === 'RESIDENT'
      && user.status === 'DEACTIVATED' && user.self_deactivated_at;
    // Recovery changes credentials only. Reactivation still requires a normal login.
    if ((!isAvailable(user) && !selfDeactivated) || !/^[a-f0-9]{64}$/.test(user.recovery_code_hash || '') ||
        !timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.recovery_code_hash, 'hex'))) throw unavailable();
    const next = createRecoveryCode();
    const password = await bcrypt.hash(new_password, 12);
    await connection.query('UPDATE users SET password = ?, recovery_code_hash = ? WHERE id = ?', [password, next.hash, user.id]);
    await connection.query('DELETE FROM sessions WHERE user_id = ?', [user.id]);
    await connection.commit();
    return { recovery_code: next.code };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
};

const replaceRecoveryCode = async (userId, password) => {
  const [users] = await pool.query('SELECT id, password, status, deleted_at FROM users WHERE id = ?', [userId]);
  const user = users[0];
  if (!isAvailable(user) || !await bcrypt.compare(password, user.password)) throw unavailable();
  const next = createRecoveryCode();
  const [result] = await pool.query(
    "UPDATE users SET recovery_code_hash = ? WHERE id = ? AND password = ? AND status = 'ACTIVE' AND deleted_at IS NULL",
    [next.hash, userId, user.password],
  );
  if (result.affectedRows !== 1) throw unavailable();
  return { recovery_code: next.code };
};

module.exports = { createRecoveryCode, recoverPassword, replaceRecoveryCode };
