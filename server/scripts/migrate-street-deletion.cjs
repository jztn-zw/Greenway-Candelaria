// Read-only preview by default. Apply only with explicit database authorization.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { exportBackup } = require('./reset-database');
const hash = value => createHash('sha256').update(value).digest('hex');
const rowHash = rows => hash(rows.map(row => JSON.stringify(row)).sort().join('\n'));
const identifier = value => {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw Error('Unexpected identifier');
  return '`' + value + '`';
};
async function migrate(db, { apply = false, maintenanceConfirmed = false,
  backupRoot = path.resolve(__dirname, '../backups'), backup = exportBackup } = {}) {
  const [[database]] = await db.query('SELECT DATABASE() AS name');
  if (!database?.name) throw Error('No configured database');
  const [columns] = await db.query('SHOW FULL COLUMNS FROM barangay_streets');
  const [indexes] = await db.query('SHOW INDEX FROM barangay_streets');
  const deleted = columns.find(c => c.Field === 'deleted_at');
  const live = columns.find(c => c.Field === 'live_identity');
  const identity = indexes.filter(i => i.Key_name === 'uq_barangay_street_identity')
    .sort((a, b) => a.Seq_in_index - b.Seq_in_index).map(i => i.Column_name);
  const liveIndex = indexes.filter(i => i.Key_name === 'uq_barangay_street_live_identity')
    .sort((a, b) => a.Seq_in_index - b.Seq_in_index);
  const liveKey = liveIndex.map(i => i.Column_name);
  const oldKey = ['barangay_id', 'name_key', 'area_key'];
  const newKey = [...oldKey, 'live_identity'];
  const parentIndex = indexes.filter(i => i.Key_name === 'idx_barangay_streets_barangay');
  if (parentIndex.length && (parentIndex.length !== 1 || parentIndex[0].Column_name !== 'barangay_id'))
    throw Error('Unexpected street parent index');
  if (deleted && (deleted.Type.toLowerCase() !== 'datetime' || deleted.Null !== 'YES' || deleted.Default !== null))
    throw Error('Unexpected existing street deletion marker');
  if (live) {
    const [[definition]] = await db.query('SHOW CREATE TABLE barangay_streets');
    const ddl = definition['Create Table'].toLowerCase().replace(/[`\s()]/g, '');
    if (!deleted || deleted.Type.toLowerCase() !== 'datetime' || deleted.Null !== 'YES' || deleted.Default !== null
      || !live?.Type.toLowerCase().startsWith('tinyint') || !live.Extra.includes('VIRTUAL GENERATED')
      || !(ddl.includes('ifdeleted_atisnull,1,null') || ddl.includes('ifisnulldeleted_at,1,null')))
      throw Error('Unexpected existing street deletion schema');
  }
  if (liveKey.length && (!live || JSON.stringify(liveKey) !== JSON.stringify(newKey) || liveIndex.some(i => Number(i.Non_unique) !== 0)))
    throw Error('Unexpected live street identity index');
  if (identity.length && JSON.stringify(identity) !== JSON.stringify(oldKey)) throw Error('Unexpected street identity index');
  if (!identity.length && !liveKey.length) throw Error('Missing street identity index');
  if (deleted && live && liveKey.length && !identity.length && parentIndex.length) return { mode: 'already_current' };
  if (!apply) return { mode: 'preview', additions: [...(!deleted ? ['deleted_at'] : []), 'live_identity'], history: 'retained without rewriting' };
  if (!maintenanceConfirmed) throw Error('Stop all APIs/workers and pass --maintenance-confirmed');
  const originalNames = columns.map(c => c.Field);
  const snapshots = async () => {
    const output = {};
    for (const table of ['barangay_streets', 'route_runs', 'route_run_stops']) {
      const select = table === 'barangay_streets' ? originalNames.map(identifier).join(', ') : '*';
      const [rows] = await db.query(`SELECT ${select} FROM ${identifier(table)}`);
      output[table] = { count: rows.length, sha256: rowHash(rows) };
    }
    return output;
  };
  const before = await snapshots();
  const directory = path.join(backupRoot, 'street-deletion-' + new Date().toISOString().replace(/[:.]/g, '-'));
  const saved = await backup(db, { database: database.name, tables: ['barangay_streets', 'route_runs', 'route_run_stops'] }, directory);
  if (hash(await fs.readFile(path.join(directory, 'restore.sql'))) !== saved.checksum) throw Error('Backup checksum mismatch');
  if (JSON.stringify(await snapshots()) !== JSON.stringify(before)) throw Error('Data changed during backup; stop writers and retry');
  const [readyColumns] = await db.query('SHOW FULL COLUMNS FROM barangay_streets');
  const [readyIndexes] = await db.query('SHOW INDEX FROM barangay_streets');
  if (JSON.stringify(readyColumns) !== JSON.stringify(columns)
    || JSON.stringify(readyIndexes.map(({ Cardinality, ...index }) => index)) !== JSON.stringify(indexes.map(({ Cardinality, ...index }) => index)))
    throw Error('Street schema changed during backup');
  const sql = await fs.readFile(path.resolve(__dirname, '../src/database/migrations/2026-11-03-street-history-preserving-deletion.sql'), 'utf8');
  const statements = sql.split('\n').filter(line => !line.trimStart().startsWith('--')).join('\n')
    .split(';').map(statement => statement.trim()).filter(Boolean);
  try {
    for (const statement of statements) {
      if (deleted && /ADD COLUMN deleted_at/.test(statement)) continue;
      if (parentIndex.length && /ADD KEY idx_barangay_streets_barangay/.test(statement)) continue;
      if (live && /ADD COLUMN live_identity/.test(statement)) continue;
      if (liveKey.length && /ADD UNIQUE KEY uq_barangay_street_live_identity/.test(statement)) continue;
      if (!identity.length && /DROP INDEX uq_barangay_street_identity/.test(statement)) continue;
      await db.query(statement);
    }
  } catch (error) {
    // Only this fixed schema statement is reported, never record SQL or values.
    throw Error(`Street schema alteration failed: ${error.code || 'unknown'} (${error.sqlMessage || 'no database detail'})`);
  }
  const current = await migrate(db);
  const after = await snapshots();
  if (current.mode !== 'already_current' || JSON.stringify(before) !== JSON.stringify(after))
    throw Error('Migration verification failed; retain backup and keep writers stopped');
  await fs.writeFile(path.join(directory, 'verification.json'), JSON.stringify({ before, after, backup_sha256: saved.checksum }, null, 2), { flag: 'wx' });
  return { mode: 'applied', original_streets_and_history_verified: true, backup_directory: directory, backup_sha256: saved.checksum };
}
module.exports = { migrate };
if (require.main === module) (async () => {
  require('dotenv').config({ quiet: true });
  const { pool } = require('../src/config/db');
  let db;
  try {
    db = await pool.getConnection();
    console.log(JSON.stringify(await migrate(db, { apply: process.argv.includes('--apply'), maintenanceConfirmed: process.argv.includes('--maintenance-confirmed') })));
  } catch (error) {
    console.error('Street deletion migration failed:', error.code || (error.sql ? error.name : error.message));
    process.exitCode = 1;
  } finally { db?.release(); await pool.end(); }
})();
