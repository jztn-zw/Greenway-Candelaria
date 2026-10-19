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
test("collector phone inbox excludes chat consistently from its list and unread count without changing other clients", async () => {
  const queries = [];
  await withQuery(async (sql) => {
    queries.push(sql);
    return sql.includes("COUNT(*)") ? [[{ total: 0, count: 0 }]] : [[]];
  }, async () => {
    await service.getMyNotifications("collector", { exclude_messages: "true" });
    await service.getUnreadCount("collector", { exclude_messages: "true" });
    assert.equal(queries.length, 3);
    for (const sql of queries) assert.match(sql, /COALESCE\(n.ref_module, ''\) <> 'driver-messages'/);
    queries.length = 0;
    await service.getMyNotifications("collector");
    await service.getUnreadCount("collector");
    for (const sql of queries) assert.doesNotMatch(sql, /COALESCE\(n.ref_module, ''\) <> 'driver-messages'/);
  });
});
test("notification clear is restricted to the authenticated recipient", async () => {
  await withQuery(async (sql, params) => { assert.equal(sql, "DELETE FROM notifications WHERE user_id = ?"); assert.deepEqual(params, ["collector"]); return [{ affectedRows: 1 }]; }, () => service.clearAll("collector"));
});


test('mobile calendar and official announcement filters distinguish schedule records without changing web categories', async () => {
  const calls = [];
  await withQuery(async (sql, params) => { calls.push({ sql, params });
    return sql.includes('COUNT(*)') ? [[{ total: 0, history_total: 0 }]] : [[]];
  }, async () => {
    for (const [category, expected] of [['resident:calendar', /n\.ref_module = 'schedule'/], ['resident:official-announcements', /COALESCE\(n\.ref_module, ''\) <> 'schedule'/], ['collector:calendar', /n\.ref_module = 'schedule'/], ['collector:dispatch', /'drivers','trucks','truck-breakdowns'/]]) {
      calls.length = 0;
      await service.getMyNotifications('owner', { category: 'all', web_category: category, limit: 20, exclude_messages: 'true' });
      const list = calls.find(call => call.sql.includes('SELECT n.*'));
      assert.match(list.sql, expected); assert.match(list.sql, /n.user_id = \?/);
      assert.match(list.sql, /<> 'driver-messages'/);
    }
    calls.length = 0; await service.getMyNotifications('owner', { web_category: 'resident:announcements' });
    assert.doesNotMatch(calls.find(call => call.sql.includes('SELECT n.*')).sql, /<> 'schedule'/);
  });
});

test('collector inbox bulk-read excludes hidden chat notifications and delete stays owner-scoped', async () => {
  const calls = [];
  await withQuery(async (sql, params) => { calls.push({sql,params}); return sql.startsWith('SELECT') ? [[{ id: 'notice' }]] : [{}]; }, async () => {
    await service.markAllAsRead('collector', undefined, undefined, true);
    assert.match(calls[0].sql, /COALESCE\(ref_module, ''\) <> 'driver-messages'/);
    assert.deepEqual(calls[0].params, ['collector']);
    calls.length = 0; await service.deleteOne('notice', 'collector');
    assert.match(calls.at(-1).sql, /id = \? AND user_id = \?/); assert.deepEqual(calls.at(-1).params, ['notice', 'collector']);
  });
});


test('unowned notifications cannot be deleted and collector-only bulk-read scope is checked by the controller', async () => {
  await withQuery(async sql => { assert.ok(sql.startsWith('SELECT')); return [[]]; }, async () => {
    await assert.rejects(service.deleteOne('not-mine', 'collector'), error => error.statusCode === 404);
  });
  const controller = require('./notifications.controller'), calls = [];
  const res = { status: () => res, json() {} };
  await withQuery(async (sql, params) => { calls.push({sql,params}); return [{}]; }, async () => {
    for (const role of ['DRIVER', 'RESIDENT', 'ADMIN']) {
      await controller.markAllAsRead({ user: { id: 'owner', role }, body: { exclude_messages: true } }, res, error => { throw error; });
      if (role === 'DRIVER') assert.match(calls.at(-1).sql, /<> 'driver-messages'/);
      else assert.doesNotMatch(calls.at(-1).sql, /<> 'driver-messages'/);
      assert.deepEqual(calls.at(-1).params, ['owner']);
    }
  });
});
