const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const messenger = require("./messenger.service");
after(() => pool.end());
const withQuery = async (query, run) => { const original = pool.query; pool.query = query; try { await run(); } finally { pool.query = original; } };
const row = (id, time = "2026-09-28 01:00:00") => ({ id, created_at: time, sender_role: "ADMIN", sender_name: "Admin", message: "Dispatch", is_read: 0 });

test("conversation pages are bounded, stable, minimal, and count all unread messages", async () => {
  const queries = [];
  await withQuery(async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("unread_count")) return [[{ unread_count: 402 }]];
    return [[row("c"), row("b"), row("a")]];
  }, async () => {
    const page = await messenger.getConversation("driver", { limit: "2" });
    assert.deepEqual(page.items.map((item) => item.id), ["b", "c"]);
    assert.equal(page.unreadCount, 402); assert.equal(page.items[0].is_read, false);
    assert.deepEqual(JSON.parse(Buffer.from(page.nextCursor, "base64url")), { time: "2026-09-28 01:00:00", id: "b" });
    assert.deepEqual(queries[0].params, ["driver", 3]);
    assert.doesNotMatch(queries[0].sql, /sender_user_id|u\.email|u\.phone|u\.username/);
  });
});
test("cursor pagination scopes older messages to the collector", async () => {
  const cursor = Buffer.from(JSON.stringify({ time: "2026-09-28 01:00:00", id: "b" })).toString("base64url");
  await withQuery(async (sql, params) => {
    if (sql.includes("unread_count")) return [[{ unread_count: 0 }]];
    assert.match(sql, /dm\.driver_id = \?/); assert.match(sql, /dm\.id < \?/);
    assert.deepEqual(params, ["driver", "2026-09-28 01:00:00", "2026-09-28 01:00:00", "b", 51]);
    return [[]];
  }, async () => { await messenger.getConversation("driver", { cursor }); });
});
test("a selected message belonging to another collector is unavailable", async () => {
  await withQuery(async (sql, params) => {
    if (sql.includes("unread_count")) return [[{ unread_count: 0 }]];
    if (sql.includes("dm.id = ?")) assert.deepEqual(params, ["driver", "foreign"]);
    return [[]];
  }, async () => { await assert.rejects(messenger.getConversation("driver", { message_id: "foreign" }), (error) => error.statusCode === 404); });
});
test("invalid limits, references and cursors are rejected before database access", async () => {
  await withQuery(async () => { throw new Error("Database must not be queried"); }, async () => {
    for (const query of [{ limit: 1.5 }, { limit: [2] }, { limit: 301 }, { message_id: ["a", "b"] }, { cursor: "bad" }]) {
      await assert.rejects(messenger.getConversation("driver", query), (error) => error.statusCode === 400);
    }
  });
});
const sender = { id: "collector", role: "DRIVER", full_name: "Collector" };
const driver = { id: "driver", user_id: "collector" };
const input = { message: "Truck needs assistance", request_id: "11111111-1111-4111-8111-111111111111" };
const withConnection = async (options, run) => {
  const original = pool.getConnection;
  const writes = []; let commit = false; let rollback = false; let released = false; let savedId;
  pool.getConnection = async () => ({ beginTransaction: async () => {}, commit: async () => { commit = true; }, rollback: async () => { rollback = true; }, release: () => { released = true; }, query: async (sql, params) => {
    writes.push({ sql, params });
    if (sql.includes("FOR UPDATE")) return [[{ id: "driver" }]];
    if (sql.startsWith("SELECT id, driver_id")) return [options.existing ? [{ id: params[0], driver_id: "driver", message: input.message, route_id: null }] : []];
    if (sql.includes("FROM route_runs")) return [options.foreignRoute ? [] : [{ id: "run" }]];
    if (sql.startsWith("INSERT INTO driver_messages")) { savedId = params[0]; return [{ affectedRows: 1 }]; }
    if (sql.includes("SELECT u.id FROM users")) return [[{ id: "admin" }]];
    if (sql.includes("INSERT INTO notifications")) { if (options.notificationFailure) throw new Error("notification failed"); return [{ affectedRows: 1 }]; }
    if (sql.startsWith("SELECT dm.id")) return [[{ ...row(savedId || params[0]), sender_role: "DRIVER", message: input.message }]];
    throw new Error(`Unexpected query: ${sql}`);
  } });
  try { await run({ writes, state: () => ({ commit, rollback, released }) }); }
  finally { pool.getConnection = original; }
};
test("collector chat and admin notification commit together without changing driver status", async () => {
  await withConnection({}, async ({ writes, state }) => {
    const saved = await messenger.sendMessage(sender, driver, input);
    assert.equal(saved.message, input.message);
    assert.equal(writes.filter(({ sql }) => sql.startsWith("INSERT INTO driver_messages")).length, 1);
    assert.equal(writes.some(({ sql }) => sql.includes("UPDATE drivers")), false);
    const notification = writes.find(({ sql }) => sql.includes("INSERT INTO notifications"));
    const metadata = JSON.parse(notification.params[0][0][7]);
    assert.equal(metadata.driver_id, "driver"); assert.equal(metadata.message_id, saved.id);
    assert.deepEqual(state(), { commit: true, rollback: false, released: true });
  });
});
test("notification failure rolls back collector messaging", async () => {
  await withConnection({ notificationFailure: true }, async ({ state }) => {
    await assert.rejects(messenger.sendMessage(sender, driver, input), /notification failed/);
    assert.deepEqual(state(), { commit: false, rollback: true, released: true });
  });
});
test("retry returns the persisted message and does not duplicate rows or notifications", async () => {
  await withConnection({ existing: true }, async ({ writes, state }) => {
    const saved = await messenger.sendMessage(sender, driver, input);
    assert.equal(saved.message, input.message);
    assert.equal(writes.some(({ sql }) => sql.startsWith("INSERT")), false);
    assert.equal(state().commit, true);
    await assert.rejects(messenger.sendMessage(sender, driver, { ...input, message: "Different text" }), (error) => error.statusCode === 409);
  });
});
test("admin can send before a route starts and only notifies the selected collector", async () => {
  await withConnection({}, async ({ writes }) => {
    await messenger.sendMessage({ id: "admin", role: "ADMIN" }, driver, input);
    const notification = writes.find(({ sql }) => sql.includes("INSERT INTO notifications"));
    assert.equal(notification.params[0][0][1], "collector");
    const message = writes.find(({ sql }) => sql.startsWith("INSERT INTO driver_messages"));
    assert.equal(message.params[3], null);
  });
});
test("foreign route references roll back without saving messages", async () => {
  await withConnection({ foreignRoute: true }, async ({ writes, state }) => {
    await assert.rejects(messenger.sendMessage(sender, driver, { ...input, route_id: "foreign" }), (error) => error.statusCode === 400);
    assert.equal(writes.some(({ sql }) => sql.startsWith("INSERT")), false); assert.equal(state().rollback, true);
  });
});
test("blank, oversized and unidentifiable writes are rejected", async () => {
  for (const message of ["", "   ", "a".repeat(256)]) await assert.rejects(messenger.sendMessage(sender, driver, { ...input, message }), (error) => error.statusCode === 400);
  await assert.rejects(messenger.sendMessage(sender, driver, { ...input, request_id: "bad" }), (error) => error.statusCode === 400);
});
