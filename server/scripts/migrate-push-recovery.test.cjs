const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../src/config/db');
const { migrate } = require('./migrate-push-recovery.cjs');
after(() => pool.end());
function fixture() {
  const calls = [], columns = [{ Field: 'token', Type: 'varchar(255)', Null: 'NO' }];
  return { calls, columns, db: { query: async sql => {
    calls.push(sql);
    if (sql.startsWith('SHOW COLUMNS')) return [columns];
    if (sql.startsWith('SHOW CREATE')) return [[{ 'Create Table': 'CREATE TABLE fixture (token varchar(255))' }]];
    if (sql.startsWith('ALTER')) for (const [name, type] of [['registration_version', 'varchar(36)'], ['last_error', 'varchar(40)'], ['native_token_hash', 'char(64)']]) columns.push({ Field: name, Type: type, Null: 'YES' });
    return [[{ total: 3 }]];
  } } };
}
test('migration preview performs reads only', async () => {
  const f = fixture(), result = await migrate(f.db);
  assert.deepEqual(result.missing, ['registration_version', 'last_error', 'native_token_hash']);
  assert.equal(f.calls.every(sql => /^(SHOW|SELECT)/.test(sql)), true);
});
test('migration requires a successful backup before additive DDL and preserves row counts', async () => {
  const f = fixture(); let backedUp = false;
  await assert.rejects(migrate(f.db, { apply: true, backup: async () => { throw Error('disk full'); } }));
  assert.equal(f.calls.some(sql => sql.startsWith('ALTER')), false);
  const result = await migrate(f.db, { apply: true, backup: async sql => { assert.match(sql, /^CREATE TABLE/); backedUp = true; } });
  assert.equal(backedUp, true); assert.equal(result.registrations_before, result.registrations_after);
  assert.equal((await migrate(f.db, { apply: true })).mode, 'already_current');
});
