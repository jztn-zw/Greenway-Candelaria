const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fixture({ fail = false, existing = false } = {}) {
  const events = [], module = { exports: {} };
  let committed = false;
  const connection = {
    beginTransaction: async () => {}, commit: async () => { if (fail) throw Error("commit failed"); committed = true; },
    rollback: async () => events.push("rollback"), release() {},
    query: async (sql, params) => {
      if (sql.includes("FOR UPDATE")) return [[{ id: "driver" }]];
      if (sql.startsWith("SELECT id, driver_id")) return [existing ? [{ id: params[0], driver_id: "driver", message: "Dispatch", route_id: null }] : []];
      if (sql.startsWith("SELECT dm.id")) return [[{ id: "saved", message: "Dispatch", is_read: false }]];
      return [{ affectedRows: 1 }];
    },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("./messenger.service"), "utf8"), { module, Buffer,
    require: name => {
      if (name === "node:crypto") return require(name);
      if (name.endsWith("/config/db")) return { pool: { getConnection: async () => connection } };
      if (name.endsWith("/notifications.service")) return {
        notifyAdmins: async () => ({ notifications: [] }), sendToMany: async () => ({ notifications: [] }),
        emitStoredNotifications: () => {},
      };
      if (name.endsWith("/collectorChanges.socket")) return { emitCollectorConversationChanged: owner => {
        assert.equal(committed, true, "publish only after the transaction commits"); events.push(owner);
      } };
      throw Error(name);
    },
  });
  return { service: module.exports, events };
}
test("committed dispatch sends publish an owner hint even when optional alerts produce no notification", async () => {
  for (const role of ["ADMIN", "DRIVER"]) {
    const f = fixture();
    await f.service.sendMessage({ id: "sender", role }, { id: "driver", user_id: "collector" },
      { message: "Dispatch", request_id: "11111111-1111-4111-8111-111111111111" });
    assert.deepEqual(f.events, ["collector"]);
  }
});
test("rolled back sends and duplicate request retries do not publish another message change", async () => {
  const input = { message: "Dispatch", request_id: "11111111-1111-4111-8111-111111111111" };
  const failed = fixture({ fail: true });
  await assert.rejects(failed.service.sendMessage({ id: "admin", role: "ADMIN" }, { id: "driver", user_id: "collector" }, input), /commit failed/);
  assert.deepEqual(failed.events, ["rollback"]);
  const duplicate = fixture({ existing: true });
  await duplicate.service.sendMessage({ id: "admin", role: "ADMIN" }, { id: "driver", user_id: "collector" }, input);
  assert.deepEqual(duplicate.events, []);
});
test("admin read confirmations publish to the collector only after commit", async () => {
  const f = fixture(); await f.service.markAdminRead("driver", "admin", ["message"], "collector");
  assert.deepEqual(f.events, ["collector"]);
  const failed = fixture({ fail: true });
  await assert.rejects(failed.service.markAdminRead("driver", "admin", ["message"], "collector"), /commit failed/);
  assert.deepEqual(failed.events, ["rollback"]);
});
