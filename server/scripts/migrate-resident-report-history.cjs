// Preview by default. --apply requires explicit configured-database approval.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { exportBackup } = require('./reset-database');

const hash = value => createHash('sha256').update(value).digest('hex');
const rowHash = rows => hash(rows.map(row => JSON.stringify(row)).sort().join('\n'));
const identifier = name => {
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw Error('Unexpected column identifier');
  return '`' + name + '`';
};
const compatible = column => column && column.Type.toLowerCase() === 'datetime'
  && column.Null === 'YES' && column.Default === null && !column.Extra;

async function migrate(db, { apply = false, backupRoot = path.resolve(__dirname, '../backups'), backup = exportBackup } = {}) {
  await db.query("SET time_zone = '+00:00'");
  const [[database]] = await db.query('SELECT DATABASE() AS name');
  if (!database?.name) throw Error('No configured database');
  const [columns] = await db.query('SHOW FULL COLUMNS FROM reports');
  const existing = columns.find(column => column.Field === 'resident_hidden_at');
  if (existing && !compatible(existing)) throw Error('Existing history marker has an incompatible definition');
  if (!apply || existing) return { mode: existing ? 'already_current' : 'preview', missing: existing ? [] : ['resident_hidden_at'] };

  const names = columns.map(column => column.Field);
  const readOriginalRows = async () => {
    const [rows] = await db.query(`SELECT ${names.map(identifier).join(', ')} FROM reports`);
    return { count: rows.length, sha256: rowHash(rows) };
  };
  const [[definition]] = await db.query('SHOW CREATE TABLE reports');
  const before = await readOriginalRows();
  const directory = path.join(backupRoot, 'resident-report-history-' + new Date().toISOString().replace(/[:.]/g, '-'));
  const saved = await backup(db, { database: database.name, tables: ['reports'] }, directory);
  const backupFile = path.join(directory, 'restore.sql');
  if (hash(await fs.readFile(backupFile)) !== saved.checksum) throw Error('Backup checksum verification failed');
  const ready = await readOriginalRows();
  if (JSON.stringify(ready) !== JSON.stringify(before)
    || saved.contents.reports.sha256 !== before.sha256 || saved.counts.reports !== before.count)
    throw Error('Reports changed during backup; no migration applied. Retry in a quiet window');
  const [readyColumns] = await db.query('SHOW FULL COLUMNS FROM reports');
  if (JSON.stringify(readyColumns) !== JSON.stringify(columns)) throw Error('Report schema changed during backup; review before retrying');
  console.log(JSON.stringify({ stage: 'backup-verified', directory, sha256: saved.checksum }));

  await db.query('ALTER TABLE reports ADD COLUMN resident_hidden_at DATETIME DEFAULT NULL AFTER deleted_at');
  const [afterColumns] = await db.query('SHOW FULL COLUMNS FROM reports');
  if (!compatible(afterColumns.find(column => column.Field === 'resident_hidden_at'))
    || JSON.stringify(afterColumns.filter(column => column.Field !== 'resident_hidden_at')) !== JSON.stringify(columns))
    throw Error('Migration applied but column verification failed; review the backup before further changes');
  const [[afterDefinition]] = await db.query('SHOW CREATE TABLE reports');
  const retainedDefinition = afterDefinition['Create Table'].split('\n').filter(line => !line.includes('`resident_hidden_at`')).join('\n');
  if (retainedDefinition !== definition['Create Table']) throw Error('Migration applied but retained schema verification failed');
  const after = await readOriginalRows();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Migration applied but reports changed during verification; do not restore over live writes');
  await fs.writeFile(path.join(directory, 'verification.json'), JSON.stringify({ before, after, marker: 'nullable datetime', verifiedAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
  return { mode: 'applied', reports: after.count, original_data_verified: true, original_schema_verified: true,
    backup_directory: directory, backup_sha256: saved.checksum };
}
module.exports = { migrate };

if (require.main === module) (async () => {
  require('dotenv').config({ quiet: true });
  const { pool } = require('../src/config/db');
  let db;
  try {
    db = await pool.getConnection();
    console.log(JSON.stringify(await migrate(db, { apply: process.argv.includes('--apply') })));
  } catch (error) {
    // Never print database error SQL/values or credentials.
    console.error('Resident report history migration failed:', error.code || (error.sql ? error.name : error.message));
    process.exitCode = 1;
  } finally { db?.release(); await pool.end(); }
})();
