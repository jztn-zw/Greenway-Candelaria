const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { migrate } = require('../scripts/migrate-resident-report-history.cjs');
const hash = value => createHash('sha256').update(value).digest('hex');

async function fixture(t, { changedDuringBackup = false, corruptBackup = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'greenway-report-history-test-'));
  t.after(async () => {
    if (!path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw Error('Unexpected fixture directory');
    await fs.rm(root, { recursive: true, force: true });
  });
  let marker = null, altered = 0, backups = 0;
  const columns = [{ Field: 'id', Type: 'varchar(36)', Null: 'NO', Default: null, Extra: '' },
    { Field: 'deleted_at', Type: 'datetime', Null: 'YES', Default: null, Extra: '' }];
  const rows = [{ id: 'fixture', deleted_at: null }];
  const definition = () => 'CREATE TABLE `reports` (\n  `id` varchar(36) NOT NULL,\n  `deleted_at` datetime DEFAULT NULL,\n'
    + (marker ? '  `resident_hidden_at` datetime DEFAULT NULL,\n' : '') + '  PRIMARY KEY (`id`)\n)';
  const db = { async query(sql) {
    if (sql.startsWith('SET time_zone')) return [{}];
    if (sql === 'SELECT DATABASE() AS name') return [[{ name: 'fixture' }]];
    if (sql === 'SHOW FULL COLUMNS FROM reports') return [[...columns, ...(marker ? [marker] : [])]];
    if (sql === 'SHOW CREATE TABLE reports') return [[{ 'Create Table': definition() }]];
    if (sql.startsWith('SELECT `id`, `deleted_at`')) return [rows.map(row => ({ ...row }))];
    if (sql === 'ALTER TABLE reports ADD COLUMN resident_hidden_at DATETIME DEFAULT NULL AFTER deleted_at') {
      altered++;
      marker = { Field: 'resident_hidden_at', Type: 'datetime', Null: 'YES', Default: null, Extra: '' };
      return [{}];
    }
    throw Error(`Unexpected query: ${sql}`);
  } };
  const options = { backupRoot: root, backup: async (_db, state, directory) => {
    backups++;
    assert.deepEqual(state.tables, ['reports']);
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, 'restore.sql'), 'fixture backup');
    const contents = { reports: { sha256: hash(rows.map(row => JSON.stringify(row)).sort().join('\n')) } };
    if (changedDuringBackup) rows.push({ id: 'concurrent', deleted_at: null });
    return { checksum: corruptBackup ? 'invalid' : hash('fixture backup'), contents, counts: { reports: 1 } };
  } };
  return { db, options, altered: () => altered, backups: () => backups };
}

test('migration preview never backs up or writes', async t => {
  const f = await fixture(t);
  assert.equal((await migrate(f.db, f.options)).mode, 'preview');
  assert.equal(f.altered(), 0);
  assert.equal(f.backups(), 0);
});
test('verified backup permits one additive migration and repeat application is harmless', async t => {
  const f = await fixture(t);
  const result = await migrate(f.db, { ...f.options, apply: true });
  assert.equal(result.original_data_verified, true);
  assert.equal(result.original_schema_verified, true);
  assert.equal((await migrate(f.db, { ...f.options, apply: true })).mode, 'already_current');
  assert.equal(f.altered(), 1);
  assert.equal(f.backups(), 1);
});
test('corrupt backup prevents DDL', async t => {
  const f = await fixture(t, { corruptBackup: true });
  await assert.rejects(migrate(f.db, { ...f.options, apply: true }), /checksum/);
  assert.equal(f.altered(), 0);
});
test('concurrent report changes during backup prevent DDL', async t => {
  const f = await fixture(t, { changedDuringBackup: true });
  await assert.rejects(migrate(f.db, { ...f.options, apply: true }), /changed during backup/);
  assert.equal(f.altered(), 0);
});
