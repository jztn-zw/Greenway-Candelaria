const { test } = require('node:test');
const assert = require('node:assert/strict');
const { migrate } = require('./migrate-resident-proximity.cjs');
const columns = ['route_run_id', 'user_id'].map(Field => ({ Field, Type: 'varchar(36)', Key: 'PRI' }));
test('preview is read only and apply requires a backup', async () => {
  const db = { query: async sql => { assert.equal(sql, "SHOW TABLES LIKE 'route_run_proximity_receipts'"); return [[]]; } };
  assert.equal((await migrate(db)).mode, 'preview');
  await assert.rejects(migrate(db, { apply: true }), /backup/);
});
test('backup completes before table creation; seed preserves previously broadcast and deleted-inbox recipients', async () => {
  let backedUp = false;
  const writes = [];
  const db = { query: async sql => {
    if (sql.startsWith('SHOW TABLES')) return [[]];
    if (sql.startsWith('SHOW CREATE')) return [[{ 'Create Table': `CREATE TABLE ${sql.split(' ').at(-1)} (id int)` }]];
    if (sql.includes('CREATE TABLE `route_run_proximity_receipts`')) { assert.equal(backedUp, true); writes.push(sql); return [{}]; }
    if (sql.startsWith('INSERT')) { writes.push(sql); return [{}]; }
    if (sql.startsWith('SHOW COLUMNS')) return [columns];
    if (sql.startsWith('SELECT COUNT')) return [[{ total: 3 }]];
    throw Error(sql);
  } };
  assert.deepEqual(await migrate(db, { apply: true, backup: async sql => { assert.match(sql, /CREATE TABLE users/); backedUp = true; } }), { mode: 'applied', receipts: 3 });
  assert.equal(writes.length, 2);
  assert.match(writes[1], /rs.notified_at IS NOT NULL/);
  assert.match(writes[1], /UNION/);
});
test('rerunning an installed migration does not seed later residents as already notified', async () => {
  const db = { query: async sql => sql.startsWith('SHOW TABLES') ? [[{}]] : [columns] };
  assert.equal((await migrate(db, { apply: true })).mode, 'already_current');
});
