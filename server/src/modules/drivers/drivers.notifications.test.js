const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./drivers.service");
after(() => pool.end());
const withQuery = async (query, run) => { const original = pool.query; pool.query = query; try { await run(); } finally { pool.query = original; } };
test("web conversation selects the latest messages and returns them chronologically", async () => {
  await withQuery(async (sql, params) => {
    if (sql.includes("FROM drivers d")) return [[{ id: "driver" }]];
    assert.match(sql, /ORDER BY dm.created_at DESC, dm.id DESC/); assert.deepEqual(params, ["driver", 300]);
    return [[{ id: "301" }, { id: "300" }]];
  }, async () => { assert.deepEqual((await service.getMyMessages("user", undefined, 300, "collector")).map((row) => row.id), ["300", "301"]); });
});
test("a selected older notification message is included and remains ownership scoped", async () => {
  await withQuery(async (sql, params) => {
    if (sql.includes("FROM drivers d")) return [[{ id: "driver" }]];
    if (sql.includes("LIMIT ?")) return [[{ id: "301" }]];
    assert.match(sql, /WHERE dm.driver_id = \? AND dm.id = \?/); assert.deepEqual(params, ["driver", "old"]); return [[{ id: "old" }]];
  }, async () => { assert.deepEqual((await service.getMyMessages("user", undefined, 300, "collector", "old")).map((row) => row.id), ["old", "301"]); });
});
test("web read action marks only displayed messages belonging to this collector", async () => {
  await withQuery(async (sql, params) => {
    if (sql.includes("FROM drivers d")) return [[{ id: "driver" }]];
    assert.match(sql, /WHERE driver_id = \?/); assert.match(sql, /AND id IN \(\?\)/); assert.deepEqual(params, ["driver", "user", ["visible"]]);
    return [{ affectedRows: 1 }];
  }, async () => { assert.deepEqual(await service.markMyMessagesAsRead("user", undefined, ["visible"]), { read: 1 }); });
});
test("failed notification insert rolls back the dispatch message", async () => {
  const original = pool.getConnection; let rollback = false; let commit = false; const writes = [];
  pool.getConnection = async () => ({ beginTransaction: async () => {}, commit: async () => { commit = true; }, rollback: async () => { rollback = true; }, release: () => {},
    query: async (sql) => { writes.push(sql); if (sql.includes("INSERT INTO notifications")) throw new Error("notification failed"); return [{affectedRows: 1}]; } });
  try {
    await withQuery(async (sql) => sql.includes("FROM drivers d") ? [[{ id: "driver" }]] : [[{ id: "run" }]], async () => {
      await assert.rejects(service.sendAdminMessageToDriver("admin", "collector", "run", "Dispatch"), /notification failed/);
      assert.equal(writes.some((sql) => sql.includes("INSERT INTO driver_messages")), true); assert.equal(rollback, true); assert.equal(commit, false);
    });
  } finally { pool.getConnection = original; }
});

test("breakdown report rolls back its status and message when admin notification fails", async () => {
  const originalConnection = pool.getConnection;
  let rolledBack = false;
  let committed = false;
  const writes = [];
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { committed = true; },
    rollback: async () => { rolledBack = true; },
    release: () => {},
    query: async (sql) => {
      if (sql.includes("FROM drivers d")) return [[{ id: "driver", truck_id: "truck", full_name: "Collector", truck_name: "Truck 1", truck_plate: "ABC-123" }]];
      if (sql.includes("FROM users u")) return [[{ id: "admin" }]];
      if (sql.includes("INSERT INTO notifications")) throw new Error("notification failed");
      writes.push(sql);
      return [{ affectedRows: 1 }];
    },
  });
  try {
    await assert.rejects(service.reportBreakdown("collector", { category: "Flat Tire", description: "Near the chapel", urgent: true }), /notification failed/);
    assert.equal(writes.some((sql) => sql.includes("UPDATE drivers SET status_msg")), true);
    assert.equal(writes.some((sql) => sql.includes("INSERT INTO driver_messages")), true);
    assert.equal(rolledBack, true);
    assert.equal(committed, false);
  } finally { pool.getConnection = originalConnection; }
});

test("failed assignment notification rolls back the truck change", async () => {
  const audit = require("../audit/audit.service"); const originalAudit = audit.logInTransaction;
  const originalConnection = pool.getConnection; let rollback = false; let commit = false;
  audit.logInTransaction = async () => {};
  pool.getConnection = async () => ({ beginTransaction: async () => {}, commit: async () => { commit = true; }, rollback: async () => { rollback = true; }, release: () => {}, query: async (sql) => {
    if (sql.includes("SELECT id FROM trucks")) return [[{ id: "new" }]];
    if (sql.includes("SELECT id FROM drivers WHERE truck_id") || sql.includes("SELECT id FROM route_runs")) return [[]];
    if (sql.includes("SELECT d.user_id")) return [[{ user_id: "collector", truck_id: "old", full_name: "Collector" }]];
    if (sql.includes("SELECT name FROM trucks")) return [[{ name: "New truck" }]];
    if (sql.includes("INSERT INTO notifications")) throw new Error("notification failed");
    return [{ affectedRows: 1 }];
  } });
  try { await assert.rejects(service.assignTruck("driver", "new", "admin"), /notification failed/); assert.equal(rollback, true); assert.equal(commit, false); }
  finally { pool.getConnection = originalConnection; audit.logInTransaction = originalAudit; }
});

test("admin web chat also retrieves recent messages while the legacy contract stays ascending", async () => {
  await withQuery(async (sql) => {
    if (sql.includes("FROM drivers d")) return [[{ id: "driver" }]];
    assert.match(sql, /ORDER BY dm.created_at DESC, dm.id DESC/);
    return [[{ id: "new" }, { id: "old" }]];
  }, async () => { assert.deepEqual((await service.getMessagesForAdmin("driver", "run", 300, "web")).map((row) => row.id), ["old", "new"]); });
  await withQuery(async (sql) => {
    if (sql.includes("FROM drivers d")) return [[{ id: "driver" }]];
    assert.match(sql, /ORDER BY dm.created_at ASC/); return [[]];
  }, () => service.getMessagesForAdmin("driver", "run", 300));
});
