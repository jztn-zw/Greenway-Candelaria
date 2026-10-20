const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fixture(failCommit = false, readCount = 1, receiptCount = readCount) {
  const events = [], notificationEvents = [], statements = [], module = { exports: {} }; let committed = false;
  const query = async (sql, params) => {
    statements.push({ sql, params });
    if (sql.includes("FROM drivers d")) return [[{ id: "driver", user_id: "collector", truck_id: "truck" }]];
    if (sql.includes("FROM route_runs")) return [[{ id: "run" }]];
    if (sql.includes('UPDATE notifications')) return [{ affectedRows: receiptCount }];
    return [{ affectedRows: readCount }];
  };
  const connection = { query, beginTransaction: async () => {}, release() {},
    commit: async () => { if (failCommit) throw Error("commit failed"); committed = true; }, rollback: async () => events.push("rollback") };
  vm.runInNewContext(fs.readFileSync(require.resolve("./drivers.service"), "utf8"), { module, process: { env: {} },
    require: name => {
      if (name.endsWith("/config/db")) return { pool: { query, getConnection: async () => connection } };
      if (name.endsWith("/generateId")) return () => "fixture-id";
      if (name.endsWith("/notifications.service")) return {
        notifyAdmins: async () => ({ notifications: [] }), sendToMany: async () => ({ notifications: [] }), emitStoredNotifications() {},
      };
      if (name.endsWith("/collectorChanges.socket")) return { emitCollectorConversationChanged: owner => events.push({ owner, committed }) };
      if (name.endsWith("/notifications.socket")) return { emitNotificationStateChanged: owner => notificationEvents.push({ owner, committed }) };
      if (["bcryptjs", "../routes/routeRuns.service", "../../utils/profileAvatar", "../audit/audit.service"].includes(name)) return {};
      throw Error(name);
    },
  });
  return { service: module.exports, events, notificationEvents, statements };
}
test("legacy dispatch and breakdown messages publish only after commit", async () => {
  for (const action of ["dispatch", "breakdown"]) {
    const f = fixture();
    if (action === "dispatch") await f.service.sendAdminMessageToDriver("admin", "collector", "run", "Dispatch");
    else await f.service.reportBreakdown("collector", { category: "Flat Tire", description: "Stopped safely" });
    assert.deepEqual(f.events, [{ owner: "collector", committed: true }]);
    const failed = fixture(true);
    if (action === "dispatch") await assert.rejects(failed.service.sendAdminMessageToDriver("admin", "collector", "run", "Dispatch"), /commit failed/);
    else await assert.rejects(failed.service.reportBreakdown("collector", { category: "Flat Tire", description: "Stopped safely" }), /commit failed/);
    assert.deepEqual(failed.events, ["rollback"]);
  }
});
test("legacy read hints use the authenticated collector and skip unchanged receipts", async () => {
  const f = fixture(); await f.service.markMyMessagesAsRead("collector", undefined, ["message"]);
  assert.deepEqual(f.events, [{ owner: "collector", committed: true }]);
  assert.deepEqual(f.notificationEvents, [{ owner: "collector", committed: true }]);
  const receipt = f.statements.find(({ sql }) => /UPDATE notifications/.test(sql));
  assert.ok(receipt, 'viewed messages and their notification flags are saved together');
  assert.match(receipt.sql, /n.user_id = \?/);
  assert.match(receipt.sql, /dm.driver_id = \?/);
  assert.match(receipt.sql, /dm.id IN \(\?\)/);
  assert.deepEqual(JSON.parse(JSON.stringify(receipt.params)), ['collector', 'driver', 'collector', ['message']]);
  const unchanged = fixture(false, 0); await unchanged.service.markMyMessagesAsRead("collector", undefined, ["message"]);
  assert.deepEqual(unchanged.events, []);
});
test('failed message-read commit rolls back both flags without publishing either hint', async () => {
  const f = fixture(true);
  await assert.rejects(f.service.markMyMessagesAsRead('collector', undefined, ['message']), /commit failed/);
  assert.deepEqual(f.events, ['rollback']);
  assert.deepEqual(f.notificationEvents, []);
});
test('an already-read visible message repairs its linked notification without another message read', async () => {
  const f = fixture(false, 0, 1);
  const result = await f.service.markMyMessagesAsRead('collector', 'run', ['message']);
  assert.equal(result.read, 0);
  assert.deepEqual(f.events, []);
  assert.deepEqual(f.notificationEvents, [{ owner: 'collector', committed: true }]);
  const receipt = f.statements.find(({ sql }) => /UPDATE notifications/.test(sql));
  assert.match(receipt.sql, /dm.route_id = \?/);
  assert.match(receipt.sql, /dm.is_read = TRUE/);
  assert.deepEqual(JSON.parse(JSON.stringify(receipt.params)), ['collector', 'driver', 'collector', 'run', ['message']]);
});
