const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./schedule.service");
const router = require("./schedule.routes");
const { publicScheduleFiltersSchema } = require("./schedule.schema");

after(() => pool.end());

test("public schedule requires one barangay and one street identifier", () => {
  for (const query of [{}, { barangay_id: "b1" }, { barangay_id: "b1", street_id: [] }, { barangay_id: " ", street_id: "s1" }, { barangay_id: "b1", street_id: "x".repeat(37) }]) {
    assert.equal(publicScheduleFiltersSchema.safeParse(query).success, false);
  }
  assert.deepEqual(publicScheduleFiltersSchema.parse({ barangay_id: " b1 ", street_id: "s1" }), { barangay_id: "b1", street_id: "s1" });
});

test("public schedule validates street membership before reading route data", async (t) => {
  let calls = 0;
  t.mock.method(pool, "query", async (sql, params) => {
    calls++;
    assert.match(sql, /bs.barangay_id = b.id/);
    assert.match(sql, /b.status = 'ACTIVE'/);
    assert.deepEqual(params, ["b1", "other-street"]);
    return [[]];
  });
  await assert.rejects(service.getPublicSchedule({ barangay_id: "b1", street_id: "other-street" }), error => error.statusCode === 404);
  assert.equal(calls, 1);
});

test("areas without collection service do not return a schedule", async (t) => {
  let calls = 0;
  t.mock.method(pool, "query", async () => { calls++; return [[{ collection_service_available: 0 }]]; });
  assert.deepEqual(await service.getPublicSchedule({ barangay_id: "b1", street_id: "s1" }), []);
  assert.equal(calls, 1);
});

test("guest schedule exposes only recurring collection details for the selected street", async (t) => {
  const queries = [];
  t.mock.method(pool, "query", async (sql, params) => {
    queries.push({ sql, params });
    return queries.length === 1 ? [[{ collection_service_available: 1 }]] : [[{
      day_of_week: "MONDAY", waste_type: "BIODEGRADABLE", start_time: "06:00",
      driver_id: "private-driver", truck_id: "private-truck", route_name: "internal-route", latitude: 14,
    }]];
  });
  assert.deepEqual(await service.getPublicSchedule({ barangay_id: "b1", street_id: "s1" }), [
    { day_of_week: "MONDAY", waste_type: "BIODEGRADABLE", start_time: "06:00" },
  ]);
  const { sql, params } = queries[1];
  assert.match(sql, /SELECT DISTINCT/);
  assert.match(sql, /r.status = 'ACTIVE' AND r.driver_id IS NOT NULL/);
  assert.match(sql, /rs.barangay_id = \?/);
  assert.match(sql, /rs.street_id IS NULL OR rs.street_id = \?/);
  assert.deepEqual(params, ["b1", "s1"]);
  assert.doesNotMatch(sql, /JOIN users|route_runs|gps|SELECT r\.\*/);
});

test("guest schedule route is public while resident and reminder routes remain protected", async (t) => {
  const publicRoute = router.stack.find(layer => layer.route?.path === "/public").route;
  assert.equal(publicRoute.stack.length, 1);
  assert.equal(publicRoute.methods.get, true);
  assert.equal(router.stack.find(layer => layer.route?.path === "/").route.stack.length, 3);
  assert.equal(router.stack.find(layer => layer.route?.path === "/reminders" && layer.route.methods.get).route.stack.length, 3);
  t.mock.method(service, "getPublicSchedule", async filters => { assert.deepEqual(filters, { barangay_id: "b1", street_id: "s1" }); return []; });
  let response;
  let nextError;
  const res = { status(code) { assert.equal(code, 200); return this; }, json(value) { response = value; return this; } };
  await publicRoute.stack[0].handle({ query: { barangay_id: "b1", street_id: "s1" } }, res, error => { nextError = error; });
  assert.equal(nextError, undefined);
  assert.deepEqual(response.data, []);
  await publicRoute.stack[0].handle({ query: {} }, res, error => { nextError = error; });
  assert.equal(nextError.name, "ZodError");
});
