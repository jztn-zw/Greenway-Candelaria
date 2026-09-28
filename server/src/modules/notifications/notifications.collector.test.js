const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./notifications.service");
after(() => pool.end());
const withQuery = async (query, run) => { const original = pool.query; pool.query = query; try { await run(); } finally { pool.query = original; } };
test("collector list uses stable cursors, bounded windows and user ownership", async () => {
  const calls = [];
  await withQuery(async (sql, params) => {
    calls.push({sql, params});
    if (sql.includes("COUNT(*)")) return [[{ total: 10000 }]];
    return [[{ id: "c", created_at: "2026-09-27 01:00:00" }, { id: "b", created_at: "2026-09-27 01:00:00" }, { id: "a", created_at: "2026-09-27 01:00:00" }]];
  }, async () => {
    const result = await service.getMyNotifications("collector", { category: "all", limit: 2 });
    assert.equal(result.notifications.length, 2); assert.ok(result.next_cursor);
    assert.match(calls[0].sql, /n.user_id = \?/); assert.match(calls[0].sql, /ORDER BY n.created_at DESC, n.id DESC/);
    assert.deepEqual(calls[0].params, ["collector", 3, 0]);
    await service.getMyNotifications("collector", { category: "routes", limit: 2, cursor: result.next_cursor });
    assert.match(calls[2].sql, /n.created_at < \?/); assert.match(calls[2].sql, /n.id < \?/);
    assert.match(calls[2].sql, /n.ref_module IN/);
    assert.deepEqual(calls[2].params, ["collector", "2026-09-27 01:00:00", "2026-09-27 01:00:00", "b", 3, 0]);
  });
});
test("legacy list requests retain their existing page size and offset contract", async () => {
  const calls = [];
  await withQuery(async (sql, params) => { calls.push({sql,params}); return sql.includes("COUNT(*)") ? [[{ total: 1 }]] : [[{ id: "one" }]]; }, async () => {
    const result = await service.getMyNotifications("resident", { limit: 20, offset: 20 });
    assert.deepEqual(calls[0].params, ["resident", 20, 20]); assert.equal(result.next_cursor, undefined);
  });
});
test("rejects malformed cursors and unsupported categories", async () => {
  await assert.rejects(service.getMyNotifications("collector", { category: "all", cursor: "invalid" }), (error) => error.statusCode === 400);
  await assert.rejects(service.getMyNotifications("collector", { category: "secret" }), (error) => error.statusCode === 400);
});
test("notification clear is restricted to the authenticated recipient", async () => {
  await withQuery(async (sql, params) => { assert.equal(sql, "DELETE FROM notifications WHERE user_id = ?"); assert.deepEqual(params, ["collector"]); return [{ affectedRows: 1 }]; }, () => service.clearAll("collector"));
});
