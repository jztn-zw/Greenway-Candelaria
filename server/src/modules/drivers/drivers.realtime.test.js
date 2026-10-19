const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fixture(failCommit = false, readCount = 1) {
  const events = [], module = { exports: {} }; let committed = false;
  const query = async (sql) => {
    if (sql.includes("FROM drivers d")) return [[{ id: "driver", user_id: "collector", truck_id: "truck" }]];
    if (sql.includes("FROM route_runs")) return [[{ id: "run" }]];
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
      if (["bcryptjs", "../routes/routeRuns.service", "../../utils/profileAvatar", "../audit/audit.service"].includes(name)) return {};
      throw Error(name);
    },
  });
  return { service: module.exports, events };
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
  assert.deepEqual(f.events, [{ owner: "collector", committed: false }]); // Existing read is one atomic UPDATE.
  const unchanged = fixture(false, 0); await unchanged.service.markMyMessagesAsRead("collector", undefined, ["message"]);
  assert.deepEqual(unchanged.events, []);
});
