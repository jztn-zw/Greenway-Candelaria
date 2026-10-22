const { test } = require('node:test');
const assert = require('node:assert/strict');
const { migrate } = require('./migrate-resident-location.cjs');
const fixture = () => {
  let added = false; const calls = [];
  return { calls, query: async sql => {
    calls.push(sql);
    if (sql.startsWith('SHOW COLUMNS')) return [[...(added ? [{ Field: 'resident_location', Type: 'json', Null: 'YES' }] : [])]];
    if (sql.startsWith('SHOW CREATE')) return [[{ 'Create Table': 'CREATE TABLE users (id varchar(36))' }]];
    if (sql.startsWith('SELECT COUNT')) return [[{ total: 3, located: 0 }]];
    if (sql.startsWith('ALTER')) { added = true; return [{}]; }
    throw Error('Unexpected query');
  } };
};
test('preview makes no schema or record changes', async () => {
  const db = fixture(); const result = await migrate(db);
  assert.deepEqual(result.missing, ['resident_location']);
  assert.equal(db.calls.some(sql => /ALTER|UPDATE|DELETE|INSERT/.test(sql)), false);
});
test('apply verifies a backup before adding one nullable column and is repeatable', async () => {
  const db = fixture(); let backedUp = false;
  const query = db.query; db.query = async sql => { if (sql.startsWith('ALTER')) assert.ok(backedUp); return query(sql); };
  const result = await migrate(db, { apply: true, backup: async sql => { assert.match(sql, /^CREATE TABLE users/); backedUp = true; } });
  assert.equal(result.mode, 'applied'); assert.equal(result.accounts_after, 3);
  assert.equal((await migrate(db, { apply: true })).mode, 'already_current');
  assert.equal(db.calls.filter(sql => sql.startsWith('ALTER')).length, 1);
  assert.equal(db.calls.some(sql => /^(UPDATE|DELETE|INSERT)/.test(sql)), false);
});
test('missing or failed backup prevents schema changes', async () => {
  for (const backup of [undefined, async () => { throw Error('backup failed'); }]) {
    const db = fixture(); await assert.rejects(migrate(db, { apply: true, backup }));
    assert.equal(db.calls.some(sql => sql.startsWith('ALTER')), false);
  }
});
test('an incompatible existing column is never replaced', async () => {
  const db = { query: async () => [[{ Field: 'resident_location', Type: 'text', Null: 'YES' }]] };
  await assert.rejects(migrate(db, { apply: true }), /incompatible/);
});
