const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const tracking = require("./tracking.service");
const routes = require("../routes/routes.service");
const routeRuns = require("../routes/routeRuns.service");
const trucks = require("../trucks/trucks.service");
const drivers = require("../drivers/drivers.service");

after(() => pool.end());

const withQueries = async (handler, run) => {
  const original = pool.query;
  const queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    return handler(sql, params);
  };
  try { await run(queries); } finally { pool.query = original; }
};

test("live tracking reads the bounded latest-location table for current runs", async () => {
  await withQueries(async () => [[]], async (queries) => {
    assert.deepEqual(await tracking.getLive(), []);
    assert.match(queries[0].sql, /FROM tracking_latest/);
    assert.match(queries[0].sql, /rr.status IN \('ACTIVE','PAUSED'\)/);
    assert.doesNotMatch(queries[0].sql, /FROM tracking_logs/);
  });
});

test("replay history uses the selected Manila day and dated route-run stops", async () => {
  await withQueries(async (sql) => {
    if (sql.startsWith("SELECT id FROM trucks")) return [[{ id: "truck-1" }]];
    if (sql.includes("FROM tracking_logs tl")) return [[{ id: "ping-1" }]];
    if (sql.includes("FROM route_runs rr")) return [[{ stop_id: "stop-1", stop_name: "Main Street", route_started_at: "2026-09-25 01:00:00" }]];
    throw new Error(`Unexpected query: ${sql}`);
  }, async (queries) => {
    const history = await tracking.getHistory("truck-1", { date: "2026-09-25", limit: 100 });
    assert.equal(history.logs[0].id, "ping-1");
    assert.equal(history.stops[0].stop_name, "Main Street");
    assert.equal(history.stops[0].route_started_at, "2026-09-25 01:00:00");
    assert.deepEqual(queries[1].params, ["truck-1", "2026-09-24 16:00:00", "2026-09-25 16:00:00", 101]);
    assert.deepEqual(queries[2].params, ["truck-1", "2026-09-25"]);
    assert.match(queries[2].sql, /JOIN route_run_stops/);
    assert.match(queries[2].sql, /rr\.collection_started_at AS route_started_at/);
    assert.match(queries[2].sql, /ORDER BY COALESCE\(rr\.collection_started_at, rr\.scheduled_start_time\)/);
  });
});

test("missed collection log reads dated run stops and never invents a report link", async () => {
  await withQueries(async () => [[{ id: "miss-1", resident_report_link: null }]], async (queries) => {
    const rows = await routes.getMissedCollections({ days: 30, truck_id: "truck-1" });
    assert.equal(rows[0].id, "miss-1");
    assert.match(queries[0].sql, /FROM route_run_stops rrs/);
    assert.match(queries[0].sql, /rrs\.status = 'MISSED'/);
    assert.match(queries[0].sql, /rr\.run_date >= DATE_SUB/);
    assert.doesNotMatch(queries[0].sql, /FROM reports/);
    assert.equal(queries[0].params[0], "truck-1");
    assert.equal(queries[0].params[2], 29);
  });
});

test("dispatch messages reject a route assigned to another collector", async () => {
  await withQueries(async (sql) => {
    if (sql.includes("WHERE d.user_id = ?")) return [[{ id: "driver-1", user_id: "user-1" }]];
    if (sql.includes("FROM route_runs WHERE id")) return [[]];
    throw new Error(`Unexpected query: ${sql}`);
  }, async (queries) => {
    await assert.rejects(
      drivers.sendAdminMessageToDriver("admin-1", "user-1", "other-route", "Proceed"),
      (error) => error.statusCode === 400,
    );
    assert.deepEqual(queries[1].params, ["other-route", "driver-1"]);
    assert.equal(queries.some(({ sql }) => sql.includes("INSERT INTO driver_messages")), false);
  });
});

test("driver replies reject a route assigned to another collector", async () => {
  await withQueries(async (sql) => {
    if (sql.includes("WHERE d.user_id = ?")) return [[{ id: "driver-1", user_id: "user-1" }]];
    if (sql.includes("FROM route_runs WHERE id")) return [[]];
    throw new Error(`Unexpected query: ${sql}`);
  }, async (queries) => {
    await assert.rejects(
      drivers.updateStatusMsg("user-1", "On the way", "other-route"),
      (error) => error.statusCode === 403,
    );
    assert.equal(queries.some(({ sql }) => sql.includes("INSERT INTO driver_messages")), false);
  });
});

test("admin overview retains dated routes and scopes general messages per collector", async () => {
  const originalTrucks = trucks.getAll;
  const originalRuns = routeRuns.getAllRoutesToday;
  const originalDrivers = drivers.getAll;
  trucks.getAll = async () => [{ id: "truck-1" }];
  routeRuns.getAllRoutesToday = async () => [{ route_id: "run-1", truck_id: "truck-1" }];
  drivers.getAll = async () => [{ id: "driver-1" }];
  try {
    await withQueries(async (sql) => {
      if (sql.includes("FROM tracking_latest tl")) return [[]];
      if (sql.includes("FROM driver_messages dm")) return [[]];
      throw new Error(`Unexpected query: ${sql}`);
    }, async (queries) => {
      const overview = await tracking.getAdminOverview();
      assert.equal(overview.routes[0].route_id, "run-1");
      assert.deepEqual(queries[1].params, [["driver-1"]]);
      assert.match(queries[1].sql, /PARTITION BY dm\.driver_id/);
      assert.match(queries[1].sql, /recent\.message_rank <= 50/);
    });
  } finally {
    trucks.getAll = originalTrucks;
    routeRuns.getAllRoutesToday = originalRuns;
    drivers.getAll = originalDrivers;
  }
});

test("residents receive only area-scoped live data without collector identity or plates", async () => {
  await withQueries(async () => [[{
    truck_id: "truck", truck_name: "Truck", truck_status: "ON_THE_WAY",
    latitude: "14", longitude: "121", last_ping: "2026-09-26 01:00:00",
    driver_id: "private-id", driver_name: "Private Name", truck_plate: "PRIVATE",
  }]], async (queries) => {
    const [row] = await tracking.getLive({ id: "resident", role: "RESIDENT" });
    assert.equal(row.driver_id, undefined);
    assert.equal(row.driver_name, undefined);
    assert.equal(row.truck_plate, undefined);
    assert.equal(row.last_ping, "2026-09-26T01:00:00.000Z");
    assert.equal(row.latitude, 14);
    assert.match(queries[0].sql, /rs.street_id = resident.street_id/);
    assert.match(queries[0].sql, /rs.status IN \('NOT_STARTED','IN_PROGRESS'\)/);
    assert.deepEqual(queries[0].params, ["resident", "resident"]);
  });
});

test("collector live data is scoped to their assigned truck and anonymous access fails closed", async () => {
  await withQueries(async () => [[]], async (queries) => {
    await tracking.getLive({ id: "collector", role: "DRIVER" });
    assert.match(queries[0].sql, /vd.truck_id = t.id AND vd.user_id = \?/);
    assert.deepEqual(queries[0].params, ["collector"]);
    await assert.rejects(tracking.getLive({ role: "GUEST" }), { statusCode: 403 });
    assert.equal(queries.length, 1);
  });
});

test("history pagination includes later points rather than truncating the shift", async () => {
  const points = [
    { id: "a", created_at: "2026-09-26 01:00:00.001" },
    { id: "b", created_at: "2026-09-26 01:00:00.002" },
    { id: "c", created_at: "2026-09-26 01:00:00.003" },
  ];
  await withQueries(async (sql, params) => {
    if (sql.startsWith("SELECT id FROM trucks")) return [[{ id: "truck" }]];
    if (sql.includes("FROM tracking_logs tl")) return [params.includes("b") ? points.slice(2) : points];
    throw new Error("Unexpected query");
  }, async () => {
    const first = await tracking.getHistory("truck", { limit: 2 });
    assert.deepEqual(first.logs.map((p) => p.id), ["a", "b"]);
    assert.ok(first.next_cursor);
    const second = await tracking.getHistory("truck", { limit: 2, cursor: first.next_cursor });
    assert.deepEqual(second.logs.map((p) => p.id), ["c"]);
    assert.equal(second.next_cursor, null);
  });
});

test("routing uses a local estimate when no trusted provider is configured", async () => {
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async () => { requests++; throw new Error("Should not disclose coordinates"); };
  try {
    const result = await tracking.fetchRoadRoute(121, 14, 121.01, 14.01);
    assert.equal(result.source, "haversine");
    assert.equal(requests, 0);
  } finally { global.fetch = originalFetch; }
});
