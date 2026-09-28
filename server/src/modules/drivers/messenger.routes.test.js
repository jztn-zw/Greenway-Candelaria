const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { pool } = require("../../config/db");
const authPath = require.resolve("../../middleware/auth");
require(authPath);
require.cache[authPath].exports = (req, res, next) => {
  const role = req.headers["x-test-role"];
  if (!role) return res.status(401).json({ message: "Unauthenticated" });
  req.user = { id: req.headers["x-test-user"] || "collector", role }; next();
};
const messenger = require("./messenger.service");
const calls = [];
messenger.findDriver = async (...args) => { calls.push(args); return { id: args[1] || "own-driver", user_id: args[0] }; };
messenger.getConversation = async () => ({ items: [], target: null, nextCursor: null, unreadCount: 0 });
messenger.sendMessage = async () => ({ id: "saved", message: "Hello" });
const app = express(); app.use(express.json()); app.use("/drivers", require("./drivers.routes"));
let server; let base;
const ready = new Promise((resolve) => { server = app.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); }); });
after(async () => { await new Promise((resolve) => server.close(resolve)); await pool.end(); });
const request = async (path, role, options = {}) => {
  await ready;
  return fetch(base + path, { ...options, headers: { "Content-Type": "application/json", ...(role ? { "x-test-role": role } : {}), ...options.headers } });
};
test("web messenger refuses anonymous and resident access", async () => {
  assert.equal((await request("/drivers/me/messages/conversation")).status, 401);
  assert.equal((await request("/drivers/me/messages/conversation", "RESIDENT")).status, 403);
  assert.equal((await request("/drivers/other/messages/conversation", "DRIVER")).status, 403);
});
test("collector read requests always resolve their own driver despite supplied IDs", async () => {
  calls.length = 0;
  const response = await request("/drivers/me/messages/conversation?driver_id=other", "DRIVER");
  assert.equal(response.status, 200); assert.deepEqual(calls, [["collector", undefined]]);
});
test("admin send requests select the named collector without requiring route data", async () => {
  calls.length = 0;
  const response = await request("/drivers/driver/messages/conversation", "ADMIN", { method: "POST", headers: { "x-test-user": "admin" }, body: JSON.stringify({ message: "Hello", request_id: "11111111-1111-4111-8111-111111111111" }) });
  assert.equal(response.status, 200); assert.deepEqual(calls, [["admin", "driver"]]);
});
test("rapid sends are bounded per authenticated user", async () => {
  const statuses = [];
  for (let index = 0; index < 21; index++) {
    const response = await request("/drivers/me/messages/conversation", "DRIVER", { method: "POST", headers: { "x-test-user": "limiter-test" }, body: JSON.stringify({ message: "Hello" }) });
    statuses.push(response.status); await response.text();
  }
  assert.equal(statuses.filter((status) => status === 200).length, 20); assert.equal(statuses[20], 429);
});
