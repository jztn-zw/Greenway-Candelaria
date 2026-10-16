const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const push = require('./push.service');
const calls = [];
const original = push.sendCollectorPushAlert;
push.sendCollectorPushAlert = async row => calls.push(row.id);
const service = require('./notifications.service');
after(() => { push.sendCollectorPushAlert=original; return pool.end(); });
test('transactional schedule alerts do not push until the committed delivery is emitted', async () => {
  const delivery = await service.sendToMany({user_ids:['driver'],type:'SYSTEM',title:'Calendar event',body:'Fixture',ref_module:'schedule',db:{query:async()=>[{}]},emit:false});
  assert.equal(calls.length,0);
  service.emitStoredNotifications(delivery.notifications);
  assert.deepEqual(calls,delivery.ids);
});
