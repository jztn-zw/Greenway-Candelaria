const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./notifications.service");
after(() => pool.end());
test("web history keeps total unread counts while fetching only the selected category page", async () => {
  const original = pool.query; let window;
  pool.query = async (sql, params) => {
    assert.match(sql, /n.user_id = \?/); assert.equal(params[0], "resident");
    if (sql.includes("AS history_total")) return [[{ history_total: 10000, unread_count: 9000, unread_content_count: 400, recent_count: 12 }]];
    if (sql.includes("COUNT(*) AS total")) { assert.match(sql, /n.type = 'REPORT_UPDATE'/); return [[{ total: 40 }]]; }
    assert.match(sql, /n.type = 'REPORT_UPDATE'/); window = params.slice(-2); return [[{ id: "selected-page" }]];
  };
  try {
    const result = await service.getMyNotifications("resident", { web_category: "resident:reports", limit: 15, offset: 30 });
    assert.deepEqual(window, [15, 30]); assert.equal(result.total, 40); assert.equal(result.unread_count, 9000);
    assert.equal(result.history_total, 10000); assert.equal(result.unread_content_count, 400); assert.equal(result.notifications.length, 1);
  } finally { pool.query = original; }
});
test("web pagination clamps a page whose final notification was removed", async () => {
  const original = pool.query;
  pool.query = async (sql, params) => {
    if (sql.includes("AS history_total")) return [[{ history_total: 16, unread_count: 0, recent_count: 0 }]];
    if (sql.includes("COUNT(*) AS total")) return [[{ total: 16 }]];
    assert.deepEqual(params.slice(-2), [15, 15]); return [[{ id: "last" }]];
  };
  try { const result = await service.getMyNotifications("admin", { web_category: "all", limit: 15, offset: 30 }); assert.equal(result.offset, 15); }
  finally { pool.query = original; }
});
test("unknown web notification categories are rejected before querying", async () => {
  const original = pool.query; pool.query = async () => { throw new Error("Must not query"); };
  try { await assert.rejects(service.getMyNotifications("resident", { web_category: "resident:private" }), (error) => error.statusCode === 400); }
  finally { pool.query = original; }
});
test("web history preserves a valid partial window after the history shrinks", async () => {
  const original = pool.query;
  pool.query = async (sql, params) => {
    if (sql.includes("AS history_total")) return [[{ history_total: 110, unread_count: 0, unread_content_count: 0, recent_count: 0 }]];
    if (sql.includes("COUNT(*) AS total")) return [[{ total: 110 }]];
    assert.deepEqual(params.slice(-2), [30, 100]); return [[{ id: "last-window" }]];
  };
  try { const result = await service.getMyNotifications("admin", { web_category: "all", limit: 30, offset: 100 }); assert.equal(result.offset, 100); }
  finally { pool.query = original; }
});
test("viewing resident content marks only that owner's post notifications read", async () => {
  const original = pool.query;
  pool.query = async (sql, params) => {
    assert.match(sql, /user_id = \?/); assert.deepEqual(params, ["resident"]);
    assert.match(sql, /type = 'NEW_POST' OR ref_module = 'posts'/);
    return [{ affectedRows: 2 }];
  };
  try { assert.deepEqual(await service.markAllAsRead("resident", "content"), { read: true }); }
  finally { pool.query = original; }
});
