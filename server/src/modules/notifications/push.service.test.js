const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const service = require('./push.service');
after(() => pool.end());
const token = 'ExpoPushToken[fixture-device]';
test('registration rejects malformed tokens and non-driver devices', async () => {
  await assert.rejects(service.register({id:'user',role:'DRIVER'}, 'session', {token:'bad',platform:'android',enabled:true}), e => e.statusCode === 400);
  await assert.rejects(service.register({id:'user',role:'RESIDENT'}, 'session', {token,platform:'android',enabled:true}), e => e.statusCode === 403);
});
test('device registration binds the authenticated session and never takes a client user ID', async () => {
  const original = pool.query, calls=[];
  pool.query = async (sql, args) => { calls.push([sql,args]); return sql.startsWith('SELECT') ? [[{id:'session-id'}]] : [{}]; };
  try { await service.register({id:'driver',role:'DRIVER'}, 'credential', {token,platform:'android',enabled:false,user_id:'victim'});
    assert.match(calls[0][0], /user_id = \?/); assert.equal(calls[0][1][0], 'driver');
    assert.deepEqual(calls[1][1], [token,'driver','session-id','android',false]);
  } finally { pool.query=original; }
});
test('dispatch push delivery rechecks driver/account/session ownership and sends private previews', async () => {
  const original=pool.query, fetchOriginal=global.fetch, calls=[];
  process.env.EXPO_PUSH_ENABLED='true';
  pool.query=async (sql,args) => { calls.push([sql,args]); return sql.startsWith('SELECT') ? [[{token}]] : [{}]; };
  global.fetch=async (url, options) => { const payload=JSON.parse(options.body)[0]; assert.equal(payload.data.user_id,'driver'); assert.equal(payload.body.includes('secret'),false); return {ok:true,json:async()=>({data:[{status:'error',details:{error:'DeviceNotRegistered'}}]})}; };
  try { await service.sendCollectorPushAlert({id:'notice',user_id:'driver',ref_module:'driver-messages',body:'secret'});
    assert.match(calls[0][0], /s.expires_at > NOW\(\)/); assert.match(calls[0][0], /u.role = 'DRIVER'/); assert.match(calls[0][0], /u.status = 'ACTIVE'/); assert.match(calls[0][0], /s.user_id = p.user_id/);
    assert.match(calls[0][0], /p.enabled = TRUE/);
    assert.equal(calls[1][0],'DELETE FROM mobile_push_devices WHERE token = ?');
    global.fetch=async()=>{throw Error('offline');}; await service.sendCollectorPushAlert({id:'notice',user_id:'driver',ref_module:'driver-messages'});
  } finally { pool.query=original;global.fetch=fetchOriginal;delete process.env.EXPO_PUSH_ENABLED; }
});

test('a new MENRO calendar schedule sends an actionable push to enabled collector devices', async () => {
  const original = pool.query, fetchOriginal = global.fetch, previous = process.env.EXPO_PUSH_ENABLED;
  let sent;
  process.env.EXPO_PUSH_ENABLED = 'true';
  pool.query = async sql => {
    assert.match(sql, /u.role = 'DRIVER'/);
    return [[{ token }]];
  };
  global.fetch = async (_url, options) => {
    sent = JSON.parse(options.body)[0];
    return { ok: true, json: async () => ({ data: [{ status: 'error' }] }) };
  };
  try {
    await service.sendCollectorPushAlert({ id: 'schedule-notice', user_id: 'driver', ref_module: 'schedule',
      title: 'Team briefing', body: 'Scheduled for October 18, 2026.', metadata: { event_date: '2026-10-18', end_date: '2026-10-20' } });
    assert.equal(sent.title, 'New MENRO Calendar Schedule');
    assert.match(sent.body, /Team briefing/);
    assert.equal(sent.body, 'Team briefing — October 18, 2026 through October 20, 2026');
    assert.deepEqual(sent.data, { user_id: 'driver', notification_id: 'schedule-notice',
      ref_module: 'schedule', destination: 'notifications', notification_title: 'Team briefing',
      notification_body: 'Scheduled for October 18, 2026.' });
  } finally {
    pool.query = original; global.fetch = fetchOriginal;
    if (previous === undefined) delete process.env.EXPO_PUSH_ENABLED;
    else process.env.EXPO_PUSH_ENABLED = previous;
  }
});

test('disabled devices are excluded before sending anything to the push provider', async () => {
  const original = pool.query, fetchOriginal = global.fetch, previous = process.env.EXPO_PUSH_ENABLED;
  let deliveries = 0;
  process.env.EXPO_PUSH_ENABLED = 'true';
  pool.query = async sql => {
    assert.match(sql, /p.enabled = TRUE/);
    return [[]];
  };
  global.fetch = async () => { deliveries++; throw Error('Disabled devices must not be sent to the provider'); };
  try {
    await service.sendCollectorPushAlert({ id: 'notice', user_id: 'driver', ref_module: 'driver-messages' });
    assert.equal(deliveries, 0);
  } finally {
    pool.query = original; global.fetch = fetchOriginal;
    if (previous === undefined) delete process.env.EXPO_PUSH_ENABLED;
    else process.env.EXPO_PUSH_ENABLED = previous;
  }
});
