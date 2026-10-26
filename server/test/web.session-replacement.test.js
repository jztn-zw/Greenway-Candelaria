const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("../../client/node_modules/typescript");

function fixture() {
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  };
  const localStorage = storage(), sessionStorage = storage(), redirects = [];
  localStorage.setItem("token", "current-token");
  let rejected;
  let request;
  let sharedSignIn = false;
  const globals = { console: { error() {} }, localStorage, sessionStorage, window: { location: { replace: url => redirects.push(url) } } };
  function load(file, deps) {
    const text = fs.readFileSync(path.resolve(__dirname, "../../client/src", file), "utf8").replaceAll("import.meta.env.VITE_API_URL", '"https://fixture.invalid/api"');
    const source = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(`(function(require,module,exports){${source}\n})`, globals)(name => {
      if (!(name in deps)) throw new Error(`Unexpected dependency: ${name}`);
      return deps[name];
    }, module, module.exports);
    return module.exports;
  }
  const authStorage = {
    getAuthStorage: () => sessionStorage.getItem("token") ? sessionStorage : localStorage,
    clearAuthStorage: () => { for (const store of [localStorage, sessionStorage]) for (const key of ["token", "user", "auth-storage"]) store.removeItem(key); },
    isBrowserSignInPending: () => sharedSignIn,
  };
  const replacement = load("lib/sessionReplaced.ts", { "./authStorage": authStorage });
  const api = load("lib/api.ts", {
    axios: { default: { isCancel: () => false, CanceledError: class extends Error {}, create: () => ({ interceptors: { request: { use(handler) { request = handler; } }, response: { use(_ok, failure) { rejected = failure; } } } }) } },
    "./authStorage": authStorage,
    "./sessionReplaced": replacement,
    "./rateLimit": { getRetryAfterSeconds: () => 60 },
    "./feedbackMessages": { getActionErrorMessage: () => "Fixture error", safeFeedbackMessage: text => text },
  });
  return { localStorage, sessionStorage, redirects, replacement, sharedSignIn: value => { sharedSignIn = value; }, configure: api.configureWebApiSession, request: config => request(config), reject: ({ token = "current-token", url = "/auth/session", status = 401, code = "SESSION_REPLACED" } = {}) => rejected({ config: { url, headers: { Authorization: `Bearer ${token}` } }, ...(status ? { response: { status, data: { code } } } : {}) }).catch(() => {}) };
}

test("a replaced web session clears credentials and persists its warning before navigating", async () => {
  const f = fixture();
  await f.reject();
  assert.deepEqual(f.redirects, ["/login"]);
  assert.equal(f.localStorage.getItem("token"), null);
  assert.equal(f.sessionStorage.getItem("greenway-session-replaced"), "true");
  assert.equal(f.localStorage.getItem("greenway-session-replaced"), "true");
});

test("a stale 401 cannot evict a newer browser login", async () => {
  const f = fixture();
  f.localStorage.setItem("token", "new-token");
  await f.reject();
  assert.deepEqual(f.redirects, []);
  assert.equal(f.localStorage.getItem("token"), "new-token");
  assert.equal(f.sessionStorage.getItem("greenway-session-replaced"), null);
});

test("a login failure does not clear an existing web session", async () => {
  const f = fixture();
  await f.reject({ url: "/auth/login" });
  assert.deepEqual(f.redirects, []);
  assert.equal(f.localStorage.getItem("token"), "current-token");
});

test("network and server failures cannot evict the browser session", async () => {
  const f = fixture();
  await f.reject({ status: 0 });
  await f.reject({ status: 503 });
  assert.deepEqual(f.redirects, []);
  assert.equal(f.localStorage.getItem("token"), "current-token");
});

test("a previous account's screen cannot dispatch requests with the new browser account's token", () => {
  const f = fixture();
  f.configure(() => "previous-account-token");
  const config = { headers: {} };
  assert.throws(() => f.request(config), /Browser account changed/);
  assert.equal(config.headers.Authorization, undefined);
});

test("a pending sign-in is not interrupted by the previous session's 401", async () => {
  const f = fixture();
  let pending = true;
  f.configure(() => "current-token", () => pending);
  await f.reject();
  assert.deepEqual(f.redirects, []);
  assert.equal(f.localStorage.getItem("token"), "current-token");
  pending = false;
  await f.reject();
  assert.deepEqual(f.redirects, ["/login"]);
});

test("a peer tab's pending sign-in can hand off without a false replacement warning", async () => {
  const f = fixture();
  f.sharedSignIn(true);
  await f.reject();
  assert.deepEqual(f.redirects, []);
  assert.equal(f.localStorage.getItem("token"), "current-token");
  f.sharedSignIn(false);
  await f.reject();
  assert.deepEqual(f.redirects, ["/login"]);
});
