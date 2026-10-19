const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const service = require('./push.service');
after(() => pool.end());
const token = 'ExpoPushToken[fixture-device]';

test('provider rejections report a safe error code without exposing device or notification content', async () => {
  const originalQuery = pool.query, originalFetch = global.fetch, originalWarn = console.warn;
  const previous = process.env.EXPO_PUSH_ENABLED, warnings = [];
  process.env.EXPO_PUSH_ENABLED = 'true';
  pool.query = async () => [[{ token, user_id: 'resident', session_id: 'session-id', role: 'RESIDENT' }]];
  console.warn = (...args) => warnings.push(args.join(' '));
  try {
    for (const [error, expected] of [['InvalidCredentials', 'InvalidCredentials'], [token, 'UnknownProviderError']]) {
      global.fetch = async () => ({ ok: true, json: async () => ({ data: [{ status: 'error',
        message: `Private message for ${token}`, details: { error } }] }) });
      await service.sendMobilePushAlert({ id: 'private-id', user_id: 'resident', type: 'ANNOUNCEMENT', body: 'Private notification' });
      assert.match(warnings.at(-1) || '', new RegExp(`ticket rejected \\(${expected}\\)`));
    }
    assert.equal(warnings.some(line => /fixture-device|private-id|Private message|Private notification/.test(line)), false);
  } finally {
    pool.query = originalQuery; global.fetch = originalFetch; console.warn = originalWarn;
    if (previous === undefined) delete process.env.EXPO_PUSH_ENABLED;
    else process.env.EXPO_PUSH_ENABLED = previous;
  }
});

test('delayed receipt credential failures are visible without deleting a valid registration', async () => {
  const originalQuery = pool.query, originalFetch = global.fetch, originalWarn = console.warn, originalTimeout = global.setTimeout;
  const previous = process.env.EXPO_PUSH_ENABLED, warnings = [];
  let checkReceipts, writes = 0;
  process.env.EXPO_PUSH_ENABLED = 'true';
  pool.query = async sql => { if (!sql.startsWith('SELECT')) writes++; return [[{ token, user_id: 'driver', session_id: 'session-id', role: 'DRIVER' }]]; };
  console.warn = (...args) => warnings.push(args.join(' '));
  global.setTimeout = callback => { checkReceipts = callback; return { unref() {} }; };
  global.fetch = async url => ({ ok: true, json: async () => url.endsWith('/send')
    ? { data: [{ status: 'ok', id: 'fixture-receipt' }] }
    : { data: { 'fixture-receipt': { status: 'error', details: { error: 'MismatchSenderId' }, message: token } } } });
  try {
    await service.sendMobilePushAlert({ id: 'notice', user_id: 'driver', ref_module: 'driver-messages' });
    await checkReceipts();
    assert.match(warnings.join(' '), /receipt rejected \(MismatchSenderId\)/);
    assert.equal(warnings.join(' ').includes(token), false);
    assert.equal(writes, 0);
  } finally {
    pool.query = originalQuery; global.fetch = originalFetch; console.warn = originalWarn; global.setTimeout = originalTimeout;
    if (previous === undefined) delete process.env.EXPO_PUSH_ENABLED;
    else process.env.EXPO_PUSH_ENABLED = previous;
  }
});
test('registration rejects malformed tokens and unsupported account roles', async () => {
  await assert.rejects(service.register({id:'user',role:'DRIVER'}, 'session', {token:'bad',platform:'android',enabled:true}), e => e.statusCode === 400);
  await assert.rejects(service.register({id:'user',role:'ADMIN'}, 'session', {token,platform:'android',enabled:true}), e => e.statusCode === 403);
});
test('driver and resident device registrations bind the authenticated session and never take a client user ID', async () => {
  const original = pool.query, calls=[];
  pool.query = async (sql, args) => { calls.push([sql,args]); return sql.startsWith('SELECT') ? [[{id:'session-id'}]] : [{}]; };
  try {
    for (const role of ['DRIVER','RESIDENT']) {
      const userId = role.toLowerCase();
      await service.register({id:userId,role}, 'credential', {token,platform:'android',enabled:false,user_id:'victim'});
    }
    assert.equal(calls.length, 4);
    for (const [index, role] of ['DRIVER','RESIDENT'].entries()) {
      const userId = role.toLowerCase();
      assert.match(calls[index * 2][0], /user_id = \?/); assert.equal(calls[index * 2][1][0], userId);
      assert.deepEqual(calls[index * 2 + 1][1], [token,userId,'session-id','android',false]);
    }
  } finally { pool.query=original; }
});
test('dispatch push delivery rechecks ownership and includes the message preview for the driver', async () => {
  const original=pool.query, fetchOriginal=global.fetch, calls=[];
  process.env.EXPO_PUSH_ENABLED='true';
  pool.query=async (sql,args) => { calls.push([sql,args]); return sql.startsWith('SELECT') ? [[{token,user_id:'driver',session_id:'session-id',role:'DRIVER'}]] : [{}]; };
  global.fetch=async (url, options) => { const payload=JSON.parse(options.body)[0]; assert.equal(payload.data.user_id,'driver'); assert.equal(payload.body,'Please check your next stop.'); assert.equal(payload.data.destination, 'messages'); return {ok:true,json:async()=>({data:[{status:'error',details:{error:'DeviceNotRegistered'}}]})}; };
  try { await service.sendCollectorPushAlert({id:'notice',user_id:'driver',ref_module:'driver-messages',body:'Please check your next stop.'});
    assert.match(calls[0][0], /s.expires_at > NOW\(\)/); assert.match(calls[0][0], /u.role = 'DRIVER'/); assert.match(calls[0][0], /u.status = 'ACTIVE'/); assert.match(calls[0][0], /s.user_id = p.user_id/);
    assert.match(calls[0][0], /p.enabled = TRUE/);
    assert.equal(calls[1][0],'DELETE FROM mobile_push_devices WHERE token = ? AND user_id = ? AND session_id = ?');
    assert.deepEqual(calls[1][1],[token,'driver','session-id']);
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
    assert.equal(sent.title, 'MENRO Candelaria added a new calendar event: Team briefing');
    assert.equal(sent.body, 'Scheduled for October 18, 2026.');
    assert.deepEqual(sent.data, { user_id: 'driver', notification_id: 'schedule-notice',
      ref_module: 'schedule', destination: 'notifications', notification_title: 'Team briefing',
      notification_body: 'Scheduled for October 18, 2026.' });
  } finally {
    pool.query = original; global.fetch = fetchOriginal;
    if (previous === undefined) delete process.env.EXPO_PUSH_ENABLED;
    else process.env.EXPO_PUSH_ENABLED = previous;
  }
});
test('dispatch phone previews are bounded without splitting emoji and preserve inbox text', async () => {
  const original = pool.query, fetchOriginal = global.fetch, previous = process.env.EXPO_PUSH_ENABLED;
  let sent;
  process.env.EXPO_PUSH_ENABLED = 'true';
  pool.query = async () => [[{ token, user_id: 'driver', session_id: 'session-id', role: 'DRIVER' }]];
  global.fetch = async (_url, options) => {
    sent = JSON.parse(options.body)[0];
    return { ok: true, json: async () => ({ data: [{ status: 'error' }] }) };
  };
  try {
    for (const [body, expected] of [
      ['Please check your next stop.', 'Please check your next stop.'],
      ['🚛'.repeat(241), '🚛'.repeat(240) + '…'],
      ['', ''],
    ]) {
      await service.sendCollectorPushAlert({ id: 'notice', user_id: 'driver', ref_module: 'driver-messages', body });
      assert.equal(sent.body, expected);
      assert.equal(sent.data.destination, 'messages');
      assert.equal(sent.data.user_id, 'driver');
      assert.equal(sent.priority, 'high');
      assert.equal(sent.channelId, 'dispatch-messages');
    }
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

test('resident phone preferences suppress pushes only and enabled alerts show their inbox message', async () => {
  const original = pool.query, fetchOriginal = global.fetch, previous = process.env.EXPO_PUSH_ENABLED;
  process.env.EXPO_PUSH_ENABLED = 'true';
  let enabled = false, deliveries = 0, expectedField, expectedType, sent;
  const preferences = { ANNOUNCEMENT: 'notif_announcements', NEW_POST: 'notif_new_content',
    COLLECTION_REMINDER: 'notif_collection_reminders', TRUCK_IS_NEAR: 'notif_truck_near',
    COLLECTION_DONE: 'notif_collection_done', MISSED_COLLECTION: 'notif_collection_skipped', REPORT_UPDATE: 'notif_report_updates', SYSTEM: 'notif_announcements' };
  pool.query = async (sql, params) => {
    assert.match(sql, new RegExp(`COALESCE\\(settings\\.${expectedField}, TRUE\\) = TRUE`));
    assert.match(sql, /s.expires_at > NOW\(\)/); assert.match(sql, /u.status = 'ACTIVE'/);
    assert.match(sql, /p.enabled = TRUE/); assert.equal(params[0], 'resident');
    if (expectedType === 'SYSTEM' || expectedType === 'COLLECTION_REMINDER') assert.match(sql, /COALESCE\(settings.reminder_on, TRUE\)/);
    return [enabled ? [{ token, user_id: 'resident', session_id: 'session-id', role: 'RESIDENT' }] : []];
  };
  global.fetch = async (_url, options) => {
    deliveries++;
    sent = JSON.parse(options.body)[0];
    return { ok: true, json: async () => ({ data: [{ status: 'error' }] }) };
  };
  try {
    for (const [type, field] of Object.entries(preferences)) {
      expectedField = field;
      expectedType = type;
      enabled = false;
      const before = deliveries;
      await service.sendMobilePushAlert({ id: 'notice', user_id: 'resident', type, body: 'private report' });
      assert.equal(deliveries, before);
      enabled = true;
      await service.sendMobilePushAlert({ id: 'notice', user_id: 'resident', type, body: 'private report' });
      assert.equal(deliveries, before + 1);
      assert.equal(sent.data.notification_id, 'notice');
      assert.equal(sent.body, 'private report');
    }
  } finally {
    pool.query = original; global.fetch = fetchOriginal;
    if (previous === undefined) delete process.env.EXPO_PUSH_ENABLED;
    else process.env.EXPO_PUSH_ENABLED = previous;
  }
});


test('all supported push categories use contextual inbox text and preserve their tap targets', async () => {
  const original = pool.query, originalFetch = global.fetch, previous = process.env.EXPO_PUSH_ENABLED;
  process.env.EXPO_PUSH_ENABLED = 'true';
  let role = 'RESIDENT', sent;
  pool.query = async () => [[{ token, user_id: 'owner', session_id: 'session-id', role }]];
  global.fetch = async (_url, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ data: [] }) }; };
  const rows = [
    ...['COLLECTION_REMINDER', 'TRUCK_IS_NEAR', 'COLLECTION_DONE', 'MISSED_COLLECTION', 'REPORT_UPDATE', 'SYSTEM'].map(type =>
      ({ type, title: 'Recorded update', body: 'Collection at your registered street is complete.' })),
    { type: 'ANNOUNCEMENT', ref_module: 'announcements', title: 'Weather advisory', body: 'Collection is postponed due to heavy rain.' },
    { type: 'NEW_POST', ref_module: 'posts', title: 'New Community Post', body: '"Cleanup day" is now available in Community Posts.' },
    { type: 'ANNOUNCEMENT', ref_module: 'schedule', title: 'Cleanup day', body: 'Scheduled for 2026-11-24' },
  ];
  try {
    for (const row of rows) {
      await service.sendMobilePushAlert({ ...row, id: 'notice', user_id: 'owner' });
      assert.equal(sent.length, 1);
      assert.deepEqual(sent[0].data, { notification_id: 'notice', destination: 'notifications' });
      assert.equal(sent[0].channelId, 'resident-alerts');
      if (row.ref_module === 'schedule') {
        assert.equal(sent[0].title, 'MENRO Candelaria added a new calendar event: Cleanup day');
        assert.equal(sent[0].body, 'Scheduled for November 24, 2026.');
      } else if (row.ref_module === 'posts') {
        assert.equal(sent[0].title, 'MENRO Candelaria posted a community update: Cleanup day');
        assert.equal(sent[0].body, 'Read the latest community update in Community Updates.');
      } else if (row.ref_module === 'announcements') {
        assert.equal(sent[0].title, 'MENRO Candelaria posted an announcement: Weather advisory');
        assert.equal(sent[0].body, row.body);
      } else { assert.equal(sent[0].title, row.title); assert.equal(sent[0].body, row.body); }
    }
    role = 'DRIVER';
    await service.sendMobilePushAlert({ id: 'dispatch', user_id: 'owner', ref_module: 'driver-messages', title: 'New Dispatch Message', body: 'Proceed to the next assigned stop.' });
    assert.equal(sent[0].title, 'Dispatch sent a message'); assert.equal(sent[0].body, 'Proceed to the next assigned stop.');
    assert.equal(sent[0].data.destination, 'messages'); assert.equal(sent[0].data.user_id, 'owner');
    await service.sendMobilePushAlert({ id: 'long-event', user_id: 'owner', ref_module: 'schedule', title: '🚛'.repeat(300), body: '🚛'.repeat(1000) });
    assert.ok(Buffer.byteLength(JSON.stringify(sent[0]), 'utf8') < 4096, 'calendar preview and banner data must fit the provider payload');
    assert.equal(Array.from(sent[0].body).length, 241);
  } finally {
    pool.query = original; global.fetch = originalFetch;
    if (previous === undefined) delete process.env.EXPO_PUSH_ENABLED; else process.env.EXPO_PUSH_ENABLED = previous;
  }
});
