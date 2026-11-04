const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const hash = require("../src/utils/hashSessionToken");

function load(file, dependencies) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { Buffer, Date, Set, console, process: { env: { JWT_SECRET: "fixture-only" } } })(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

function loginFixture({ failInsert = false, currentPassword = "password", role = "RESIDENT" } = {}) {
  const user = { id: "owner", full_name: "Demo Account", username: "demo", password: "password", role, status: "ACTIVE", profile_completed: true };
  let sessions = [{ token: hash("old-token"), user_id: "owner" }];
  let lock = Promise.resolve();
  let sequence = 0;
  let commits = 0;
  const notices = [];
  const pool = { async query(sql, values) {
    assert.equal(sql, 'DELETE FROM sessions WHERE token IN (?, ?)');
    sessions = sessions.filter(row => !values.includes(row.token));
    return [{}];
  }, async getConnection() {
    let snapshot, release;
    return {
      async beginTransaction() { const wait = lock; lock = new Promise(resolve => { release = resolve; }); await wait; snapshot = sessions.map(row => ({ ...row })); },
      async query(sql, values) {
        if (sql.startsWith("SELECT * FROM users")) return [[{ ...user, password: currentPassword }]];
        if (sql.startsWith("SELECT token FROM sessions")) return [snapshot.map(row => ({ token: row.token }))];
        if (sql.startsWith("DELETE FROM sessions")) { snapshot = []; return [{}]; }
        if (sql.startsWith("INSERT INTO sessions")) {
          if (failInsert) throw new Error("Fixture insert failed");
          snapshot.push({ token: values[2], user_id: values[1] }); return [{}];
        }
        if (sql.startsWith("UPDATE users SET last_login_at")) return [{}];
        throw new Error(`Unexpected query: ${sql}`);
      },
      async commit() { sessions = snapshot; commits++; },
      async rollback() {},
      release() { release?.(); },
    };
  } };
  const service = load("src/modules/sessions/sessions.service.js", { "../../config/db": { pool }, "../../utils/generateId": () => `id-${++sequence}`, "../../utils/hashSessionToken": hash });
  const audit = { log: async () => {}, logInTransaction: async () => {} };
  const auth = load("src/modules/auth/auth.service.js", {
    bcryptjs: { compare: async password => password === "password" },
    jsonwebtoken: { sign: payload => `fixture-token-${payload.jti}` },
    "../../utils/queryWithRetry": async () => [[{ ...user }]],
    "../../utils/generateId": () => `id-${++sequence}`,
    "../../utils/profileAvatar": { avatarUrlForAccount: () => null },
    "../sessions/sessions.service": service,
    "../audit/audit.service": audit,
    "./auth.recovery": {}, "./auth.deletion": {},
    "../../config/db": { pool },
    "../../sockets/adminChanges.socket": { emitAdminDataChanged() {} },
    "../../sockets/session.socket": { emitSessionsReplaced(tokens) { assert.ok(commits > 0, "must notify after commit"); notices.push([...tokens]); return Promise.resolve(); } },
  });
  return { login: password => auth.login({ identifier: "demo", password }, { headers: {} }), logout: token => auth.logout(token, user.id), sessions: () => sessions, notices };
}

test('admin login retains the existing single-session rule', async () => {
  const fixture = loginFixture({ role: 'ADMIN' });
  const result = await fixture.login('password');
  assert.deepEqual(fixture.sessions(), [{ user_id: 'owner', token: hash(result.token) }]);
  assert.deepEqual(fixture.notices, [[hash('old-token')]]);
});

for (const role of ["RESIDENT", "DRIVER"]) test(`a successful ${role} login preserves the other device session`, async () => {
  const fixture = loginFixture({ role });
  const result = await fixture.login("password");
  assert.deepEqual(fixture.sessions(), [{ user_id: "owner", token: hash('old-token') }, { user_id: "owner", token: hash(result.token) }]);
  assert.deepEqual(fixture.notices, [[]]);
});

test("bad credentials do not revoke the current sign-in", async () => {
  const fixture = loginFixture();
  await assert.rejects(fixture.login("incorrect"), error => error.statusCode === 401);
  assert.equal(fixture.sessions()[0].token, hash("old-token"));
  assert.equal(fixture.notices.length, 0);
});

test("transaction failure restores the old session and emits no notice", async () => {
  const fixture = loginFixture({ failInsert: true });
  await assert.rejects(fixture.login("password"), /Fixture insert failed/);
  assert.equal(fixture.sessions()[0].token, hash("old-token"));
  assert.equal(fixture.notices.length, 0);
});

test("a password changed after verification cannot replace the session", async () => {
  const fixture = loginFixture({ currentPassword: "new-password" });
  await assert.rejects(fixture.login("password"), error => error.statusCode === 401);
  assert.equal(fixture.sessions()[0].token, hash("old-token"));
  assert.equal(fixture.notices.length, 0);
});

test("concurrent resident logins serialize and both remain active", async () => {
  const fixture = loginFixture();
  const results = await Promise.all([fixture.login("password"), fixture.login("password")]);
  assert.equal(fixture.sessions().length, 3);
  assert.ok(results.every(result => fixture.sessions().some(row => row.token === hash(result.token))));
  assert.deepEqual(fixture.notices, [[], []]);
});

for (const role of ['RESIDENT', 'DRIVER']) test(`${role} logout revokes only that device and never writes truck state`, async () => {
  const fixture = loginFixture({ role });
  const result = await fixture.login('password');
  await fixture.logout(result.token);
  assert.deepEqual(fixture.sessions(), [{ user_id: 'owner', token: hash('old-token') }]);
});

function middlewareFixture({ sessions = [], newer = false, jwtError } = {}) {
  let checks = 0;
  const auth = load("src/middleware/auth.js", {
    jsonwebtoken: { verify() { if (jwtError) throw jwtError; return { id: "owner", iat: 100 }; } },
    "../config/db": { pool: { query: async sql => sql.includes("FROM sessions") ? [sessions] : [[{ id: "owner", status: "ACTIVE", role: "ADMIN" }]] } },
    "../utils/hashSessionToken": hash,
    "../utils/apiResponse": { error: (res, message, status) => res.status(status).json({ message }) },
    "../modules/sessions/sessions.service": { async hasNewerSession(id, issued) { checks++; assert.equal(id, "owner"); assert.equal(issued, 100); return newer; } },
  });
  const res = { status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  return { auth, res, checks: () => checks };
}

test("a replaced valid JWT gets the explicit signed-in-elsewhere reason", async () => {
  const fixture = middlewareFixture({ newer: true });
  await fixture.auth({ headers: { authorization: "Bearer old-token" } }, fixture.res, () => assert.fail("must reject"));
  assert.equal(fixture.res.statusCode, 401);
  assert.equal(fixture.res.body.code, "SESSION_REPLACED");
});

test("a deleted session without a newer sign-in retains the generic reason", async () => {
  const fixture = middlewareFixture();
  await fixture.auth({ headers: { authorization: "Bearer old-token" } }, fixture.res, () => assert.fail("must reject"));
  assert.equal(fixture.res.statusCode, 401);
  assert.equal(fixture.res.body.code, undefined);
});

test("ordinary requests and another tab sharing the same token remain valid", async () => {
  const fixture = middlewareFixture({ sessions: [{ user_id: "owner" }] });
  let allowed = 0;
  for (let i = 0; i < 2; i++) await fixture.auth({ headers: { authorization: "Bearer current" } }, fixture.res, () => allowed++);
  assert.equal(allowed, 2);
  assert.equal(fixture.checks(), 0);
});

test("expired JWTs are not mislabeled as a new-device sign-in", async () => {
  const fixture = middlewareFixture({ newer: true, jwtError: { name: "TokenExpiredError" } });
  await fixture.auth({ headers: { authorization: "Bearer expired" } }, fixture.res, () => assert.fail("must reject"));
  assert.equal(fixture.res.statusCode, 401);
  assert.equal(fixture.res.body.code, undefined);
  assert.equal(fixture.checks(), 0);
});

test("session notices reach revoked hashed/legacy credentials only, never the new login", async () => {
  const received = [];
  const sockets = ["old-token", "legacy-token", "new-token", "other-account", null].map(token => ({ token, emit: () => received.push(token), disconnect: () => {} }));
  const { emitSessionsReplaced } = load("src/sockets/session.socket.js", {
    "./notifications.socket": { getIO: () => ({ fetchSockets: async () => sockets }) },
    "./socketAuth": { getHandshakeToken: socket => socket.token },
    "../utils/hashSessionToken": hash,
  });
  await emitSessionsReplaced([hash("old-token"), "legacy-token"]);
  assert.deepEqual(received, ["old-token", "legacy-token"]);
});

test("missed socket deliveries do not turn a committed login into an error", async () => {
  const { emitSessionsReplaced } = load("src/sockets/session.socket.js", {
    "./notifications.socket": { getIO: () => ({ fetchSockets: async () => { throw new Error("Offline adapter"); } }) },
    "./socketAuth": { getHandshakeToken() {} }, "../utils/hashSessionToken": hash,
  });
  await emitSessionsReplaced([hash("old-token")]);
});
