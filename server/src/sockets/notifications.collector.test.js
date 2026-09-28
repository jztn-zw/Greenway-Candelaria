const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../config/db");
const auth = require("./socketAuth");
const originalAuth = auth.authenticateSocketUser;
auth.authenticateSocketUser = async (socket) => socket.user ?? null;
const channel = require("./notifications.socket");
after(() => { auth.authenticateSocketUser = originalAuth; return pool.end(); });
test("reference removals reach only authenticated recipients, never a global broadcast", async () => {
  const emitted = [];
  const recipient = { user: { id: "recipient" }, emit: (...args) => emitted.push(args), leave: async () => {} };
  const other = { user: { id: "other" }, emit: (...args) => emitted.push(["leaked", ...args]), leave: async () => {} };
  const anonymous = { emit: (...args) => emitted.push(["anonymous", ...args]), leave: async () => {} };
  channel.registerNotificationsSocket({ on: () => {}, emit: () => assert.fail("global broadcast"),
    in: (room) => { assert.equal(room, "user:recipient"); return { fetchSockets: async () => [recipient, other, anonymous] }; } });
  const originalQuery = pool.query;
  pool.query = async (sql, params) => { assert.match(sql, /SELECT DISTINCT user_id FROM notifications/); assert.deepEqual(params, ["announcements", "private-id"]); return [[{ user_id: "recipient" }]]; };
  try {
    channel.emitNotificationReferenceRemoved("announcements", "private-id");
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(emitted, [["notification:remove_ref", { ref_module: "announcements", ref_id: "private-id" }]]);
  } finally { pool.query = originalQuery; }
});
