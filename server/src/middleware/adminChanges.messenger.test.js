const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../config/db");
after(() => pool.end());
const { EventEmitter } = require("node:events");
const { createAdminChangesMiddleware } = require("./adminChanges");
test("web chat writes invalidate only admin messaging without waking resident or unrelated modules", () => {
  for (const originalUrl of ["/api/drivers/me/messages/conversation", "/api/drivers/driver/messages/conversation"]) {
    const events = [];
    const response = new EventEmitter(); response.statusCode = 200;
    createAdminChangesMiddleware((...args) => events.push(args))({ method: "POST", originalUrl, user: { role: "DRIVER" } }, response, () => {});
    response.emit("finish");
    assert.deepEqual(events, [[["tracking"], { residents: false, collectors: false }]]);
  }
});
test("failed chat writes do not announce data changes", () => {
  const events = []; const response = new EventEmitter(); response.statusCode = 500;
  createAdminChangesMiddleware((...args) => events.push(args))({ method: "POST", originalUrl: "/api/drivers/me/messages/conversation" }, response, () => {});
  response.emit("finish"); assert.deepEqual(events, []);
});
test("existing assignment writes retain their original invalidation behavior", () => {
  const events = []; const response = new EventEmitter(); response.statusCode = 200;
  createAdminChangesMiddleware((...args) => events.push(args))({ method: "PUT", originalUrl: "/api/drivers/driver/assign-truck" }, response, () => {});
  response.emit("finish");
  assert.deepEqual(events[0][0], ["drivers", "trucks", "routes", "tracking", "dashboard", "analytics"]);
});
