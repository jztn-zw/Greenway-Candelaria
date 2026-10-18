const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function fixture() {
  const stored = [], emitted = [], pushes = [], queries = [];
  const db = { async query(sql, params) {
    queries.push({ sql, params });
    assert.doesNotMatch(sql, /notif_(?:announcements|collection|truck|report|new_content)|reminder_on/);
    if (sql.startsWith('INSERT')) {
      stored.push(...(sql.includes('VALUES ?') ? params[0] : [params]));
      return [{}];
    }
    assert.match(sql, /u\.status = 'ACTIVE'/); assert.match(sql, /u\.deleted_at IS NULL/);
    return [[{ id: 'muted-resident' }]];
  } };
  const module = { exports: {} };
  let id = 0;
  vm.runInNewContext(fs.readFileSync(require.resolve('./notifications.service'), 'utf8'), {
    module, require(name) {
      if (name.endsWith('/db')) return { pool: db };
      if (name.endsWith('/generateId')) return () => `notification-${++id}`;
      if (name === './push.service') return { sendCollectorPushAlert: async notice => pushes.push(notice) };
      if (name.endsWith('/notifications.socket')) return { emitNotificationToUser: (owner, notice) => emitted.push({ owner, notice }) };
      if (name === './notificationPresentation') return {};
      throw Error(name);
    }, Buffer, Date,
  });
  return { ...module.exports, db, stored, emitted, pushes, queries };
}

test('muted phone alerts still store and emit owner report updates', async () => {
  const f = fixture();
  const id = await f.sendToUser({ user_id: 'muted-resident', type: 'REPORT_UPDATE', title: 'Report reviewed', body: 'Update' });
  assert.ok(id); assert.equal(f.stored.length, 1);
  assert.equal(f.emitted[0].owner, 'muted-resident');
  assert.equal(f.emitted[0].notice.id, id);
});

test('broadcast and area inbox delivery ignore phone flags while preserving authorized scope', async () => {
  for (const type of ['ANNOUNCEMENT', 'NEW_POST', 'COLLECTION_REMINDER', 'TRUCK_IS_NEAR', 'COLLECTION_DONE', 'MISSED_COLLECTION']) {
    const f = fixture();
    assert.equal((await f.notifyAllResidents({ type, title: 'Update', body: 'Body', emit: false })).sent, 1);
    assert.equal((await f.notifyBarangayResidents({ type, barangay_id: 'area', street_id: 'street', title: 'Update', body: 'Body', emit: false })).sent, 1);
    assert.match(f.queries[2].sql, /u\.barangay_id = \? AND u\.street_id = \?/);
    assert.deepEqual([...f.queries[2].params], ['area', 'street']);
    assert.equal(f.emitted.length, 0); assert.equal(f.pushes.length, 0);
  }
});

test('announcement recipient reconciliation retains active-account checks and ignores phone switches', async () => {
  const f = fixture();
  assert.deepEqual([...await f.filterActiveNotificationUserIds(['muted-resident', 'muted-resident', null], f.db)], ['muted-resident']);
  assert.deepEqual([...f.queries[0].params[0]], ['muted-resident']);
});
