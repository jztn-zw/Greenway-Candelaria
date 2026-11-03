// Private maintenance tool. Password is supplied through GREENWAY_ADMIN_PASSWORD,
// never stored in this file, SQL migrations, command output or audit payloads.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { exportBackup } = require('./reset-database');
const names = ['admin', 'admin1', 'admin2'];
const hash = value => createHash('sha256').update(value).digest('hex');
const rowHash = rows => hash(rows.map(row => JSON.stringify(row)).sort().join('\n'));
async function provision(db, { apply = false, maintenanceConfirmed = false, password,
  backupRoot = path.resolve(__dirname, '../backups'), backup = exportBackup } = {}) {
  const [[database]] = await db.query('SELECT DATABASE() AS name');
  if (!database?.name) throw Error('No configured database');
  const [admins] = await db.query("SELECT id, username, status FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL ORDER BY username");
  if (!admins.some(user => user.username === 'admin') || admins.some(user => !names.includes(user.username) || user.status !== 'ACTIVE'))
    throw Error('Expected the existing active admin account; unexpected administrators require review');
  const [collisions] = await db.query("SELECT username, role, deleted_at FROM users WHERE LOWER(username) IN ('admin', 'admin1', 'admin2')");
  if (collisions.some(user => user.role !== 'ADMIN' || user.deleted_at || !names.includes(user.username)))
    throw Error('Requested usernames conflict with existing accounts');
  const [columns] = await db.query('SHOW FULL COLUMNS FROM users');
  const [indexes] = await db.query('SHOW INDEX FROM users');
  const single = columns.find(column => column.Field === 'single_active_admin');
  const singleIndex = indexes.filter(index => index.Key_name === 'uq_users_single_active_admin');
  if (single && (!single.Extra.includes('VIRTUAL GENERATED') || !single.Type.startsWith('tinyint')))
    throw Error('Unexpected single-admin column definition');
  if (singleIndex.length && (singleIndex.length !== 1 || singleIndex[0].Column_name !== 'single_active_admin'))
    throw Error('Unexpected single-admin index definition');
  if (!apply) return { mode: 'preview', existing: admins.map(user => user.username),
    create: names.filter(name => !admins.some(user => user.username === name)), clear_admin_contacts: true,
    remove_single_admin_constraint: Boolean(single || singleIndex.length) };
  if (!maintenanceConfirmed) throw Error('Stop APIs/workers before applying');
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72)
    throw Error('Supply a valid password through GREENWAY_ADMIN_PASSWORD');
  const snapshots = async () => {
    const output = {};
    for (const [label, sql] of Object.entries({
      non_admin_users: "SELECT * FROM users WHERE role <> 'ADMIN'",
      route_runs: 'SELECT * FROM route_runs', route_run_stops: 'SELECT * FROM route_run_stops',
    })) {
      const [rows] = await db.query(sql);
      // The generated singleton column is retired for every role; compare all
      // retained values, including every resident/collector credential and contact.
      const retained = rows.map(({ single_active_admin, ...row }) => row);
      output[label] = { count: rows.length, sha256: rowHash(retained) };
    }
    return output;
  };
  const before = await snapshots();
  const directory = path.join(backupRoot, 'admin-accounts-' + new Date().toISOString().replace(/[:.]/g, '-'));
  const saved = await backup(db, { database: database.name, tables: ['users', 'sessions', 'user_settings', 'audit_logs'] }, directory);
  if (hash(await fs.readFile(path.join(directory, 'restore.sql'))) !== saved.checksum) throw Error('Backup checksum mismatch');
  if (JSON.stringify(await snapshots()) !== JSON.stringify(before)) throw Error('Records changed during backup; stop writers and retry');
  // Keep supporting DDL separate for TiDB. Never touch shared contact columns.
  if (singleIndex.length) await db.query('ALTER TABLE users DROP INDEX uq_users_single_active_admin');
  if (single) await db.query('ALTER TABLE users DROP COLUMN single_active_admin');
  const passwordHash = await bcrypt.hash(password, 12);
  await db.beginTransaction();
  try {
    const [locked] = await db.query("SELECT id, username, status FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL ORDER BY username FOR UPDATE");
    if (JSON.stringify(locked) !== JSON.stringify(admins)) throw Error('Admin accounts changed during maintenance');
    for (const name of names) {
      const existing = locked.find(user => user.username === name);
      const id = existing?.id || randomUUID();
      if (existing) {
        await db.query('UPDATE users SET email = NULL, phone = NULL, password = ? WHERE id = ?', [passwordHash, id]);
      } else {
        await db.query(`INSERT INTO users (id, full_name, username, email, phone, password, role, status, profile_completed, avatar_url)
          VALUES (?, ?, ?, NULL, NULL, ?, 'ADMIN', 'ACTIVE', 1, ?)`,
        [id, name === 'admin1' ? 'Admin 1' : 'Admin 2', name, passwordHash, '/profile-avatars/avatar-1.png']);
      }
      await db.query('DELETE FROM sessions WHERE user_id = ?', [id]);
      const [settings] = await db.query('SELECT id FROM user_settings WHERE user_id = ?', [id]);
      if (!settings.length) await db.query('INSERT INTO user_settings (id, user_id) VALUES (?, ?)', [randomUUID(), id]);
    }
    // Contacts on any old admin tombstones are also discarded, not copied into logs.
    await db.query("UPDATE users SET email = NULL, phone = NULL WHERE role = 'ADMIN' AND (email IS NOT NULL OR phone IS NOT NULL)");
    await db.query(`INSERT INTO audit_logs (id, user_id, action, module, record_id, new_value)
      VALUES (?, ?, 'PROVISION_ADMIN_ACCOUNTS', 'users', ?, ?)`,
    [randomUUID(), admins.find(user => user.username === 'admin').id,
      admins.find(user => user.username === 'admin').id,
      JSON.stringify({ usernames: names, admin_contacts_cleared: true, passwords_reset: true, sessions_revoked: true })]);
    await db.commit();
  } catch (error) { await db.rollback(); throw error; }
  const [verified] = await db.query("SELECT id, username, role, status, email, phone, password FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL ORDER BY username");
  if (verified.length !== names.length || verified.some(user => !names.includes(user.username) || user.status !== 'ACTIVE' || user.email !== null || user.phone !== null))
    throw Error('Admin account verification failed');
  for (const user of verified) if (!(await bcrypt.compare(password, user.password))) throw Error('Admin password verification failed');
  const [[sessions]] = await db.query("SELECT COUNT(*) AS total FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.role = 'ADMIN'");
  if (Number(sessions.total)) throw Error('Admin session revocation verification failed');
  const after = await snapshots();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Unrelated account or collection-history verification failed');
  await fs.writeFile(path.join(directory, 'verification.json'), JSON.stringify({ before, after, usernames: names,
    contacts_cleared: true, password_hashes_verified: true, sessions_revoked: true, backup_sha256: saved.checksum }, null, 2), { flag: 'wx' });
  return { mode: 'applied', usernames: names, admin_contacts_cleared: true, passwords_verified: true,
    sessions_revoked: true, unrelated_accounts_and_history_unchanged: true, backup_directory: directory, backup_sha256: saved.checksum };
}
module.exports = { provision };
if (require.main === module) (async () => {
  require('dotenv').config({ quiet: true });
  const { pool } = require('../src/config/db');
  let db;
  try {
    db = await pool.getConnection();
    console.log(JSON.stringify(await provision(db, { apply: process.argv.includes('--apply'),
      maintenanceConfirmed: process.argv.includes('--maintenance-confirmed'), password: process.env.GREENWAY_ADMIN_PASSWORD })));
  } catch (error) {
    console.error('Admin provisioning failed:', error.code || (error.sql ? error.name : error.message)); process.exitCode = 1;
  } finally { db?.release(); await pool.end(); }
})();
