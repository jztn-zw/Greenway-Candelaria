// Preview by default. Never starts/stops an API or applies DDL implicitly.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { exportBackup } = require('./reset-database');

const retired = {
  users: { two_factor: { type: 'tinyint(1)', nondefault: 'NOT (`two_factor` <=> 0)' } },
  routes: { collection_started_at: { type: 'datetime', nondefault: '`collection_started_at` IS NOT NULL' } },
  route_stops: {
    status: { type: "enum('NOT_STARTED','IN_PROGRESS','DONE','MISSED')", nondefault: "NOT (`status` <=> 'NOT_STARTED')" },
    completed_at: { type: 'timestamp', nondefault: '`completed_at` IS NOT NULL' },
    notified_at: { type: 'timestamp', nondefault: '`notified_at` IS NOT NULL' },
    collection_done_notified_at: { type: 'timestamp', nondefault: '`collection_done_notified_at` IS NOT NULL' },
    collection_skipped_notified_at: { type: 'timestamp', nondefault: '`collection_skipped_notified_at` IS NOT NULL' },
    skipped_reason: { type: 'varchar(255)', nondefault: '`skipped_reason` IS NOT NULL' },
  },
};
const identifier = value => {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw Error('Unexpected database identifier');
  return '`' + value + '`';
};
const hash = value => createHash('sha256').update(value).digest('hex');
const rowHash = rows => hash(rows.map(row => JSON.stringify(row)).sort().join('\n'));

async function inspect(db) {
  const [[database]] = await db.query('SELECT DATABASE() AS name');
  identifier(database.name);
  const [tables] = await db.query('SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME');
  if (tables.some(table => table.type !== 'BASE TABLE')) throw Error('Views require manual dependency review');
  const [indexes] = await db.query('SELECT TABLE_NAME AS table_name, INDEX_NAME AS index_name, NON_UNIQUE AS non_unique, SEQ_IN_INDEX AS position, COLUMN_NAME AS column_name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()');
  const [foreignKeys] = await db.query(`SELECT k.TABLE_NAME AS table_name, k.CONSTRAINT_NAME AS constraint_name,
    k.COLUMN_NAME AS column_name, k.ORDINAL_POSITION AS position,
    k.REFERENCED_TABLE_NAME AS parent_table, k.REFERENCED_COLUMN_NAME AS parent_column,
    r.UPDATE_RULE AS update_rule, r.DELETE_RULE AS delete_rule
    FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.TABLE_NAME = k.TABLE_NAME AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
    WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL`);
  for (const [source, scope] of [['TRIGGERS', 'TRIGGER_SCHEMA'], ['ROUTINES', 'ROUTINE_SCHEMA'], ['EVENTS', 'EVENT_SCHEMA']]) {
    const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM information_schema.${source} WHERE ${scope} = DATABASE()`);
    if (Number(row.total)) throw Error('Database programs require manual dependency review');
  }
  const plan = [];
  const columnsByTable = {};
  for (const table of tables) {
    const [columns] = await db.query(`SHOW FULL COLUMNS FROM ${identifier(table.name)}`);
    columnsByTable[table.name] = columns;
    for (const column of columns) {
      if (/GENERATED/i.test(column.Extra || '') && !/DEFAULT_GENERATED/i.test(column.Extra || '')) {
        // SHOW CREATE below is also checked for generated expression references.
        const [[definition]] = await db.query(`SHOW CREATE TABLE ${identifier(table.name)}`);
        const generated = definition['Create Table'].split('\n').filter(line => /GENERATED ALWAYS/i.test(line));
        if (generated.some(line => Object.keys(retired[table.name] || {}).some(name => new RegExp('`' + name + '`', 'i').test(line))))
          throw Error('A generated column depends on retired storage');
      }
    }
  }
  for (const [table, targets] of Object.entries(retired)) {
    if (!columnsByTable[table]) throw Error('Expected application table is missing');
    const present = columnsByTable[table].filter(column => Object.hasOwn(targets, column.Field));
    for (const column of present) {
      if (column.Type.toLowerCase() !== targets[column.Field].type.toLowerCase() || column.Null !== 'YES' || column.Extra)
        throw Error('Retired column definition requires manual review');
      if (indexes.some(index => index.table_name === table && index.column_name === column.Field)
        || foreignKeys.some(key => (key.table_name === table && key.column_name === column.Field)
          || (key.parent_table === table && key.parent_column === column.Field)))
        throw Error('Retired column has an index or foreign-key dependency');
      const [[values]] = await db.query(`SELECT COUNT(*) AS total FROM ${identifier(table)} WHERE ${targets[column.Field].nondefault}`);
      if (Number(values.total)) throw Error('Non-default legacy data exists; preserve and review it before removal');
    }
    if (present.length) plan.push({ table, columns: present.map(column => column.Field) });
  }
  return { database: database.name, tables: tables.map(table => table.name), columnsByTable, plan,
    dependencies: { indexes: rowHash(indexes), foreignKeys: rowHash(foreignKeys) } };
}

async function retainedSnapshot(db, state) {
  const snapshot = {};
  for (const table of state.tables) {
    const columns = state.columnsByTable[table].map(column => column.Field).filter(column => !Object.hasOwn(retired[table] || {}, column));
    const [rows] = await db.query(`SELECT ${columns.map(identifier).join(', ')} FROM ${identifier(table)}`);
    const [[definition]] = await db.query(`SHOW CREATE TABLE ${identifier(table)}`);
    snapshot[table] = { rows: rows.length, sha256: rowHash(rows),
      ...(!retired[table] ? { definitionSha256: hash(definition['Create Table']) } : {}) };
  }
  return snapshot;
}

async function removeLegacyColumns(db, { apply = false, database, maintenanceConfirmed = false,
  backupRoot = path.resolve(__dirname, '../backups') } = {}) {
  if (apply && (!database || !maintenanceConfirmed))
    throw Error('Apply requires --database and --maintenance-confirmed: all API instances/workers must be stopped and restart with compatible code');
  const state = await inspect(db);
  if (database && database !== state.database) throw Error('Configured database does not match requested target');
  const summary = { tables: state.tables.length, columns_to_remove: state.plan.reduce((total, item) => total + item.columns.length, 0), plan: state.plan };
  if (!apply || !state.plan.length) return { mode: apply ? 'already_current' : 'preview', ...summary };

  const before = await retainedSnapshot(db, state);
  const directory = path.join(backupRoot, 'legacy-storage-' + new Date().toISOString().replace(/[:.]/g, '-'));
  // Reuse the project's private full schema/data backup and checksum verifier.
  const backup = await exportBackup(db, state, directory);
  const backupMatches = await retainedSnapshot(db, state);
  if (JSON.stringify(before) !== JSON.stringify(backupMatches)) throw Error('Data changed during backup; stop all writers before retrying');
  await fs.writeFile(path.join(directory, 'retained-before.json'), JSON.stringify(before, null, 2), { flag: 'wx' });
  const snapshotChecksum = hash(await fs.readFile(path.join(directory, 'retained-before.json')));
  await fs.writeFile(path.join(directory, 'retained-before.sha256'), snapshotChecksum + '\n', { flag: 'wx' });
  if (hash(await fs.readFile(path.join(directory, 'restore.sql'))) !== backup.checksum)
    throw Error('Full backup checksum verification failed');
  // Recheck definitions, dependencies and values immediately before DDL.
  const ready = await inspect(db);
  if (JSON.stringify(ready) !== JSON.stringify(state)) throw Error('Schema changed during backup; review before retrying');
  console.log(JSON.stringify({ stage: 'backup-verified', directory, sha256: backup.checksum }));
  for (const item of state.plan) {
    await db.query(`ALTER TABLE ${identifier(item.table)} ${item.columns.map(column => 'DROP COLUMN ' + identifier(column)).join(', ')}`);
    const afterTable = await retainedSnapshot(db, { ...state, tables: [item.table] });
    if (JSON.stringify(afterTable[item.table]) !== JSON.stringify(before[item.table]))
      throw Error('Retained data verification failed; keep services stopped and review the verified backup');
  }
  const finalState = await inspect(db);
  if (finalState.plan.length) throw Error('Legacy columns remain after migration');
  if (JSON.stringify(finalState.tables) !== JSON.stringify(state.tables)
    || JSON.stringify(finalState.dependencies) !== JSON.stringify(state.dependencies))
    throw Error('Tables/indexes/foreign keys changed; keep services stopped and review the backup');
  for (const table of state.tables) {
    const expectedColumns = state.columnsByTable[table].filter(column => !Object.hasOwn(retired[table] || {}, column.Field));
    if (JSON.stringify(expectedColumns) !== JSON.stringify(finalState.columnsByTable[table]))
      throw Error('Retained column definitions changed; keep services stopped and review the backup');
  }
  const after = await retainedSnapshot(db, state);
  if (JSON.stringify(after) !== JSON.stringify(before))
    throw Error('Retained data or protected definitions changed; keep services stopped and review the backup');
  await fs.writeFile(path.join(directory, 'verification.json'), JSON.stringify({ before, after }, null, 2), { flag: 'wx' });
  return { mode: 'applied', ...summary, backup_directory: directory, retained_data_verified: true, retained_schema_verified: true };
}
module.exports = { inspect, removeLegacyColumns };

if (require.main === module) (async () => {
  require('dotenv').config({ quiet: true });
  const { pool } = require('../src/config/db');
  let db;
  try {
    db = await pool.getConnection();
    const index = process.argv.indexOf('--database');
    console.log(JSON.stringify(await removeLegacyColumns(db, {
      apply: process.argv.includes('--apply'), database: index < 0 ? undefined : process.argv[index + 1],
      maintenanceConfirmed: process.argv.includes('--maintenance-confirmed'),
    })));
  } catch (error) {
    console.error('Legacy storage removal failed:', error.code || (error.sql ? error.name : error.message));
    process.exitCode = 1;
  } finally { db?.release(); await pool.end(); }
})();
