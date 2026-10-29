const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../../client/node_modules/typescript');

const root = path.resolve(__dirname, '../..');
function load(file, dependencies, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { Date, console, AbortController, ...globals })(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

function fixture({ accuracy = 8, receipt = { accepted: true }, late = false } = {}) {
  const effects = [], states = [], sent = [], timers = [];
  let stateIndex = 0, callback;
  const globals = {
    navigator: { onLine: true, geolocation: { getCurrentPosition: success => { callback = success; } } },
    window: { addEventListener() {}, removeEventListener() {} },
    crypto: { randomUUID: () => 'fixture-sample' },
    setTimeout: work => { timers.push(work); return timers.length; }, clearTimeout() {},
    setInterval: () => 1, clearInterval() {},
  };
  const { useLiveTracking } = load('client/src/features/collector/route-map/hooks/useLiveTracking.ts', {
    react: {
      useState: initial => { const index = stateIndex++; states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], value => { states[index] = value; }]; },
      useEffect: work => { effects.push(work); },
    },
    '@/services/trackingService': { pingLocation: async (...args) => { sent.push(args); return receipt; } },
    '@/lib/serverClock': { getSystemNow: () => Date.now() },
  }, globals);
  useLiveTracking({ truckId: 'truck', routeId: 'run', isRouteEnded: false });
  const cleanup = effects.map(work => work());
  if (late) cleanup.forEach(work => work?.());
  return { states, sent, timers, sample: () => callback({
    coords: { latitude: 14, longitude: 121, accuracy }, timestamp: Date.now() - 1000,
  }) };
}

test('browser tracking rejects imprecise fixes before upload', async () => {
  for (const accuracy of [200, NaN, -1]) {
    const f = fixture({ accuracy });
    await f.sample();
    assert.equal(f.sent.length, 0);
    assert.equal(f.states[0], null);
    assert.match(f.states[2], /accuracy|precise/i);
    assert.equal(f.timers.length, 1);
  }
});

test('browser sends accuracy and confirms only accepted fixes', async () => {
  const f = fixture();
  await f.sample();
  assert.equal(f.sent[0][3].accuracy_meters, 8);
  assert.equal(f.states[0][0], 14);
  assert.ok(f.states[3]);
  assert.equal(f.states[2], null);
});

test('server-rejected browser fixes do not move the marker and keep retrying', async () => {
  for (const reason of ['gps_jump', 'gps_accuracy', 'duplicate_or_older']) {
    const f = fixture({ receipt: { accepted: false, reason } });
    await f.sample();
    assert.equal(f.states[0], null);
    assert.equal(f.states[3], null);
    assert.equal(f.timers.length, 1);
  }
});

test('browser cleanup ignores late sensor callbacks', async () => {
  const f = fixture({ late: true });
  await f.sample();
  assert.equal(f.sent.length, 0);
  assert.equal(f.states[0], null);
  assert.equal(f.states[3], null);
});

test('web transport returns the actual server acceptance receipt', async () => {
  let payload;
  const receipt = { accepted: false, reason: 'gps_jump' };
  const { pingLocation } = load('client/src/services/trackingService.ts', {
    '@/lib/api': { post: async (_url, data) => { payload = data; return { data: { data: receipt } }; } },
    '@/services/authService': { getCurrentUser: () => ({ role: 'DRIVER' }) },
  });
  const sample = { route_run_id: 'run', sample_id: 'sample', captured_at: new Date().toISOString(), accuracy_meters: 8 };
  assert.equal(await pingLocation('truck', 14, 121, sample), receipt);
  assert.equal(payload.accuracy_meters, 8);
});

test('replay keeps breaks around GPS teleports and gaps without inventing road travel', () => {
  const { parseApiTimestamp } = load('client/src/utils/apiTimestamp.ts', {});
  const { buildReplayTrip } = load('client/src/features/admin/truck-tracking/utils/replayTrip.ts', {
    '@/utils/date': { parseApiTimestamp },
  });
  const base = Date.parse('2026-01-01T00:00:00Z');
  const trip = buildReplayTrip([[0, 14], [10000, 14.0005], [20000, 14.02], [30000, 14.0005],
    [40000, 14.001], [90000, 14.1]].map(([offset, latitude]) => ({
    latitude, longitude: 121, route_run_id: 'run', created_at: new Date(base + offset).toISOString(),
  })));
  assert.equal(trip.excludedPoints, 1);
  assert.equal(trip.gapCount, 1);
  assert.equal(trip.breakBefore.filter(Boolean).length, 2);
  assert.ok(trip.distanceKm > 0.10 && trip.distanceKm < 0.12);
  assert.ok(!trip.path.some(point => point[0] === 14.02));
});
