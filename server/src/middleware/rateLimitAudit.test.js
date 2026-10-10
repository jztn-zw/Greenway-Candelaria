const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../config/db");
const { recordRateLimit, flushRateLimitAudit } = require("./rateLimitAudit");
after(() => pool.end());

test("unique-actor floods have bounded summaries and preserve the overflow count", async t => {
  const writes = [];
  t.mock.method(pool, "query", async (_, params) => { writes.push(params); return [{}]; });
  for (let i = 0; i < 300; i++) recordRateLimit({ user: { id: `fixture-${i}` }, ip: "192.0.2.1" }, "messages", 60);
  await flushRateLimitAudit();
  assert.equal(writes.length, 201);
  const overflow = writes.find(params => JSON.parse(params[6]).policy === "overflow");
  assert.equal(overflow[1], null);
  assert.equal(overflow[7], null);
  assert.equal(JSON.parse(overflow[6]).blocked_count, 100);
  assert.equal(writes.reduce((sum, params) => sum + JSON.parse(params[6]).blocked_count, 0), 300);
});

test("overlapping flushes neither duplicate nor drop requests arriving during a write", async t => {
  const writes = [];
  let finish;
  t.mock.method(pool, "query", (_, params) => {
    writes.push(params);
    if (writes.length === 1) return new Promise(resolve => { finish = () => resolve([{}]); });
    return Promise.resolve([{}]);
  });
  const req = { user: { id: "fixture" }, ip: "192.0.2.2", body: { password: "must-not-log", identifier: "private-identity", recovery_code: "private-code" } };
  recordRateLimit(req, "messages", 60);
  const first = flushRateLimitAudit();
  for (let i = 0; i < 5; i++) recordRateLimit(req, "messages", 30);
  await flushRateLimitAudit();
  assert.equal(writes.length, 1);
  finish(); await first;
  await flushRateLimitAudit();
  assert.equal(writes.length, 2);
  assert.equal(JSON.parse(writes[0][6]).blocked_count, 1);
  assert.equal(JSON.parse(writes[1][6]).blocked_count, 5);
  assert.ok(!JSON.stringify(writes).includes("private-"));
  assert.ok(!JSON.stringify(writes).includes("must-not-log"));
});
