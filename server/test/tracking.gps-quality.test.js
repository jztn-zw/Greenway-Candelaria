const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pingSchema } = require('../src/modules/tracking/tracking.schema');
const { createDistanceAccumulator } = require('../src/modules/tracking/trackingDistance');

function load(file, dependencies) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { Date, console, process: { env: {} } })(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

const now = Date.now();
const timestamp = offset => new Date(now + offset).toISOString();
const run = {
  id: 'run', driver_id: 'driver', driver_status: 'ACTIVE', status: 'ACTIVE',
  collection_started_at: timestamp(-120000), gps_expected_since: timestamp(-120000),
  is_today: 1, truck_id: 'truck', assigned_truck_id: 'truck', availability_status: 'ACTIVE',
};
const fix = overrides => ({ truck_id: 'truck', route_run_id: 'run', latitude: 14,
  longitude: 121, captured_at: timestamp(-1000), accuracy_meters: 8, ...overrides });
const previous = overrides => ({ route_run_id: 'run', latitude: 14, longitude: 121,
  captured_at: timestamp(-11000), sample_id: 'previous', ...overrides });

function fixture({ latest = previous(), route = {}, stops = [], sessions = [{ id: 'phone' }, { id: 'web' }] } = {}) {
  const queries = [];
  const notices = [];
  let clears = 0;
  const db = { async query(sql) {
    queries.push(sql);
    if (sql.startsWith('SELECT * FROM tracking_latest')) return [latest ? [latest] : []];
    if (sql.startsWith('SELECT id FROM tracking_logs')) return [[]];
    if (sql.startsWith('SELECT id FROM sessions')) return [sessions];
    if (sql.includes('FROM route_run_stops')) return [stops];
    if (sql.includes('FROM users u')) return [[{ id: 'resident', barangay_id: 'area', street_id: null }]];
    if (/^(INSERT|UPDATE|DELETE)/.test(sql)) return [{}];
    throw new Error(`Unexpected query: ${sql}`);
  } };
  const service = load('src/modules/tracking/tracking.service.js', {
    '../../config/db': { pool: { query: async () => [[{ id: 'run' }]] } },
    '../../utils/generateId': () => 'sample',
    './streetCoverage.service': {}, '../notifications/notifications.service': {
      sendToMany: async notice => { notices.push(notice); return { notifications: [] }; },
    },
    '../users/residentLocation': {}, './trackingAccess': { todaySql: 'fixture_today' },
    '../routes/routeLifecycle.service': { withRun: async (_id, _user, work) => work({
      db, run: { ...run, ...route }, notifications: [], clearAlert: () => clears++,
    }) },
  });
  return { ping: service.ping, queries, notices, clears: () => clears };
}

test('only one active session can own a run GPS source', async () => {
  const f = fixture({ route: { gps_session_id: 'phone' } });
  const result = await f.ping('user', fix(), 'web');
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'gps_device_in_use');
  assertUntouched(f);
  assert.equal((await f.ping('user', fix(), 'phone')).accepted, true);
});

test('first accepted GPS claims a run; expired or signed-out owners allow switching', async () => {
  for (const owner of [null, 'old-phone']) {
    const f = fixture({ route: { gps_session_id: owner } });
    assert.equal((await f.ping('user', fix(), 'web')).accepted, true);
    assert.ok(f.queries.some(sql => sql.startsWith('UPDATE route_runs SET gps_session_id')));
  }
});

test('GPS ownership survives reconnects but allows switching after a two-minute upload gap', async () => {
  const f = fixture({ route: { gps_session_id: 'phone' }, latest: previous({ captured_at: timestamp(-121000) }) });
  assert.equal((await f.ping('user', fix(), 'web')).accepted, true);
  assert.ok(f.queries.some(sql => sql.startsWith('UPDATE route_runs SET gps_session_id')));
});

test('unmigrated tracking fails closed and revoked sessions cannot claim GPS', async () => {
  let f = fixture();
  await assert.rejects(f.ping('user', fix(), 'web'), error => error.statusCode === 503);
  assertUntouched(f);
  f = fixture({ route: { gps_session_id: null }, sessions: [] });
  await assert.rejects(f.ping('user', fix(), 'web'), error => error.statusCode === 401);
  assertUntouched(f);
});

function assertUntouched(f) {
  assert.equal(f.queries.some(sql => /^(INSERT|UPDATE|DELETE)/.test(sql)), false);
  assert.equal(f.queries.some(sql => sql.includes('FROM route_run_stops')), false,
    'rejected GPS must not evaluate proximity notifications');
  assert.equal(f.clears(), 0);
  assert.equal(f.notices.length, 0);
}

test('GPS schema preserves optional accuracy and still accepts older clients', () => {
  const sample = { truck_id: 'truck', latitude: 14, longitude: 121, accuracy_meters: 8 };
  assert.equal(pingSchema.parse(sample).accuracy_meters, 8);
  assert.equal(pingSchema.safeParse({ truck_id: 'truck', latitude: 14, longitude: 121 }).success, true);
  for (const value of [null, -1, Infinity, NaN, '8']) {
    assert.equal(pingSchema.safeParse({ ...sample, accuracy_meters: value }).success, false);
  }
});

test('inaccurate GPS does not save, clear an outage or trigger proximity', async () => {
  const f = fixture({ route: { gps_alert_at: timestamp(-60000) } });
  const result = await f.ping('user', fix({ accuracy_meters: 200 }));
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'gps_accuracy');
  assertUntouched(f);
});

test('a GPS teleport cannot replace the last accepted truck position', async () => {
  const f = fixture({ route: { gps_alert_at: timestamp(-60000) } });
  const result = await f.ping('user', fix({ latitude: 14.02 }));
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'gps_jump');
  assertUntouched(f);
});

test('normal movement and stationary fixes keep their existing write/proximity flow', async () => {
  for (const latitude of [14, 14.0005]) {
    const f = fixture();
    const result = await f.ping('user', fix({ latitude }));
    assert.equal(result.accepted, true);
    assert.ok(f.queries.some(sql => sql.startsWith('INSERT INTO tracking_logs')));
    assert.ok(f.queries.some(sql => sql.startsWith('INSERT INTO tracking_latest')));
    assert.ok(f.queries.some(sql => sql.includes('FROM route_run_stops')));
  }
});

test('accepted GPS still creates the existing approaching notice for eligible residents', async () => {
  const f = fixture({ stops: [{ id: 'stop', barangay_id: 'area', latitude: 14, longitude: 121, location: 'Fixture Area' }] });
  assert.equal((await f.ping('user', fix())).accepted, true);
  assert.equal(f.notices.length, 1);
  assert.equal(f.notices[0].type, 'TRUCK_IS_NEAR');
  assert.equal(f.notices[0].user_ids[0], 'resident');
  assert.ok(f.queries.some(sql => sql.startsWith('INSERT INTO route_run_proximity_receipts')));
});

test('a fresh accurate fix can recover after a gap or a new run', async () => {
  for (const latest of [null, previous({ captured_at: timestamp(-32000) }), previous({ route_run_id: 'old-run' })]) {
    const f = fixture({ latest });
    assert.equal((await f.ping('user', fix({ latitude: 14.02 }))).accepted, true);
  }
});

test('resuming a route does not compare movement across the paused interval', async () => {
  const f = fixture({ route: { gps_expected_since: timestamp(-5000) } });
  assert.equal((await f.ping('user', fix({ latitude: 14.02 }))).accepted, true);
});

test('accuracy boundary and legacy payloads remain usable', async () => {
  for (const accuracy of [0, 50, undefined]) {
    const f = fixture();
    assert.equal((await f.ping('user', fix({ accuracy_meters: accuracy }))).accepted, true);
  }
});

test('duplicate, out of order and too-frequent samples remain ignored', async () => {
  for (const overrides of [{ captured_at: timestamp(-12000) }, { captured_at: timestamp(-10000) }, { sample_id: 'previous' }]) {
    const f = fixture();
    assert.equal((await f.ping('user', fix(overrides))).accepted, false);
    assertUntouched(f);
  }
});

test('paused, ended, reassigned and revoked-driver runs still reject all GPS', async () => {
  for (const route of [{ status: 'PAUSED' }, { status: 'COMPLETED' }, { assigned_truck_id: 'other' },
    { driver_status: 'INACTIVE' }, { driver_deleted_at: timestamp(-1000) }, { is_today: 0 }]) {
    const f = fixture({ route });
    await assert.rejects(() => f.ping('user', fix()), error => error.statusCode === 409);
    assertUntouched(f);
  }
});

test('expired and pre-resume samples still reject before writes', async () => {
  for (const [sample, route] of [[{ captured_at: timestamp(-130000) }, {}],
    [{}, { gps_expected_since: timestamp(-500) }], [{ captured_at: timestamp(15000) }, {}]]) {
    const f = fixture({ route });
    await assert.rejects(() => f.ping('user', fix(sample)), error => error.statusCode === 422);
    assertUntouched(f);
  }
});

test('rejected GPS does not schedule a live broadcast', async () => {
  for (const accepted of [false, true]) {
    let broadcasts = 0;
    const controller = load('src/modules/tracking/tracking.controller.js', {
      './tracking.service': { ping: async () => ({ accepted }) },
      './tracking.schema': { pingSchema: { parse: value => value } },
      '../../utils/apiResponse': { success: (_res, result) => result },
      '../../sockets/tracking.socket': { broadcastLiveUpdate: () => broadcasts++ },
    });
    await controller.ping({ body: {}, user: { id: 'user' }, app: { get: () => ({}) } }, {}, error => { throw error; });
    assert.equal(broadcasts, accepted ? 1 : 0);
  }
});

test('distance calculation never bridges a GPS teleport or a recording gap', () => {
  const state = createDistanceAccumulator();
  for (const [offset, latitude] of [[-100000, 14], [-90000, 14.0005], [-80000, 14.02],
    [-70000, 14.0005], [-60000, 14.001], [-10000, 14.1]]) {
    state.add({ route_run_id: 'run', latitude, longitude: 121, captured_at: timestamp(offset) });
  }
  const result = state.summary();
  assert.equal(result.rejected_points, 1);
  assert.equal(result.gap_count, 1);
  assert.ok(result.distance_km > 0.10 && result.distance_km < 0.12);
});
