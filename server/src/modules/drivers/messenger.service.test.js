const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const messenger = require("./messenger.service");
after(() => pool.end());
const withQuery = async (query, run) => { const original = pool.query; pool.query = query; try { await run(); } finally { pool.query = original; } };
const row = (id, time = "2026-09-28 01:00:00") => ({ id, created_at: time, sender_role: "ADMIN", sender_name: "Admin", message: "Dispatch", is_read: 0 });

test("bounded retained-message receipt checks return only confirmed IDs in this conversation", async () => {
  await withQuery(async (sql, params) => {
    if (/SELECT id FROM driver_messages/.test(sql)) {
      assert.match(sql, /driver_id = \?/); assert.match(sql, /is_read = TRUE/);
      assert.deepEqual(params, ["driver", ["old-message", "foreign"]]);
      return [[{ id: "old-message" }]];
    }
    throw Error("Receipt-only checks must not download chat history or counts");
  }, async () => {
    const page = await messenger.getConversation("driver", { receipt_ids: "old-message,foreign", receipts_only: "1" });
    assert.deepEqual(page.readIds, ["old-message"]); assert.deepEqual(page.items, []);
  });
});
test("receipt references are bounded and validated before database access", async () => {
  await withQuery(async () => { throw Error("No DB read expected"); }, async () => {
    for (const receipt_ids of [["message"], "", "a".repeat(65), Array.from({ length: 101 }, (_, i) => "id-" + i).join(",")]) {
      await assert.rejects(messenger.getConversation("driver", { receipt_ids, receipts_only: "1" }), error => error.statusCode === 400);
    }
  });
});

test("conversation pages are bounded, stable, minimal, and count all unread messages", async () => {
  const queries = [];
  await withQuery(async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes("unread_count")) return [[{ unread_count: 402 }]];
    assert.match(sql, /u\.id AS sender_id/);
    assert.match(sql, /u\.avatar_url AS sender_avatar_url/);
    return [[row("c"), { ...row("b"), sender_id: "admin", sender_avatar_url: "/profile-avatars/avatar-9.png" }, row("a")]];
  }, async () => {
    const page = await messenger.getConversation("driver", { limit: "2" });
    assert.deepEqual(page.items.map((item) => item.id), ["b", "c"]);
    assert.equal(page.unreadCount, 402); assert.equal(page.items[0].is_read, false);
    assert.equal(page.items[0].sender_id, "admin");
    assert.equal(page.items[0].sender_avatar_url, "/profile-avatars/avatar-9.png");
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
    if (sql.startsWith("SELECT dm.id")) return [[{ ...row(savedId || params[0]), sender_role: "DRIVER", message: options.message ?? input.message }]];
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
  for (const message of ["", "   ", "a".repeat(1001)]) await assert.rejects(messenger.sendMessage(sender, driver, { ...input, message }), (error) => error.statusCode === 400);
  await assert.rejects(messenger.sendMessage(sender, driver, { ...input, request_id: "bad" }), (error) => error.statusCode === 400);
});

test("admin and collector can save a complete 1,000-character message", async () => {
  const message = "a".repeat(1000);
  for (const role of ["ADMIN", "DRIVER"]) {
    await withConnection({ message }, async ({ writes }) => {
      const saved = await messenger.sendMessage({ ...sender, role }, driver, { ...input, message });
      assert.equal(saved.message, message);
      assert.equal(writes.find(({ sql }) => sql.startsWith("INSERT INTO driver_messages")).params[4], message);
    });
  }
});

test("the route-based admin message schema uses the same 1,000-character limit", () => {
  const { adminDriverMessageSchema } = require("./drivers.schema");
  const payload = { driver_user_id: "collector", route_id: "run", message: "a".repeat(1000) };
  assert.equal(adminDriverMessageSchema.safeParse(payload).success, true);
  assert.equal(adminDriverMessageSchema.safeParse({ ...payload, message: "a".repeat(1001) }).success, false);
});

test("admin conversation counts unread incoming messages independently of alerts", async () => {
  await withQuery(async (sql) => {
    if (sql.includes("unread_count")) {
      assert.match(sql, /u\.role = 'DRIVER'/);
      assert.doesNotMatch(sql, /notifications|user_settings/);
      return [[{ unread_count: 402 }]];
    }
    return [[{ ...row("incoming"), sender_role: "DRIVER" }]];
  }, async () => { assert.equal((await messenger.getConversation("driver", {}, "ADMIN")).unreadCount, 402); });
});
test("admin unread summary counts saved messages even with disabled or cleared alerts", async () => {
  assert.equal(typeof messenger.getAdminUnread, "function", "A message-based admin unread summary is required");
  await withQuery(async (sql) => {
    assert.match(sql, /FROM driver_messages/); assert.match(sql, /u\.role = 'DRIVER'/);
    assert.doesNotMatch(sql, /notifications|user_settings/);
    return [[{ driver_id: "driver", unread_count: 402 }, { driver_id: "other", unread_count: 1 }]];
  }, async () => { assert.deepEqual(await messenger.getAdminUnread(), { unreadCount: 403, byDriver: [{ driverId: "driver", unreadCount: 402 }, { driverId: "other", unreadCount: 1 }] }); });
});
test("admin read receipts affect only selected incoming messages in the selected conversation", async () => {
  assert.equal(typeof messenger.markAdminRead, "function", "Scoped admin message read receipts are required");
  const original = pool.getConnection; let read = false; let committed = false;
  pool.getConnection = async () => ({ beginTransaction: async () => {}, commit: async () => { committed = true; }, rollback: async () => {}, release: () => {}, query: async (sql, params) => {
    if (sql.startsWith("UPDATE driver_messages")) {
      assert.match(sql, /driver_id = \?/); assert.match(sql, /sent_by/); assert.match(sql, /role = 'DRIVER'/);
      assert.deepEqual(params, ["driver", ["incoming"]]); read = true;
    } else { assert.match(sql, /UPDATE notifications/); assert.match(sql, /SELECT id FROM driver_messages WHERE driver_id = \?/); assert.deepEqual(params, ["admin", "driver", ["incoming"]]); }
    return [{ affectedRows: 1 }];
  } });
  try { await messenger.markAdminRead("driver", "admin", ["incoming"]); assert.equal(read, true); assert.equal(committed, true); }
  finally { pool.getConnection = original; }
});
