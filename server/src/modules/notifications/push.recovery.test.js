const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const service = require('./push.service');
after(() => pool.end());

async function fixture(run) {
  const old = { query: pool.query, fetch: global.fetch, timeout: global.setTimeout, warn: console.warn, enabled: process.env.EXPO_PUSH_ENABLED };
  const state = { eligible: true, queries: [], sent: [], timers: [], warnings: [] };
  process.env.EXPO_PUSH_ENABLED = 'true';
  console.warn = value => state.warnings.push(value);
  global.setTimeout = (callback, delay) => {
    if (delay < 60000) { queueMicrotask(callback); return { unref() {} }; }
    state.timers.push(callback); return { unref() {} };
  };
  pool.query = async (sql, params) => {
    state.queries.push([sql, params]);
    return [sql.startsWith('SELECT') && state.eligible ? [{ token: 'ExpoPushToken[device]', user_id: 'resident', session_id: 'session', role: 'RESIDENT', registration_version: 'original-registration' }] : []];
  };
  try { await run(state); }
  finally { pool.query = old.query; global.fetch = old.fetch; global.setTimeout = old.timeout; console.warn = old.warn;
    if (old.enabled === undefined) delete process.env.EXPO_PUSH_ENABLED; else process.env.EXPO_PUSH_ENABLED = old.enabled; }
}
const notice = { id: 'notice', user_id: 'resident', type: 'ANNOUNCEMENT', title: 'Advisory', body: 'Notice' };

test('permanent credentials/payload failures are never retried and temporary failure attempts are bounded', async () => fixture(async () => {
  for (const [status, expected] of [[400, 1], [401, 1], [429, 3], [503, 3]]) {
    let calls = 0;
    global.fetch = async () => { calls++; return { ok: false, status }; };
    await service.sendMobilePushAlert(notice);
    assert.equal(calls, expected);
  }
}));

test('temporary provider failures retry, rechecking device authorization before each send', async () => fixture(async state => {
  let calls = 0;
  global.fetch = async () => ++calls === 1 ? { ok: false, status: 503 } : { ok: true, json: async () => ({ data: [{ status: 'ok', id: 'receipt' }] }) };
  await service.sendMobilePushAlert(notice);
  assert.equal(calls, 2);
  assert.equal(state.queries.filter(([sql]) => sql.startsWith('SELECT')).length, 2);
}));

test('revocation or opt-out during backoff cancels delivery instead of replaying the old device selection', async () => fixture(async state => {
  let calls = 0;
  global.fetch = async () => { calls++; state.eligible = false; return { ok: false, status: 503 }; };
  await service.sendMobilePushAlert(notice);
  assert.equal(calls, 1);
  assert.equal(state.queries.filter(([sql]) => sql.startsWith('SELECT')).length, 2);
}));

test('only temporary failed tickets are retried and already accepted devices are not sent twice', async () => fixture(async state => {
  pool.query = async () => [[
    { token: 'ExpoPushToken[accepted]', user_id: 'resident', session_id: 'session', role: 'RESIDENT' },
    { token: 'ExpoPushToken[throttled]', user_id: 'resident', session_id: 'session', role: 'RESIDENT' },
  ]];
  global.fetch = async (_url, options) => {
    const payload = JSON.parse(options.body); state.sent.push(payload.map(item => item.to));
    return { ok: true, json: async () => ({ data: state.sent.length === 1
      ? [{ status: 'ok', id: 'accepted-receipt' }, { status: 'error', details: { error: 'MessageRateExceeded' } }]
      : [{ status: 'ok', id: 'retry-receipt' }] }) };
  };
  await service.sendMobilePushAlert(notice);
  assert.deepEqual(state.sent, [['ExpoPushToken[accepted]', 'ExpoPushToken[throttled]'], ['ExpoPushToken[throttled]']]);
}));

test('invalid receipts are retained for native recovery and cannot invalidate a same-second refreshed registration', async () => fixture(async state => {
  let calls = 0;
  global.fetch = async url => {
    calls++;
    return { ok: true, json: async () => ({ data: url.endsWith('/send') ? [{ status: 'ok', id: 'receipt' }]
      : { receipt: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }) };
  };
  await service.sendMobilePushAlert(notice);
  await state.timers[0]();
  const update = state.queries.find(([sql]) => sql.startsWith('UPDATE'));
  assert.match(update[0], /registration_version <=> \?/);
  assert.equal(update[1].at(-1), 'original-registration');
  assert.equal(state.queries.some(([sql]) => sql.startsWith('DELETE')), false);
  assert.equal(calls, 2);
}));

test('modern registration requests renew rejected tokens while legacy clients keep their existing response contract', async () => fixture(async state => {
  pool.query = async (sql, params) => {
    state.queries.push([sql, params]);
    if (sql.includes('FROM sessions')) return [[{ id: 'live-session' }]];
    if (sql.startsWith('SELECT') && sql.includes('last_error = ?')) return [[{ registration_version: 'rejected-version' }]];
    return [{}];
  };
  const user = { id: 'resident', role: 'RESIDENT' };
  const input = { token: 'ExpoPushToken[device]', platform: 'android', enabled: true, supports_token_recovery: true };
  assert.deepEqual(await service.register(user, 'credential', input), { registered: false, refresh_token: true, recovery_version: 'rejected-version', service_enabled: true });
  assert.equal(state.queries.some(([sql]) => sql.startsWith('INSERT')), false);
  const legacy = await service.register(user, 'credential', { ...input, supports_token_recovery: undefined });
  assert.equal(legacy.registered, true);
  assert.equal(Object.hasOwn(legacy, 'refresh_token'), false);
}));

test('heartbeats preserve the native enrollment version while opt-outs preserve a known rejection', async () => fixture(async state => {
  pool.query = async (sql, params) => { state.queries.push([sql, params]); return sql.includes('FROM sessions') ? [[{ id: 'session' }]] : [{}]; };
  for (let i = 0; i < 2; i++) await service.register({ id: 'resident', role: 'RESIDENT' }, 'credential', {
    token: 'ExpoPushToken[device]', platform: 'android', enabled: false, supports_token_recovery: true,
  });
  const inserts = state.queries.filter(([sql]) => sql.startsWith('INSERT'));
  assert.notEqual(inserts[0][1][5], inserts[1][1][5]);
  assert.match(inserts[0][0], /registration_version = IF\(user_id = VALUES\(user_id\) AND session_id = VALUES\(session_id\)/);
  assert.match(inserts[0][0], /native_token_hash <=> VALUES\(native_token_hash\), COALESCE\(registration_version, VALUES\(registration_version\)\)/);
  assert.match(inserts[0][0], /last_error = IF\(VALUES\(enabled\) = TRUE AND/);
  assert.match(inserts[0][0], /OR NOT \(native_token_hash <=> VALUES\(native_token_hash\)\)\), NULL, last_error\)/);
}));

test('a receipt racing with an unchanged heartbeat is preserved and returned as a renewal request', async () => fixture(async state => {
  let checks = 0;
  pool.query = async (sql, params) => {
    if (sql.includes('FROM sessions')) return [[{ id: 'session' }]];
    if (sql.startsWith('INSERT')) {
      assert.equal(params.at(-1), 1);
      assert.match(sql, /last_error = IF\(VALUES\(enabled\) = TRUE AND \(\? = 0 OR user_id <> VALUES\(user_id\)/);
      state.queries.push([sql, params]); return [{}];
    }
    return [++checks === 1 ? [] : [{ registration_version: 'racing-rejection' }]];
  };
  const result = await service.register({ id: 'resident', role: 'RESIDENT' }, 'credential', {
    token: 'ExpoPushToken[device]', platform: 'android', enabled: true, supports_token_recovery: true, native_token: 'unchanged-native',
  });
  assert.equal(result.registered, false); assert.equal(result.recovery_version, 'racing-rejection');
}));

test('native renewal acknowledges the exact rejection even when the Expo token remains identical', async () => fixture(async state => {
  let registrationVersion = 'old-version', invalid = true;
  pool.query = async (sql, params) => {
    state.queries.push([sql, params]);
    if (sql.includes('FROM sessions')) return [[{ id: 'session' }]];
    if (sql.startsWith('SELECT')) return [invalid ? [{ registration_version: registrationVersion, native_token_hash: null }] : []];
    if (sql.startsWith('UPDATE') && params.at(-2) === registrationVersion) { registrationVersion = params[3]; invalid = false; return [{ affectedRows: 1 }]; }
    return [{ affectedRows: 0 }];
  };
  const input = { token: 'ExpoPushToken[device]', platform: 'android', enabled: true, supports_token_recovery: true };
  const first = await service.register({ id: 'resident', role: 'RESIDENT' }, 'credential', input);
  assert.equal(first.recovery_version, 'old-version');
  const stale = await service.register({ id: 'resident', role: 'RESIDENT' }, 'credential', { ...input, renewed_token_version: 'wrong-version' });
  assert.equal(stale.registered, false);
  const renewed = await service.register({ id: 'resident', role: 'RESIDENT' }, 'credential', { ...input, renewed_token_version: first.recovery_version });
  assert.equal(renewed.registered, true);
  assert.equal(invalid, false); assert.notEqual(registrationVersion, 'old-version');
}));
