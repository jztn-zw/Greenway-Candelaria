const test = require('node:test');
const assert = require('node:assert/strict');
const { migrate } = require('../scripts/migrate-multi-device-gps.cjs');

function fixture(column) {
  const calls = [];
  const db = { async query(sql) {
    calls.push(sql);
    if (sql.startsWith('SHOW COLUMNS')) return [column ? [column] : []];
    if (sql.startsWith('SELECT COUNT')) return [[{ total: 7, owned: 0 }]];
    if (sql.startsWith('SHOW CREATE')) return [[{ 'Create Table': 'CREATE TABLE fixture' }]];
    assert.equal(sql, 'ALTER TABLE route_runs ADD COLUMN gps_session_id VARCHAR(36) DEFAULT NULL');
    column = { Field: 'gps_session_id', Type: 'varchar(36)', Null: 'YES' };
    return [{}];
  } };
  return { db, calls };
}

test('multi-device migration preview performs no database writes', async () => {
  const f = fixture();
  assert.deepEqual(await migrate(f.db), { mode: 'preview', missing: ['gps_session_id'], runs: 7 });
  assert.ok(f.calls.every(sql => /^(SELECT|SHOW)/.test(sql)));
});

test('migration requires a successful backup and verifies rows before a repeat becomes a no-op', async () => {
  const f = fixture();
  await assert.rejects(migrate(f.db, { apply: true }), /backup/);
  await assert.rejects(migrate(f.db, { apply: true, backup: async () => { throw Error('backup corrupt'); } }), /backup corrupt/);
  assert.ok(!f.calls.some(sql => sql.startsWith('ALTER')));
  const result = await migrate(f.db, { apply: true, backup: async definition => assert.equal(definition, 'CREATE TABLE fixture') });
  assert.deepEqual(result, { mode: 'applied', runs: 7, owned: 0 });
  assert.equal((await migrate(f.db, { apply: true })).mode, 'already_current');
  assert.equal(f.calls.filter(sql => sql.startsWith('ALTER')).length, 1);
});

test('migration rejects an incompatible existing column', async () => {
  const f = fixture({ Field: 'gps_session_id', Type: 'int', Null: 'YES' });
  await assert.rejects(migrate(f.db, { apply: true }), /incompatible/);
  assert.ok(!f.calls.some(sql => sql.startsWith('ALTER')));
});
