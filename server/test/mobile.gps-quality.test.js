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
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    Date, console, setTimeout, clearTimeout, setInterval, clearInterval, AbortController, ...globals,
  })(name => {
    if (name.endsWith('/gpsQuality')) return load('driverapp/src/services/gpsQuality.ts', {});
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const location = (accuracy = 8, age = 1000) => ({
  timestamp: Date.now() - age, coords: { latitude: 14, longitude: 121, accuracy },
});

function foreground({ sample = location(), cached = null, receipt = { accepted: true }, afterPing } = {}) {
  const sent = [];
  let acquired = 0, cacheOptions;
  const auth = { token: 'fixture-token', user: { id: 'user', role: 'DRIVER' } };
  const store = load('driverapp/src/store/shiftStore.ts', {
    zustand: { create: initialize => {
      let state;
      const set = patch => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; };
      const get = () => state;
      state = initialize(set, get);
      return { getState: get, setState: set };
    } },
    'expo-location': {
      Accuracy: { High: 4 }, hasServicesEnabledAsync: async () => true,
      getForegroundPermissionsAsync: async () => ({ status: 'granted' }),
      getBackgroundPermissionsAsync: async () => ({ status: 'granted' }),
      getLastKnownPositionAsync: async options => { cacheOptions = options; return cached; },
      getCurrentPositionAsync: async () => { acquired++; return sample; },
    },
    'react-native': { Platform: { OS: 'android' } },
    '../services/trackingService': { trackingService: { pingLocation: async (...args) => {
      sent.push(args); afterPing?.(); return receipt;
    } } },
    './routeStopActions': {}, './authStore': { useAuthStore: { getState: () => auth, subscribe() {} } },
    '../services/driverService': {}, '../services/backgroundGps': {}, '../query/queryClient': {},
    './locationSettingsStore': { useLocationSettingsStore: { getState: () => ({ ready: true, enabled: true, accountId: 'user' }) } },
  }).useShiftStore;
  store.setState({ route: { route_id: 'run', truck_id: 'truck', route_status: 'IN_PROGRESS', stops: [] } });
  return { store, sent, acquired: () => acquired, cacheOptions: () => cacheOptions, auth };
}

test('new native fixes with poor or missing accuracy never reach the API', async () => {
  for (const accuracy of [51, 200, null, NaN, -1]) {
    const f = foreground({ sample: location(accuracy) });
    assert.equal(await f.store.getState().sendSinglePing(), false);
    assert.equal(f.sent.length, 0);
    assert.match(f.store.getState().gpsError, /accuracy|precise/i);
  }
});

test('native tracking waits for fresh GPS instead of uploading a stale fix', async () => {
  for (const age of [31000, -5000]) {
    const f = foreground({ sample: location(8, age) });
    assert.equal(await f.store.getState().sendSinglePing(), false);
    assert.equal(f.sent.length, 0);
  }
});

test('an imprecise cached fix falls through to fresh acquisition', async () => {
  const f = foreground({ cached: location(75) });
  assert.equal(await f.store.getState().sendSinglePing(), true);
  assert.equal(f.acquired(), 1);
  assert.equal(f.cacheOptions().requiredAccuracy, 50);
  assert.equal(f.sent[0][5], 8, 'upload the measured accuracy');
});

test('an accurate cached fix avoids another sensor request', async () => {
  const f = foreground({ cached: location() });
  assert.equal(await f.store.getState().sendSinglePing(), true);
  assert.equal(f.acquired(), 0);
  assert.equal(f.sent[0][5], 8);
  assert.equal(f.store.getState().currentLocation.latitude, 14);
  assert.ok(f.store.getState().lastGpsSentAt);
});

test('server-rejected fixes do not move the native truck or confirm an upload', async () => {
  for (const reason of ['gps_jump', 'gps_accuracy']) {
    const f = foreground({ receipt: { accepted: false, reason } });
    const old = { latitude: 14.001, longitude: 121 };
    f.store.setState({ currentLocation: old });
    assert.equal(await f.store.getState().sendSinglePing(), false);
    assert.equal(f.store.getState().currentLocation, old);
    assert.equal(f.store.getState().lastGpsSentAt, null);
    assert.match(f.store.getState().gpsError, /GPS|accuracy/i);
  }
});

test('late GPS acknowledgements cannot update a stopped session', async () => {
  let f;
  f = foreground({ afterPing: () => f.store.getState().stopGpsTracking() });
  assert.equal(await f.store.getState().sendSinglePing(), false);
  assert.equal(f.store.getState().currentLocation, null);
  assert.equal(f.store.getState().lastGpsSentAt, null);
});

test('native transport sends optional accuracy and preserves the server receipt', async () => {
  let payload;
  const receipt = { accepted: false, reason: 'gps_jump' };
  const { trackingService } = load('driverapp/src/services/trackingService.ts', {
    './api': { post: async (_url, data) => { payload = data; return { data: { data: receipt } }; } },
    '../query/queryClient': {},
  });
  assert.equal(await trackingService.pingLocation('truck', 14, 121, 'run', Date.now(), 8), receipt);
  assert.equal(payload.accuracy_meters, 8);
  assert.equal(payload.route_run_id, 'run');
});

function background({ receipt = { accepted: true }, userId = 'user' } = {}) {
  let callback;
  const sent = [];
  const saved = new Map([['greenway_background_route', JSON.stringify({
    token: 'fixture-token', userId: 'user', routeId: 'run', truckId: 'truck',
  })]]);
  const service = load('driverapp/src/services/backgroundGps.ts', {
    'react-native': { AppState: { currentState: 'background' }, Platform: { OS: 'android' } },
    'expo-constants': { executionEnvironment: 'standalone' },
    'expo-location': { hasStartedLocationUpdatesAsync: async () => false },
    'expo-task-manager': { defineTask: (_name, work) => { callback = work; } },
    'expo-secure-store': { getItemAsync: async key => saved.get(key),
      setItemAsync: async (key, value) => { saved.set(key, value); }, deleteItemAsync: async key => { saved.delete(key); } },
    axios: { post: async (_url, data) => { sent.push(data); return { status: 201, data: { data: receipt } }; } },
    './storage': { tokenStorage: { getToken: async () => 'fixture-token', getUser: async () => ({ id: userId, role: 'DRIVER' }) } },
    '../config/env': { API_BASE_URL: 'https://fixture.invalid' },
    '../store/locationSettingsStore': { locationPreferenceKey: () => 'fixture-preference' },
    './appAlert': {}, './trackingPower': {},
  });
  return { send: locations => callback({ data: { locations } }), saved, sent, service };
}

test('screen-lock tracking filters inaccurate and stale fixes too', async () => {
  for (const sample of [location(200), location(null), location(8, 31000)]) {
    const f = background();
    await f.send([sample]);
    assert.equal(f.sent.length, 0);
    assert.equal(f.saved.has('greenway_last_background_upload'), false);
    assert.match(f.service.backgroundGpsStatus(), /accuracy|fresh|outdated/i);
  }
});

test('a mixed background batch selects a recent accurate fix and sends its accuracy', async () => {
  const f = background();
  await f.send([location(8, 5000), location(200, 1000)]);
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].accuracy_meters, 8);
  assert.ok(f.saved.has('greenway_last_background_upload'));
});

test('rejected background fixes retry without stopping the route service', async () => {
  const receipt = { accepted: false, reason: 'gps_jump' };
  const f = background({ receipt });
  await f.send([location()]);
  assert.equal(f.saved.has('greenway_last_background_upload'), false);
  assert.ok(f.saved.has('greenway_background_route'));
  assert.match(f.service.backgroundGpsStatus(), /GPS|jump/i);
  receipt.accepted = true;
  await f.send([location()]);
  assert.equal(f.sent.length, 2);
  assert.ok(f.saved.has('greenway_last_background_upload'));
});

test('background GPS cannot upload for a replaced account', async () => {
  const f = background({ userId: 'other-user' });
  await f.send([location()]);
  assert.equal(f.sent.length, 0);
  assert.equal(f.saved.has('greenway_background_route'), false);
});
