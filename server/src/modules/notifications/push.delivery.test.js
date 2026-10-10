const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const push = require('./push.service');
const calls = [];
const original = push.sendDispatchAlert;
push.sendDispatchAlert = async row => calls.push(row.id);
const service = require('./notifications.service');
after(() => { push.sendDispatchAlert=original; return pool.end(); });
test('transactional notifications do not push until the committed delivery is emitted', async () => {
  const delivery = await service.sendToMany({user_ids:['driver'],type:'SYSTEM',title:'Dispatch',body:'Fixture',ref_module:'driver-messages',db:{query:async()=>[{}]},emit:false});
  assert.equal(calls.length,0);
  service.emitStoredNotifications(delivery.notifications);
  assert.deepEqual(calls,delivery.ids);
});
