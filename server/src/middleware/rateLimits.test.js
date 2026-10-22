const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { pool } = require("../config/db");
const auditWrites = [];
pool.query = async (sql, params) => { auditWrites.push({ sql, params }); return [{}]; };

// Exercise real routers/limits; replace credentials and business writes with fixtures.
const authPath = require.resolve("./auth");
require(authPath);
require.cache[authPath].exports = (req, res, next) => {
  if (!req.headers["x-user"]) return res.sendStatus(401);
  req.user = { id: req.headers["x-user"], role: req.headers["x-role"] || "DRIVER" };
  next();
};
const calls = new Map();
for (const module of ["auth", "drivers", "reports", "users", "tracking"]) {
  const path = require.resolve(`../modules/${module}/${module}.controller`);
  require(path);
  require.cache[path].exports = new Proxy({}, { get: (_, action) => (req, res) => {
    const name = `${module}:${action}`;
    calls.set(name, (calls.get(name) || 0) + 1);
    res.status(req.body?.fail ? 401 : 200).json({ success: true });
  } });
}
const limits = require("./rateLimits");
const app = express();
app.use(express.json());
app.use((req, res, next) => { req.requestId = "fixture-request"; next(); });
for (const module of ["auth", "drivers", "reports", "users", "tracking"]) {
  app.use(`/api/${module}`, require(`../modules/${module}/${module}.routes`));
}
let server, base;
const ready = new Promise(resolve => {
  server = app.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); });
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await pool.end(); });
const request = async (path, { user, role, method = "POST", ...body } = {}) => {
  await ready;
  const res = await fetch(base + path, {
    method, headers: { "Content-Type": "application/json", ...(user ? { "x-user": user } : {}), ...(role ? { "x-role": role } : {}) },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, headers: res.headers, body: await res.text() };
};

test("successful registrations consume their own quota without blocking login", async () => {
  for (let i = 0; i < 20; i++) assert.equal((await request("/api/auth/register", { email: `fixture-${i}@example.com` })).status, 200);
  const before = calls.get("auth:register");
  assert.equal((await request("/api/auth/register", { email: "extra@example.com" })).status, 429);
  assert.equal(calls.get("auth:register"), before);
  assert.equal((await request("/api/auth/login", { identifier: "other" })).status, 200);
  // Successful logins must not consume the failure quota used by the next test.
  for (let i = 0; i < 12; i++) assert.equal((await request("/api/auth/login", { identifier: `successful-${i}` })).status, 200);
});

test("login failures use an IP quota independent of username and a structured cooldown", async () => {
  for (let i = 0; i < 10; i++) assert.equal((await request("/api/auth/login", { identifier: "FixtureLogin", fail: true })).status, 401);
  const before = calls.get("auth:login");
  const blocked = await request("/api/auth/login", { identifier: "fixturelogin", fail: true });
  assert.equal(blocked.status, 429);
  assert.equal(calls.get("auth:login"), before);
  const body = JSON.parse(blocked.body);
  assert.equal(body.code, "RATE_LIMITED");
  assert.equal(body.requestId, "fixture-request");
  assert.ok(body.retryAfterSeconds > 0 && body.retryAfterSeconds <= 900);
  assert.equal(Number(blocked.headers.get("retry-after")), body.retryAfterSeconds);
  assert.equal((await request("/api/auth/login", { identifier: "another-account", fail: true })).status, 429);
  assert.equal((await request("/api/auth/recover", { identifier: "fixturelogin", fail: true })).status, 401);
});

test("recovery attempts cannot consume authenticated setup or code quotas", async () => {
  limits.recoveryLimiter.resetKey("127.0.0.1");
  for (let i = 0; i < 5; i++) assert.equal((await request("/api/auth/recover", { identifier: `ignored-${i}`, recovery_code: `fixture-code-${i}` })).status, 200);
  assert.equal((await request("/api/auth/recover", { identifier: "another-ignored-identity", recovery_code: "another-code" })).status, 429);
  assert.equal((await request("/api/auth/resident-profile", { user: "setup", role: "RESIDENT", method: "PUT" })).status, 200);
  assert.equal((await request("/api/auth/recovery-code", { user: "setup", role: "RESIDENT" })).status, 200);
});

test("self-deletion requires a resident session and has a separate per-account quota", async () => {
  assert.equal((await request("/api/auth/delete-account")).status, 401);
  for (const role of ["ADMIN", "DRIVER"]) {
    assert.equal((await request("/api/auth/delete-account", { user: role, role })).status, 403);
  }
  for (let i = 0; i < 5; i++) assert.equal((await request("/api/auth/delete-account", { user: "deleting", role: "RESIDENT" })).status, 200);
  const before = calls.get("auth:deleteResident");
  const blocked = await request("/api/auth/delete-account", { user: "deleting", role: "RESIDENT" });
  assert.equal(blocked.status, 429);
  assert.equal(calls.get("auth:deleteResident"), before);
  assert.ok(JSON.parse(blocked.body).retryAfterSeconds > 0);
  assert.equal((await request("/api/auth/delete-account", { user: "other-resident", role: "RESIDENT" })).status, 200);
  assert.equal((await request("/api/auth/recovery-code", { user: "deleting", role: "RESIDENT" })).status, 200);
});

test("message spam cannot consume breakdown, status or GPS quotas", async () => {
  for (let i = 0; i < 20; i++) assert.equal((await request("/api/drivers/me/messages/conversation", { user: "collector-spam" })).status, 200);
  assert.equal((await request("/api/drivers/me/messages/conversation", { user: "collector-spam" })).status, 429);
  assert.equal((await request("/api/drivers/me/breakdowns", { user: "collector-spam" })).status, 200);
  assert.equal((await request("/api/drivers/me/status", { user: "collector-spam", method: "PUT" })).status, 200);
  assert.equal((await request("/api/tracking/ping", { user: "collector-spam" })).status, 200);
  assert.equal((await request("/api/drivers/me/messages/conversation", { user: "collector-other" })).status, 200);
});

test("report bursts and hourly quotas are account-scoped on shared Wi-Fi", async () => {
  for (let i = 0; i < 3; i++) assert.equal((await request("/api/reports", { user: "resident-a", role: "RESIDENT" })).status, 200);
  const before = calls.get("reports:create");
  assert.equal((await request("/api/reports", { user: "resident-a", role: "RESIDENT" })).status, 429);
  assert.equal(calls.get("reports:create"), before);
  assert.equal((await request("/api/reports", { user: "resident-b", role: "RESIDENT" })).status, 200);
  for (let i = 3; i < 20; i++) {
    limits.reportBurstLimiter.resetKey("resident-a");
    assert.equal((await request("/api/reports", { user: "resident-a", role: "RESIDENT" })).status, 200);
  }
  limits.reportBurstLimiter.resetKey("resident-a");
  assert.equal((await request("/api/reports", { user: "resident-a", role: "RESIDENT" })).status, 429);
});

test("limits keep server authorization and normal dashboard reads intact", async () => {
  assert.equal((await request("/api/reports", {})).status, 401);
  assert.equal((await request("/api/reports", { user: "wrong-role", role: "DRIVER" })).status, 403);
  for (let i = 0; i < 35; i++) assert.equal((await request("/api/tracking/admin/overview", { user: "admin", role: "ADMIN", method: "GET" })).status, 200);
  for (let i = 0; i < 30; i++) assert.equal((await request("/api/tracking/ping", { user: "gps-only" })).status, 200);
  assert.equal((await request("/api/tracking/ping", { user: "gps-only" })).status, 429);
});

test("blocked requests are batched as audit summaries, never one write per request", async () => {
  auditWrites.length = 0;
  for (let i = 0; i < 15; i++) assert.equal((await request("/api/drivers/me/messages/conversation", { user: "collector-spam" })).status, 429);
  assert.equal(auditWrites.length, 0);
  await require("./rateLimitAudit").flushRateLimitAudit();
  const summaries = auditWrites.filter(({ params }) => params[2] === "RATE_LIMITED");
  const summary = summaries.find(({ params }) => params[1] === "collector-spam" && JSON.parse(params[6]).policy === "messages");
  assert.ok(summary);
  assert.equal(JSON.parse(summary.params[6]).blocked_count, 16);
  assert.ok(summaries.some(({ params }) => params[1] === null));
  assert.ok(!JSON.stringify(summaries).includes("FixtureLogin"));
});

test("rotating login identifiers cannot bypass the same IP quota", async () => {
  limits.loginBurstLimiter.resetKey("127.0.0.1");
  limits.loginLimiter.resetKey("127.0.0.1");
  for (let i = 0; i < 10; i++) {
    assert.equal((await request("/api/auth/login", { identifier: `rotating-fixture-${i}`, fail: true })).status, 401);
  }
  const before = calls.get("auth:login");
  assert.equal((await request("/api/auth/login", { identifier: "rotating-new", fail: true })).status, 429);
  assert.equal(calls.get("auth:login"), before);
});

test("uploads on shared Wi-Fi are limited per account before file processing", async () => {
  // Consume the same limiter that precedes all multipart handlers, without sending files.
  app.post("/fixture/upload", require("./auth"), limits.uploadLimiter, (req, res) => res.sendStatus(200));
  for (let i = 0; i < 30; i++) assert.equal((await request("/fixture/upload", { user: "uploader-a" })).status, 200);
  assert.equal((await request("/fixture/upload", { user: "uploader-a" })).status, 429);
  assert.equal((await request("/fixture/upload", { user: "uploader-b" })).status, 200);
});

test("expired cooldowns allow requests again", async () => {
  app.post("/fixture/expiry", require("./auth"), limits.createLimiter("expiry-fixture", { windowMs: 100, limit: 1 }), (req, res) => res.sendStatus(200));
  assert.equal((await request("/fixture/expiry", { user: "expiry" })).status, 200);
  assert.equal((await request("/fixture/expiry", { user: "expiry" })).status, 429);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await request("/fixture/expiry", { user: "expiry" })).status, 200);
});

test("account security and profile quotas remain separate from settings and other accounts", async () => {
  for (const [path, method, count, user, role] of [
    ["/api/auth/recovery-code", "POST", 5, "code-owner", "DRIVER"],
    ["/api/users/change-password", "PUT", 10, "password-owner", "RESIDENT"],
    ["/api/users/profile", "PUT", 30, "profile-owner", "DRIVER"],
    ["/api/users/settings", "PUT", 60, "settings-owner", "DRIVER"],
  ]) {
    for (let i = 0; i < count; i++) assert.equal((await request(path, { user, method, role })).status, 200);
    assert.equal((await request(path, { user, method, role })).status, 429);
    assert.equal((await request(path, { user: `${user}-other`, method, role })).status, 200);
  }
  assert.equal((await request("/api/users/settings", { user: "password-owner", method: "PUT" })).status, 200);
  assert.equal((await request("/api/auth/logout", { user: "password-owner" })).status, 200);
});
