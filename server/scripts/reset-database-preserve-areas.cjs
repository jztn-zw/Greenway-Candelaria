// One-off maintenance: keep one admin and barangays. Default invocation is read-only.
const fs = require('node:fs/promises');
const path = require('node:path');
const { identifier, rowDigest, schemaStatements, exportBackup, verifyBackupAndSchema } = require('./reset-database');

async function reset(db, { database, admin, apply, backupOnly, maintenanceConfirmed }) {
  if (apply && backupOnly) throw Error('Use either --backup-only or --apply');
  if (!database || !admin || (apply && !maintenanceConfirmed)) {
    throw Error('Specify --database and --admin. Apply also requires all writers stopped and --maintenance-confirmed.');
  }
  const [[target]] = await db.query('SELECT DATABASE() AS name, @@SESSION.foreign_key_checks AS fk_checks');
  if (target.name !== database || Number(target.fk_checks) !== 1) throw Error('Wrong database or foreign key checks disabled');
  await db.query("SET time_zone = '+00:00'");
  const tables = schemaStatements(await fs.readFile(path.resolve(__dirname, '../src/database/schema.sql'), 'utf8')).map(({ name }) => name);
  const [liveTables] = await db.query(`SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`);
  if (liveTables.length !== tables.length || liveTables.some(t => t.type !== 'BASE TABLE' || !tables.includes(t.name))) {
    throw Error('Unexpected tables or views; review before reset');
  }
  const [dependencies] = await db.query(`SELECT TABLE_SCHEMA AS child_schema, TABLE_NAME AS child,
      REFERENCED_TABLE_SCHEMA AS parent_schema, REFERENCED_TABLE_NAME AS parent
    FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME IS NOT NULL
      AND (TABLE_SCHEMA = DATABASE() OR REFERENCED_TABLE_SCHEMA = DATABASE())`);
  if (dependencies.some(fk => fk.child_schema !== database || fk.parent_schema !== database ||
      !tables.includes(fk.parent) || !tables.includes(fk.child) || tables.indexOf(fk.parent) >= tables.indexOf(fk.child))) {
    throw Error('Unexpected foreign key dependency; review before reset');
  }
  const [triggers] = await db.query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()');
  if (triggers.length) throw Error('Unexpected database triggers; review before reset');

  const [admins] = await db.query(`SELECT id, username, street_id IS NOT NULL AS has_street,
      (LEFT(password, 4) IN ('$2a$', '$2b$', '$2y$') AND CHAR_LENGTH(password) = 60) AS has_password_hash
    FROM users WHERE username = ? AND role = 'ADMIN' AND status = 'ACTIVE' AND deleted_at IS NULL`, [admin]);
  if (admins.length !== 1 || admins[0].username !== admin || Number(admins[0].has_password_hash) !== 1) {
    throw Error('Selected account must be an active admin with an existing password hash');
  }
  const keepId = admins[0].id;
  const counts = {};
  for (const table of tables) {
    const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM ${identifier(table)}`);
    counts[table] = Number(row.total);
  }
  const expected = { users: 1, barangays: counts.barangays };
  const summary = { database, admin, keep: expected, clearAdminStreetLink: Number(admins[0].has_street) === 1,
    remove: Object.fromEntries(tables.map(table => [table, counts[table] - (expected[table] ?? 0)])) };
  if (!apply && !backupOnly) return { ...summary, changed: false };
  const directory = path.resolve(__dirname, '../backups', `database-reset-preserve-areas-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  const state = { database, tables };
  const backup = await exportBackup(db, state, directory);
  if (backupOnly) return { ...summary, changed: false, backupDirectory: directory, checksum: backup.checksum };
  await verifyBackupAndSchema(db, state, backup);
  console.log(JSON.stringify({ stage: 'backup-and-restore-verified', directory, checksum: backup.checksum }));

  await db.beginTransaction();
  try {
    let adminHash;
    for (const table of tables) {
      const { columns, sha256 } = backup.contents[table];
      const [rows] = await db.query(`SELECT ${columns.map(identifier).join(', ')} FROM ${identifier(table)} FOR UPDATE`);
      if (rows.length !== counts[table] || rowDigest(rows) !== sha256) throw Error('Data changed during backup; no deletion committed');
      if (table === 'users') {
        const kept = rows.find(row => row.id === keepId);
        if (!kept || kept.username !== admin || kept.role !== 'ADMIN' || kept.status !== 'ACTIVE' || kept.deleted_at !== null ||
            !/^\$2[aby]\$\d{2}\$/.test(kept.password || '')) {
          throw Error('Selected admin changed during backup; no deletion committed');
        }
        if ((kept.street_id !== null) !== summary.clearAdminStreetLink) throw Error('Admin street link changed; no deletion committed');
        adminHash = rowDigest([{ ...kept, street_id: null }]);
      }
    }
    for (const table of [...tables].reverse()) {
      if (table === 'barangays') continue;
      if (table === 'users') {
        await db.query('DELETE FROM users WHERE id <> ?', [keepId]);
        if (summary.clearAdminStreetLink) {
          await db.query('UPDATE users SET street_id = NULL, updated_at = updated_at WHERE id = ?', [keepId]);
        }
      } else await db.query(`DELETE FROM ${identifier(table)}`);
    }
    for (const table of tables) {
      if (Object.hasOwn(expected, table)) {
        const [rows] = await db.query(`SELECT ${backup.contents[table].columns.map(identifier).join(', ')} FROM ${identifier(table)}`);
        const hash = table === 'users' ? adminHash : backup.contents[table].sha256;
        if (rows.length !== expected[table] || rowDigest(rows) !== hash) throw Error('Retained record verification failed');
      } else {
        const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM ${identifier(table)}`);
        if (Number(row.total) !== 0) throw Error('Non-retained table was not empty');
      }
    }
    await db.commit();
  } catch (error) { await db.rollback(); throw error; }
  return { ...summary, changed: true, backupDirectory: directory };
}

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const { pool } = require('../src/config/db');
  const value = flag => process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : undefined;
  (async () => {
    const db = await pool.getConnection();
    try {
      console.log(JSON.stringify(await reset(db, { database: value('--database'), admin: value('--admin'),
        apply: process.argv.includes('--apply'), backupOnly: process.argv.includes('--backup-only'),
        maintenanceConfirmed: process.argv.includes('--maintenance-confirmed') })));
    } finally { db.release(); }
  })().catch(error => {
    console.error('Reset failed:', error.code || (error.sql ? error.name : error.message));
    process.exitCode = 1;
  }).finally(() => pool.end());
}
