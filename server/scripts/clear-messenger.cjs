// Read-only preview by default. --apply clears only Admin/Collector conversations.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { exportBackup } = require('./reset-database');
const noticeWhere = "ref_module = 'driver-messages' OR (ref_module = 'tracking' AND title LIKE 'New Collector Message:%')";
const identifier = name => {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) throw Error('Invalid table name');
  return '`' + name + '`';
};
const digest = value => createHash('sha256').update(value).digest('hex');
const rowDigest = rows => digest(rows.map(row => JSON.stringify(row)).sort().join('\n'));

async function snapshot(db, tables, retained = false) {
  const result = {};
  for (const table of tables) {
    if (retained && table === 'driver_messages') continue;
    const [rows] = await db.query(`SELECT * FROM ${identifier(table)}${retained && table === 'notifications' ? ` WHERE NOT (${noticeWhere.replaceAll('ref_module', "COALESCE(ref_module, '')")})` : ''}`);
    result[table] = { count: rows.length, hash: rowDigest(rows) };
  }
  return result;
}

async function clearMessenger(db, { apply = false, database } = {}) {
  const [[target]] = await db.query('SELECT DATABASE() AS name');
  if (database && database !== target.name) throw Error('Configured database does not match target');
  const [[messages]] = await db.query('SELECT COUNT(*) AS total FROM driver_messages');
  const [[notices]] = await db.query(`SELECT COUNT(*) AS total FROM notifications WHERE ${noticeWhere}`);
  const summary = { database: target.name, messages: Number(messages.total), message_notifications: Number(notices.total) };
  if (!apply || (!summary.messages && !summary.message_notifications)) return { mode: apply ? 'already_empty' : 'preview', ...summary };
  if (!database) throw Error('Apply requires an exact --database target');
  const [dependencies] = await db.query(`SELECT TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IN ('driver_messages','notifications')`);
  if (dependencies.length) throw Error('Dependent tables require review before clearing conversations');
  // Back up only touched tables: live GPS and push registrations may keep changing.
  // Neither table has dependent children (checked above), so deletes cannot cascade
  // into accounts, routes, GPS history or any other application table.
  const tables = ['driver_messages', 'notifications'];
  const before = await snapshot(db, tables);
  const retainedBefore = await snapshot(db, tables, true);
  const directory = path.resolve(__dirname, '../backups', `messenger-clear-${new Date().toISOString().replaceAll(':', '-')}`);
  const backup = await exportBackup(db, { database: target.name, tables }, directory);
  if (tables.some(table => backup.contents[table].sha256 !== before[table].hash)) throw Error('Database changed during backup; retry when writers are idle');
  if (digest(await fs.readFile(path.join(directory, 'restore.sql'))) !== backup.checksum) throw Error('Backup checksum mismatch');
  await db.beginTransaction();
  try {
    // Match the conversation writer's locks. Any changed snapshot aborts deletion.
    await db.query('SELECT id FROM drivers ORDER BY id FOR UPDATE');
    await db.query('SELECT id FROM driver_messages ORDER BY id FOR UPDATE');
    await db.query(`SELECT id FROM notifications WHERE ${noticeWhere} ORDER BY id FOR UPDATE`);
    if (JSON.stringify(await snapshot(db, tables)) !== JSON.stringify(before)) throw Error('Database changed after backup; nothing cleared');
    await db.query(`DELETE FROM notifications WHERE ${noticeWhere}`);
    await db.query('DELETE FROM driver_messages');
    const retainedAfter = await snapshot(db, tables, true);
    if (JSON.stringify(retainedAfter) !== JSON.stringify(retainedBefore)) throw Error('Retained data verification failed');
    const [[remaining]] = await db.query('SELECT COUNT(*) AS total FROM driver_messages');
    const [[remainingNotices]] = await db.query(`SELECT COUNT(*) AS total FROM notifications WHERE ${noticeWhere}`);
    if (Number(remaining.total) || Number(remainingNotices.total)) throw Error('Conversation clearing verification failed');
    await db.commit();
    return { mode: 'cleared', ...summary, remaining_messages: 0, remaining_message_notifications: 0,
      retained_notifications_verified: true, backup_directory: directory, backup_sha256: backup.checksum };
  } catch (error) { await db.rollback(); throw error; }
}
module.exports = { clearMessenger };

if (require.main === module) (async () => {
  require('dotenv').config({ quiet: true });
  const { pool } = require('../src/config/db');
  let db;
  try {
    db = await pool.getConnection();
    const flag = process.argv.indexOf('--database');
    console.log(JSON.stringify(await clearMessenger(db, {
      apply: process.argv.includes('--apply'), database: flag >= 0 ? process.argv[flag + 1] : undefined,
    })));
  } catch (error) { console.error('Messenger cleanup failed:', error.code || error.message); process.exitCode = 1; }
  finally { db?.release(); await pool.end(); }
})();
