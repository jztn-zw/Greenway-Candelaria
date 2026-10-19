const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const audit = require("../audit/audit.service");
const notifications = require("../notifications/notifications.service");
const service = require("./schedule.service");
const router = require("./schedule.routes");
const { createEventSchema, updateEventSchema, eventFiltersSchema } = require("./schedule.schema");
after(() => pool.end());

const event = { id: "event-1", title: "Internal briefing", event_date: "2026-09-25", end_date: "2026-09-30",
  event_type: "PRIVATE_EVENT", visibility: "PRIVATE", description: "Instructions", created_by: "admin-1", creator_name: "Admin", created_at: "audit", updated_at: "audit" };

test("date validation rejects impossible dates and malformed month filters", () => {
  for (const event_date of ["2027-02-29", "2028-02-30", "2027-13-01", "2027-04-31", "2027-00-01", "2027-01-00"]) {
    assert.equal(createEventSchema.safeParse({ ...event, event_date }).success, false);
    assert.equal(updateEventSchema.safeParse({ end_date: event_date }).success, false);
  }
  assert.equal(createEventSchema.safeParse({ ...event, event_date: "2028-02-29" }).success, true);
  assert.equal(eventFiltersSchema.safeParse({ month: "2027-13" }).success, false);
  assert.equal(eventFiltersSchema.safeParse({ month: ["2027-01", "2027-02"] }).success, false);
  assert.equal(eventFiltersSchema.safeParse({ month: "2027-01" }).success, true);
  assert.equal(createEventSchema.safeParse({ ...event, event_type: "COLLECTION_SCHEDULE" }).success, false);
});

test("collector web reads are month-bounded and omit metadata without changing existing consumers", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-26T17:00:00Z") });
  const original = pool.query;
  const queries = [];
  pool.query = async (sql, params) => { queries.push({ sql, params }); return [[event]]; };
  try {
    const results = await service.getEvents({ view: "collector", month: "2026-09", status: "ONGOING" }, { role: "DRIVER" });
    assert.equal(results[0].title, event.title);
    for (const key of ["created_by", "creator_name", "created_at", "updated_at"]) assert.equal(key in results[0], false);
    assert.match(queries[0].sql, /s.event_type = 'PRIVATE_EVENT' AND s.visibility = 'PRIVATE'/);
    assert.match(queries[0].sql, /s.event_type = 'COMMUNITY_EVENT' AND s.visibility = 'SHARED' AND s.announcement_id IS NULL/);
    assert.match(queries[0].sql, /COALESCE\(s.end_date, s.event_date\) >= CONCAT\(\?, '-01'\)/);
    assert.equal(queries[0].sql.includes("CURDATE()"), false);
    assert.deepEqual(queries[0].params, ["2026-09-27", "2026-09-27", "2026-09", "2026-09", "2026-09-27", "2026-09-27", "ONGOING"]);
    const existing = await service.getEvents({}, { role: "DRIVER" });
    assert.equal(existing[0].created_by, "admin-1");
    await service.getEventById(event.id, { role: "DRIVER" });
    assert.match(queries[2].sql, /s.event_type = 'COMMUNITY_EVENT' AND s.visibility = 'SHARED' AND s.announcement_id IS NULL/);
  } finally { pool.query = original; }
});

test("resident and guest reads cannot expose internal events through list or detail", async () => {
  const original = pool.query;
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    assert.match(sql, /s.visibility IN \('PUBLIC', 'SHARED'\)/);
    assert.match(sql, /s.event_type = 'COMMUNITY_EVENT' AND s.announcement_id IS NULL/);
    assert.match(sql, /s.barangay_id IS NULL OR s.barangay_id = \?/);
    assert.match(sql, /s.announcement_id IS NOT NULL AND EXISTS/);
    assert.match(sql, /ab.barangay_id = \?/);
    return [[]];
  };
  try {
    for (const user of [null, { role: "RESIDENT", barangay_id: "b1" }]) {
      assert.deepEqual(await service.getEvents({ event_type: "PRIVATE_EVENT", visibility: "PRIVATE", view: "collector" }, user), []);
      await assert.rejects(service.getEventById("internal-id", user), (error) => error.statusCode === 404);
    }
    assert.deepEqual(queries[0].params.slice(2, 4), ["", ""]);
    assert.deepEqual(queries[2].params.slice(2, 4), ["b1", "b1"]);
  } finally { pool.query = original; }
});

test("collectors are denied all event write routes even when bypassing the read-only UI", () => {
  const writes = router.stack.filter((layer) => layer.route && ["post", "put", "delete"].some((method) => layer.route.methods[method]) && layer.route.path.startsWith("/events"));
  assert.equal(writes.length, 3);
  for (const layer of writes) {
    let code;
    let nextCalled = false;
    const res = { locals: {}, status(value) { code = value; return this; }, json() { return this; } };
    // Exercise each route's real authorization middleware after authentication.
    layer.route.stack[1].handle({ user: { role: "DRIVER" } }, res, () => { nextCalled = true; });
    assert.equal(code, 403);
    assert.equal(nextCalled, false);
    layer.route.stack[1].handle({ user: { role: "ADMIN" } }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  }
});

test("ongoing event descriptions can be corrected while new past start dates remain rejected", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T02:00:00Z") });
  const originalQuery = pool.query;
  const originalLog = audit.log;
  const writes = [];
  pool.query = async (sql, params) => {
    if (sql.trimStart().startsWith("SELECT")) return [[event]];
    writes.push({ sql, params }); return [{ affectedRows: 1 }];
  };
  audit.log = async () => {};
  try {
    await service.updateEvent(event.id, { description: "Corrected instructions" }, { id: "admin-1", role: "ADMIN" });
    assert.equal(writes.length, 1);
    assert.equal(writes[0].params[0], "Corrected instructions");
    assert.equal(writes[0].sql.includes("event_date ="), false);
    await assert.rejects(service.updateEvent(event.id, { event_date: "2026-09-24" }, { role: "ADMIN" }), (error) => error.statusCode === 400);
    await assert.rejects(service.createEvent(event, { id: "admin-1", role: "ADMIN" }), (error) => error.statusCode === 400);
    await assert.rejects(service.updateEvent(event.id, { end_date: "2026-09-24" }, { role: "ADMIN" }), (error) => error.statusCode === 400);
    assert.equal(writes.length, 1);
  } finally { pool.query = originalQuery; audit.log = originalLog; }
});

test("admins can create and edit barangay-scoped public community events", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T02:00:00Z") });
  const originalQuery = pool.query;
  const originalGetConnection = pool.getConnection;
  const originalLog = audit.log;
  const writes = [];
  const communityEvent = { ...event, event_type: "COMMUNITY_EVENT", visibility: "PUBLIC", barangay_id: "b1", announcement_id: null };
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql, params) => {
      if (sql.includes("SELECT u.id FROM users u") || sql.includes("SELECT id FROM users WHERE role = 'DRIVER'")) return [[]];
      writes.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
  });
  pool.query = async (sql, params) => {
    if (sql.includes("FROM barangays WHERE id = ?")) return [[{ id: "b1" }]];
    if (sql.trimStart().startsWith("SELECT")) return [[communityEvent]];
    writes.push({ sql, params });
    return [{ affectedRows: 1 }];
  };
  audit.log = async () => {};
  try {
    const created = await service.createEvent({
      title: "Barangay clean-up",
      event_date: "2099-01-01",
      event_type: "COMMUNITY_EVENT",
      visibility: "PUBLIC",
      barangay_id: "b1",
    }, { id: "admin-1", role: "ADMIN" });
    assert.equal(created.event_type, "COMMUNITY_EVENT");
    assert.equal(created.visibility, "PUBLIC");
    assert.ok(writes[0].sql.includes("INSERT INTO schedules"));
    assert.equal(writes[0].params[7], "COMMUNITY_EVENT");
    assert.equal(writes[0].params[8], "PUBLIC");
    assert.equal(writes[0].params[10], "b1");

    writes.length = 0;
    await service.updateEvent(event.id, { barangay_id: "b1", event_type: "COMMUNITY_EVENT", visibility: "PUBLIC" }, { id: "admin-1", role: "ADMIN" });
    assert.equal(writes.length, 1);
    assert.match(writes[0].sql, /event_type = \?/);
    assert.match(writes[0].sql, /visibility = \?/);
    assert.match(writes[0].sql, /barangay_id = \?/);
  } finally { pool.query = originalQuery; pool.getConnection = originalGetConnection; audit.log = originalLog; }
});

const makeNotificationConnection = (events, recipients, failNotificationInsert = false) => ({
  async beginTransaction() { events.push("begin"); },
  async commit() { events.push("commit"); },
  async rollback() { events.push("rollback"); },
  release() { events.push("release"); },
  async query(sql, params) {
    events.push({ sql, params });
    if (failNotificationInsert && sql.includes("INSERT INTO notifications")) throw new Error("notification storage unavailable");
    if (sql.includes("SELECT u.id FROM users u")) return [recipients];
    if (sql.includes("SELECT id FROM users WHERE role = 'DRIVER'")) return [recipients];
    return [{ affectedRows: 1 }];
  },
});

for (const visibility of ["PUBLIC", "SHARED"]) test(`creating a ${visibility} schedule notifies the correct resident and MENRO audience after commit`, async () => {
  const originals = { query: pool.query, getConnection: pool.getConnection, log: audit.log, emit: notifications.emitStoredNotifications };
  const events = [];
  const emitted = [];
  const communityEvent = { ...event, title: "Barangay clean-up", event_date: "2099-01-01", event_type: "COMMUNITY_EVENT", visibility: "PUBLIC", barangay_id: "b1", announcement_id: null };
  pool.query = async (sql) => sql.includes("FROM barangays WHERE id = ?") ? [[{ id: "b1" }]] : [[communityEvent]];
  pool.getConnection = async () => {
    const connection = makeNotificationConnection(events, [{ id: "resident-1" }]);
    const query = connection.query.bind(connection);
    connection.query = async (sql, params) => {
      if (sql.includes("SELECT id FROM users WHERE role = 'DRIVER'")) {
        events.push({ sql, params });
        return [[{ id: "collector-1" }]];
      }
      return query(sql, params);
    };
    return connection;
  };
  audit.log = async () => {};
  notifications.emitStoredNotifications = (rows) => { events.push("emit"); emitted.push(...rows); };
  try {
    await service.createEvent({ title: communityEvent.title, event_date: communityEvent.event_date, event_type: "COMMUNITY_EVENT", visibility, barangay_id: "b1" }, { id: "admin-1", role: "ADMIN" });
    const scheduleInsert = events.find((entry) => typeof entry === "object" && entry.sql.includes("INSERT INTO schedules"));
    const residentQuery = events.find((entry) => typeof entry === "object" && entry.sql.includes("SELECT u.id FROM users u"));
    const insert = events.find((entry) => typeof entry === "object" && entry.sql.includes("INSERT INTO notifications"));
    assert.match(residentQuery.sql, /u\.barangay_id = \?/);
    assert.match(residentQuery.sql, /u\.role = 'RESIDENT' AND u\.status = 'ACTIVE'/);
    assert.doesNotMatch(residentQuery.sql, /user_settings|notif_announcements/);
    assert.deepEqual(residentQuery.params, ["b1"]);
    assert.ok(insert, "the schedule should be stored as an in-app notification");
    assert.deepEqual(insert.params[0].map((row) => row[1]), ["resident-1"]);
    assert.equal(insert.params[0][0][2], "ANNOUNCEMENT");
    assert.equal(insert.params[0][0][5], scheduleInsert.params[0]);
    assert.equal(insert.params[0][0][6], "schedule");
    assert.equal(insert.params[0][0][4], "Scheduled for 2099-01-01");
    assert.ok(events.indexOf("commit") < events.indexOf("emit"));
    assert.equal(emitted[0].user_id, "resident-1");
    assert.equal(emitted.some(row => row.user_id === "collector-1" && row.type === "SYSTEM"), visibility === "SHARED");
  } finally {
    pool.query = originals.query; pool.getConnection = originals.getConnection; audit.log = originals.log; notifications.emitStoredNotifications = originals.emit;
  }
});

test("rolls the schedule back when its notification cannot be stored", async () => {
  const originals = { query: pool.query, getConnection: pool.getConnection, log: audit.log, emit: notifications.emitStoredNotifications };
  const events = [];
  pool.query = async () => [[]];
  pool.getConnection = async () => makeNotificationConnection(events, [{ id: "resident-1" }], true);
  audit.log = async () => {};
  notifications.emitStoredNotifications = () => events.push("emit");
  try {
    await assert.rejects(service.createEvent({ title: "Community clean-up", event_date: "2099-01-01", event_type: "COMMUNITY_EVENT", visibility: "PUBLIC" }, { id: "admin-1", role: "ADMIN" }), /notification storage unavailable/);
    assert.ok(events.includes("rollback"));
    assert.equal(events.includes("commit"), false);
    assert.equal(events.includes("emit"), false);
    assert.ok(events.includes("release"));
  } finally {
    pool.query = originals.query; pool.getConnection = originals.getConnection; audit.log = originals.log; notifications.emitStoredNotifications = originals.emit;
  }
});

test("creating a private MENRO schedule notifies active collectors through the system notification channel", async () => {
  const originals = { query: pool.query, getConnection: pool.getConnection, log: audit.log, emit: notifications.emitStoredNotifications };
  const events = [];
  const emitted = [];
  const collectors = [{ id: "collector-1" }, { id: "collector-2" }];
  pool.query = async () => [[event]];
  pool.getConnection = async () => makeNotificationConnection(events, collectors);
  audit.log = async () => {};
  notifications.emitStoredNotifications = (rows) => { events.push("emit"); emitted.push(...rows); };
  try {
    await service.createEvent({ title: "MENRO briefing", event_date: "2099-01-01", end_date: "2099-01-03", description: "Review route updates." }, { id: "admin-1", role: "ADMIN" });
    const recipientQuery = events.find((entry) => typeof entry === "object" && entry.sql.includes("SELECT id FROM users WHERE role = 'DRIVER'"));
    assert.ok(recipientQuery, "active collectors should be selected for the private MENRO schedule");
    assert.match(recipientQuery.sql, /status = 'ACTIVE'/);
    const insert = events.find((entry) => typeof entry === "object" && entry.sql.includes("INSERT INTO notifications"));
    assert.deepEqual(insert.params[0].map((row) => row[1]), ["collector-1", "collector-2"]);
    assert.equal(insert.params[0][0][2], "SYSTEM");
    assert.equal(insert.params[0][0][6], "schedule");
    assert.equal(insert.params[0][0][4], "Scheduled for January 1, 2099 through January 3, 2099.\nReview route updates.");
    assert.ok(events.indexOf("commit") < events.indexOf("emit"));
    assert.equal(emitted.length, 2);
  } finally {
    pool.query = originals.query; pool.getConnection = originals.getConnection; audit.log = originals.log; notifications.emitStoredNotifications = originals.emit;
  }
});
