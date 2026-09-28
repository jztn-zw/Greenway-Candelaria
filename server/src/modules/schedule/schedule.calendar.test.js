const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const audit = require("../audit/audit.service");
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
    assert.match(queries[0].sql, /COALESCE\(s.end_date, s.event_date\) >= CONCAT\(\?, '-01'\)/);
    assert.equal(queries[0].sql.includes("CURDATE()"), false);
    assert.deepEqual(queries[0].params, ["2026-09-27", "2026-09-27", "2026-09", "2026-09", "2026-09-27", "2026-09-27", "ONGOING"]);
    const existing = await service.getEvents({}, { role: "DRIVER" });
    assert.equal(existing[0].created_by, "admin-1");
  } finally { pool.query = original; }
});

test("resident and guest reads cannot expose internal events through list or detail", async () => {
  const original = pool.query;
  pool.query = async (sql) => {
    assert.match(sql, /s.visibility = 'PUBLIC'/);
    assert.match(sql, /s.announcement_id IS NOT NULL/);
    assert.match(sql, /ab.barangay_id = \?/);
    return [[]];
  };
  try {
    for (const user of [null, { role: "RESIDENT", barangay_id: "b1" }]) {
      assert.deepEqual(await service.getEvents({ event_type: "PRIVATE_EVENT", visibility: "PRIVATE", view: "collector" }, user), []);
      await assert.rejects(service.getEventById("internal-id", user), (error) => error.statusCode === 404);
    }
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
