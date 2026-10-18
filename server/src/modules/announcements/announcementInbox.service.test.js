const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture({ enabled = 1, initialized = null, locked = {}, fail = false } = {}) {
  const calls = [], deliveries = [], hints = [];
  const user = { role: 'RESIDENT', status: 'ACTIVE', profile_completed: 1, created_at: '2026-10-18 00:00:00',
    barangay_id: 'area', announcement_inbox_initialized_at: initialized, ...locked };
  const connection = {
    async beginTransaction() { calls.push('begin'); }, async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); }, release() { calls.push('release'); },
    async query(sql, params) {
      if (sql.includes('FROM users')) { assert.match(sql, /FOR UPDATE/); return [[user]]; }
      if (sql.includes('FROM user_settings')) return [[{ enabled }]];
      if (sql.includes('FROM announcements a')) {
        assert.match(sql, /a.status = 'ACTIVE'/); assert.match(sql, /a.expires_at > NOW\(\)/);
        assert.match(sql, /COALESCE\(a.sent_at, a.created_at\) < \?/);
        assert.match(sql, /ab.barangay_id = \?/); assert.match(sql, /NOT EXISTS \(SELECT 1 FROM notifications/);
        assert.match(sql, /NOT EXISTS \(SELECT 1 FROM announcement_read_receipts/);
        assert.deepEqual([...params], [user.created_at, 'area', 'resident', 'resident']);
        return [[{ id: 'notice', title: 'Notice', body: 'Body', type: 'GENERAL_NOTICE' }]];
      }
      if (sql.startsWith('UPDATE users')) { calls.push('marker'); user.announcement_inbox_initialized_at = 'initialized'; return [{}]; }
      throw Error('Unexpected query');
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('./announcementInbox.service'), 'utf8'), {
    module, require(name) {
      if (name.endsWith('/db')) return { pool: { async getConnection() { return connection; } } };
      if (name.endsWith('/notifications.service')) return { async sendToMany(payload) {
        assert.equal(payload.db, connection); assert.equal(payload.emit, false);
        if (fail) throw Error('Fixture delivery failed'); deliveries.push(payload); return { sent: 1 };
      } };
      if (name.endsWith('/residentChanges.socket')) return { emitResidentDataChanged(domains, owner) { hints.push({ domains: [...domains], owner }); } };
      throw Error(name);
    },
  });
  const viewer = { id: 'resident', role: 'RESIDENT', profile_completed: true, announcement_inbox_initialized_at: null };
  return { run: (value = viewer) => module.exports.initializeResidentAnnouncements(value), viewer, user, calls, deliveries, hints };
}

test('catch-up saves eligible pre-signup notices and commits before the owner-only hint', async () => {
  const f = fixture(); await f.run();
  assert.deepEqual(f.calls, ['begin', 'marker', 'commit', 'release']);
  assert.deepEqual([...f.deliveries[0].user_ids], ['resident']);
  assert.equal(f.deliveries[0].ref_module, 'announcements');
  assert.deepEqual(f.hints, [{ domains: ['notifications'], owner: 'resident' }]);
});
test('repeat initialization cannot restore a subsequently deleted notification', async () => {
  const f = fixture(); await f.run(); f.deliveries.length = 0; await f.run();
  assert.equal(f.deliveries.length, 0); assert.equal(f.hints.length, 1);
});
test('disabled phone alerts still receive the one-time announcement inbox catch-up', async () => {
  const f = fixture({ enabled: 0 }); await f.run();
  assert.equal(f.deliveries.length, 1); assert.ok(f.calls.includes('marker')); assert.equal(f.hints.length, 1);
});
test('failed delivery rolls back without stamping completion or emitting a hint', async () => {
  const f = fixture({ fail: true }); await assert.rejects(f.run(), /Fixture delivery failed/);
  assert.deepEqual(f.calls, ['begin', 'rollback', 'release']); assert.equal(f.hints.length, 0);
});
test('unmigrated, incomplete and nonresident requests do not initialize an inbox', async () => {
  for (const changes of [{ announcement_inbox_initialized_at: undefined }, { profile_completed: false }, { role: 'ADMIN' }]) {
    const f = fixture(); await f.run({ ...f.viewer, ...changes }); assert.equal(f.calls.length, 0);
  }
});
test('account changes and completed initialization are rechecked under the row lock', async () => {
  for (const locked of [{ status: 'BANNED' }, { deleted_at: 'deleted' }, { role: 'DRIVER' }, { profile_completed: 0 }, { announcement_inbox_initialized_at: 'done' }]) {
    const f = fixture({ locked }); await f.run();
    assert.deepEqual(f.calls, ['begin', 'rollback', 'release']); assert.equal(f.deliveries.length, 0);
  }
});

test('inbox and badge endpoints initialize only the authenticated owner before reading', async () => {
  for (const method of ['getMyNotifications', 'getUnreadCount']) {
    const calls = [], owner = { id: 'resident', role: 'RESIDENT', profile_completed: 1 };
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(require.resolve('../notifications/notifications.controller'), 'utf8'), {
      module, require(name) {
        if (name === './notifications.service') return {
          async getMyNotifications(id) { calls.push(['read', id]); return {}; },
          async getUnreadCount(id) { calls.push(['read', id]); return {}; },
        };
        if (name === './notifications.schema') return {};
        if (name.endsWith('/apiResponse')) return { success() {} };
        if (name.endsWith('/announcementInbox.service')) return { async initializeResidentAnnouncements(user) {
          assert.equal(user, owner); calls.push(['initialize', user.id]);
        } };
        throw Error(name);
      },
    });
    await module.exports[method]({ user: owner, query: { user_id: 'other' } }, {}, error => { throw error; });
    assert.deepEqual(calls, [['initialize', 'resident'], ['read', 'resident']]);
  }
});
