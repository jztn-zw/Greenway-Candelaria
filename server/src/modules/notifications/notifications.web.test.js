const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./notifications.service");
after(() => pool.end());

test("notification history returns the database UTC clock even when the history is empty", async () => {
  const original = pool.query;
  pool.query = async (sql) => {
    if (sql.includes("AS history_total")) return [[{ history_total: 0, unread_count: 0, unread_content_count: 0, recent_count: 0 }]];
    if (sql.includes("COUNT(*) AS total")) {
      assert.match(sql, /UTC_TIMESTAMP\(3\) AS server_time/);
      return [[{ total: 0, server_time: "2026-10-06 16:59:00.000" }]];
    }
    return [[]];
  };
  try {
    const result = await service.getMyNotifications("resident", { web_category: "all" });
    assert.equal(result.server_time, "2026-10-06 16:59:00.000");
    assert.deepEqual(result.notifications, []);
  } finally { pool.query = original; }
});
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

test("web history excludes archived, deleted, and superseded post alerts from unread counts", async () => {
  const original = pool.query; const queries = [];
  pool.query = async (sql) => {
    queries.push(sql);
    if (sql.includes("AS history_total")) return [[{ history_total: 0, unread_count: 0, unread_content_count: 0, recent_count: 0 }]];
    if (sql.includes("COUNT(*) AS total")) return [[{ total: 0, server_time: "2026-10-06 16:59:00.000" }]];
    return [[]];
  };
  try {
    await service.getMyNotifications("resident", { web_category: "all" });
    const contentCounts = queries.filter((sql) => sql.includes("AS unread_content_count"));
    assert.equal(contentCounts.length, 1);
    assert.match(contentCounts[0], /p\.status = 'PUBLISHED'/);
    assert.match(contentCounts[0], /p\.deleted_at IS NULL/);
    assert.match(contentCounts[0], /n\.created_at >= p\.published_at/);
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
test("explicit content bulk-read remains restricted to the owner's post notifications", async () => {
  const original = pool.query;
  pool.query = async (sql, params) => {
    assert.match(sql, /user_id = \?/); assert.deepEqual(params, ["resident"]);
    assert.match(sql, /type = 'NEW_POST' OR ref_module = 'posts'/);
    return [{ affectedRows: 2 }];
  };
  try { assert.deepEqual(await service.markAllAsRead("resident", "content"), { read: true }); }
  finally { pool.query = original; }
});

test("opening a post reads only the owner's matching post notifications and is idempotent", async () => {
  const original = pool.query;
  const rows = [
    { user: "resident", post: "opened", type: "NEW_POST", module: "posts", read: false },
    { user: "resident", post: "opened", type: "SYSTEM", module: "posts", read: false },
    { user: "resident", post: "newly-scheduled", type: "NEW_POST", module: "posts", read: false },
    { user: "other-resident", post: "opened", type: "NEW_POST", module: "posts", read: false },
    { user: "resident", post: "opened", type: "ANNOUNCEMENT", module: "announcements", read: false },
  ];
  pool.query = async (sql, params) => {
    assert.match(sql, /user_id = \?/); assert.match(sql, /ref_id = \?/);
    assert.match(sql, /is_read = FALSE/); assert.match(sql, /type = 'NEW_POST' OR ref_module = 'posts'/);
    assert.deepEqual(params, ["resident", "opened"]);
    rows.forEach(row => { if (row.user === params[0] && row.post === params[1] && (row.type === "NEW_POST" || row.module === "posts")) row.read = true; });
    return [{ affectedRows: 2 }];
  };
  try {
    await service.markAllAsRead("resident", "content", "opened");
    await service.markAllAsRead("resident", "content", "opened");
    assert.deepEqual(rows.map(row => row.read), [true, true, false, false, false]);
  } finally { pool.query = original; }
});

test("invalid post read scopes cannot fall back to marking all notifications read", async () => {
  const original = pool.query; pool.query = async () => { throw new Error("Must not query"); };
  try {
    for (const [category, postId] of [["content", ""], ["content", "   "], ["content", null], ["content", 2], [undefined, "opened"]]) {
      await assert.rejects(service.markAllAsRead("resident", category, postId), error => error.statusCode === 400);
    }
  } finally { pool.query = original; }
});

test("the read endpoint preserves the post scope and uses the authenticated owner", async () => {
  const controller = require("./notifications.controller");
  const original = pool.query;
  let queried = false;
  pool.query = async (sql, params) => {
    assert.match(sql, /ref_id = \?/);
    assert.deepEqual(params, ["resident", "opened"]);
    queried = true;
    return [{ affectedRows: 1 }];
  };
  const res = {
    status(code) { assert.equal(code, 200); return this; },
    json(body) { assert.equal(body.success, true); assert.deepEqual(body.data, { read: true }); },
  };
  try {
    await controller.markAllAsRead({ user: { id: "resident" }, body: { category: "content", post_id: "opened", user_id: "other-resident" } }, res, error => { throw error; });
    assert.equal(queried, true);
  } finally { pool.query = original; }
});
