const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture({ missing = false, fail = false } = {}) {
  const calls = [], events = [], module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('./notifications.service'), 'utf8'), {
    module, console, require: name => {
      if (name.endsWith('/config/db')) return { pool: { query: async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT')) return [missing ? [] : [{ id: 'notice' }]];
        if (fail) throw Error('write failed');
        return [{ affectedRows: 1 }];
      } } };
      if (name.endsWith('/generateId')) return () => 'generated';
      if (name === './push.service') return { sendCollectorPushAlert: () => assert.fail('state changes must not send push') };
      if (name.endsWith('/notifications.socket')) return { emitNotificationStateChanged: owner => events.push(owner) };
      throw Error(name);
    },
  });
  return { service: module.exports, calls, events };
}

test('read, bulk read, delete and clear publish only their saved owner state', async () => {
  for (const action of ['markAsRead', 'markAllAsRead', 'deleteOne', 'clearAll']) {
    const f = fixture();
    if (['markAsRead', 'deleteOne'].includes(action)) await f.service[action]('notice', 'owner');
    else await f.service[action]('owner');
    assert.deepEqual(f.events, ['owner'], action);
    const write = f.calls.find(call => /^(UPDATE|DELETE)/.test(call.sql));
    assert.match(write.sql, /user_id = \?/);
    assert.ok(write.params.includes('owner'));
  }
});

test('failed writes and foreign notification references never announce a read', async () => {
  for (const action of ['markAsRead', 'markAllAsRead', 'deleteOne', 'clearAll']) {
    const f = fixture({ fail: true });
    await assert.rejects(['markAsRead', 'deleteOne'].includes(action)
      ? f.service[action]('notice', 'owner') : f.service[action]('owner'), /write failed/);
    assert.deepEqual(f.events, []);
  }
  const f = fixture({ missing: true });
  await assert.rejects(f.service.markAsRead('foreign', 'owner'), error => error.statusCode === 404);
  assert.deepEqual(f.events, []);
});
