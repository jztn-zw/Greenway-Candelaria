const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("../../client/node_modules/typescript");

function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { console, Promise })(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

function fixture(app, { delayedCleanup = false, persisted = "old-token" } = {}) {
  let state = { token: "old-token", user: { id: "owner" }, isAuthenticated: true };
  let stored = persisted;
  let clears = 0;
  let release;
  let responseError;
  const notices = [];
  const gate = delayedCleanup ? new Promise(resolve => { release = resolve; }) : Promise.resolve();
  const cleanup = load(path.resolve(__dirname, `../../${app}/src/services/sessionCleanup.ts`));
  const api = { interceptors: { request: { use() {} }, response: { use(_ok, failure) { responseError = failure; } } } };
  const store = { getState: () => state, setState: values => { state = { ...state, ...values }; } };
  const module = load(path.resolve(__dirname, `../../${app}/src/services/api.ts`), {
    axios: { default: { create: () => api, isCancel: () => false } },
    "../config/env": { API_BASE_URL: "https://fixture.invalid/api" },
    "./storage": { tokenStorage: { getToken: async () => stored, clearAll: async () => { await gate; clears++; stored = null; } } },
    "./rateLimit": { getRetryAfterSeconds: () => 60 },
    "./appNotice": { reportApiAvailability() {} },
    "./appAlert": { Alert: { alert: (...args) => notices.push(args) } },
    "./sessionCleanup": cleanup,
    "../store/authStore": { useAuthStore: store },
  });
  if (app === "residentapp") module.configureApiSession({ token: () => state.token, revoked: () => store.setState({ token: null, user: null, isAuthenticated: false }) });
  else module.configureApiSession(() => state.token);
  const respond = (token = "old-token", status = 401, code = "SESSION_REPLACED") => responseError({
    config: { url: "/auth/session", headers: { Authorization: `Bearer ${token}` } },
    ...(status ? { response: { status, data: { code, message: "Fixture response" } } } : {}),
  }).catch(error => error);
  return { respond, notices, state: () => state, store, clears: () => clears, release, cleanup, stored: () => stored, save: token => { stored = token; } };
}

for (const app of ["residentapp", "driverapp"]) {
  test(`${app}: replacement signs out once and explains why`, async () => {
    const f = fixture(app);
    await Promise.all([f.respond(), f.respond()]);
    assert.equal(f.state().token, null);
    assert.equal(f.clears(), 1);
    assert.equal(f.notices.length, 1);
    assert.equal(f.notices[0][0], "Signed in elsewhere");
    assert.match(f.notices[0][1], /another browser or device/);
  });

  test(`${app}: stale 401 cannot clear a newer local login`, async () => {
    const f = fixture(app);
    f.store.setState({ token: "new-token" });
    f.save("new-token");
    await f.respond();
    assert.equal(f.state().token, "new-token");
    assert.equal(f.stored(), "new-token");
    assert.equal(f.notices.length, 0);
  });

  test(`${app}: offline and 5xx failures keep the session`, async () => {
    const f = fixture(app);
    await f.respond("old-token", 0);
    await f.respond("old-token", 503);
    assert.equal(f.state().token, "old-token");
    assert.equal(f.clears(), 0);
    assert.equal(f.notices.length, 0);
  });

  test(`${app}: new credential persistence waits for an older cleanup`, async () => {
    const f = fixture(app, { delayedCleanup: true });
    const eviction = f.respond();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.state().token, null);
    let saved = false;
    const login = f.cleanup.waitForSessionCleanup().then(() => { f.save("new-token"); f.store.setState({ token: "new-token" }); saved = true; });
    assert.equal(saved, false);
    f.release();
    await Promise.all([eviction, login]);
    assert.equal(saved, true);
    assert.equal(f.state().token, "new-token");
    assert.equal(f.stored(), "new-token");
  });

  test(`${app}: a temporary session still ends without deleting a newer stored credential`, async () => {
    const f = fixture(app, { persisted: "different-token" });
    await f.respond();
    assert.equal(f.state().token, null);
    assert.equal(f.stored(), "different-token");
    assert.equal(f.clears(), 0);
    assert.equal(f.notices.length, 1);
  });
}
