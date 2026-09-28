const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const { getHistoryForUser } = require("./routeHistory.service");
after(() => pool.end());
const run = (extra = {}) => ({ id: "run-A", run_date: "2026-09-27", status: "PARTIAL", route_name: "Saved route", waste_type: null,
  truck_name: "Original truck", truck_plate: "OLD-123", total_stops: 2, completed_stops: 0, skipped_stops: 2,
  collection_started_at: "2026-09-27 00:00:00", ended_at: "2026-09-27 04:00:00", total_paused_seconds: 3600, ...extra });
const withQuery = async (handler, action) => { const original = pool.query; pool.query = handler; try { await action(); } finally { pool.query = original; } };
test("web pages are bounded, filtered and scoped to the signed-in collector", async () => {
  const calls = [];
  await withQuery(async (sql, params) => { calls.push({ sql, params }); return sql.includes("COUNT(*) AS total FROM route_runs") ? [[{ total: 80 }]] : [[run(), run({ id: "run-B" })]]; }, async () => {
    const page = await getHistoryForUser("collector", 1, { view: "collector", status: "no-collection", waste_type: "General" });
    assert.equal(page.items.length, 1); assert.ok(page.nextCursor); assert.equal(page.total, 80);
    assert.match(calls[0].sql, /d.user_id = \?/); assert.match(calls[0].sql, /NOT EXISTS/);
    assert.match(calls[0].sql, /COALESCE\(rr\.truck_name_snapshot, t\.name\)/);
    assert.match(calls[0].sql, /COALESCE\(rr\.truck_plate_snapshot, t\.plate_number\)/);
    assert.match(calls[0].sql, /LEFT JOIN trucks t ON t\.id = rr\.truck_id/);
    assert.deepEqual(calls[0].params, ["collector", "General", 2]);
    await getHistoryForUser("collector", 1, { view: "collector", cursor: page.nextCursor });
    assert.match(calls[2].sql, /rr.id < \?/); assert.deepEqual(calls[2].params, ["collector", "2026-09-27", "2026-09-27", "run-A", 2]);
  });
});
test("details keep saved checkpoints even if their barangay is missing", async () => {
  await withQuery(async (sql, params) => {
    if (sql.includes("FROM route_run_stops rrs")) {
      assert.match(sql, /LEFT JOIN barangays/); assert.deepEqual(params, [["run-A"]]);
      return [[{ id: "stop", route_run_id: "run-A", stop_order: 1, status: "MISSED", stop_name: "Saved checkpoint", completed_at: null }]];
    }
    if (sql.includes("COUNT(*) AS total FROM route_runs")) return [[{ total: 1 }]];
    assert.ok(sql.includes("rr.id = ?")); assert.deepEqual(params, ["collector", "run-A", 1]); return [[run()]];
  }, async () => {
    const page = await getHistoryForUser("collector", 1, { view: "collector", run_id: "run-A" });
    assert.equal(page.items[0].timeOnRoute, "3h 0m"); assert.equal(page.items[0].status, "no-collection");
    assert.equal(page.items[0].stops[0].barangay, "Saved checkpoint");
    assert.equal("residentsNotified" in page.items[0].stops[0], false); assert.equal("adminMessages" in page.items[0], false);
  });
});
test("old records without a linked truck report missing vehicle identity and duration honestly", async () => {
  await withQuery(async (sql) => sql.includes("COUNT(*) AS total FROM route_runs") ? [[{ total: 1 }]] : [[run({ truck_name: null, truck_plate: null, collection_started_at: null })]], async () => {
    const page = await getHistoryForUser("collector", 15, { view: "collector" });
    assert.equal(page.items[0].timeOnRoute, null); assert.equal(page.items[0].truckName, "Historical vehicle unavailable");
  });
});

test("old records use their linked truck when snapshots are empty", async () => {
  await withQuery(async (sql) => sql.includes("COUNT(*) AS total FROM route_runs") ? [[{ total: 1 }]] : [[run({ truck_name: "Truck 1", truck_plate: "ABC-123" })]], async () => {
    const page = await getHistoryForUser("collector", 15, { view: "collector" });
    assert.equal(page.items[0].truckName, "Truck 1");
    assert.equal(page.items[0].truckPlate, "ABC-123");
  });
});
test("a foreign or missing route returns 404 without disclosing its history", async () => {
  await withQuery(async (sql, params) => { assert.equal(params[0], "other-collector"); assert.match(sql, /d.user_id = \?/); return [[]]; }, async () => {
    await assert.rejects(getHistoryForUser("other-collector", 1, { view: "collector", run_id: "private-run" }), (error) => error.statusCode === 404);
  });
});
test("invalid limits, filters and cursors are rejected before querying SQL", async () => {
  for (const limit of [2.5, 0, -1, "bad", Infinity]) await assert.rejects(getHistoryForUser("collector", limit), (error) => error.statusCode === 400);
  for (const filters of [{ status: "bad" }, { status: "constructor" }, { waste_type: "bad" }, { cursor: "bad" }, { run_id: ["a", "b"] }]) await assert.rejects(getHistoryForUser("collector", 15, { view: "collector", ...filters }), (error) => error.statusCode === 400);
});
test("default consumers keep the original array response and checkpoint detail fields", async () => {
  await withQuery(async (sql) => sql.includes("FROM route_run_stops rrs") ? [[{ id: "stop", route_run_id: "run-A", stop_order: 1, status: "DONE", stop_name: "Saved" }]] : [[run()]], async () => {
    const history = await getHistoryForUser("collector", 3);
    assert.ok(Array.isArray(history)); assert.equal(history[0].stops[0].residentsNotified, 0); assert.deepEqual(history[0].adminMessages, []);
  });
});

test("scheduled runs save their vehicle identity in the same transaction", async () => {
  const routes = require("./routeRuns.service"); const original = pool.getConnection;
  let insertion; let committed = false;
  pool.getConnection = async () => ({ beginTransaction: async () => {}, commit: async () => { committed = true; }, rollback: async () => {}, release: () => {}, query: async (sql, params) => {
    if (sql.includes("SELECT id FROM route_runs")) return [[]];
    if (sql.includes("INSERT INTO route_runs")) insertion = { sql, params };
    if (sql.includes("FROM route_stops rs")) return [[]];
    return [{ affectedRows: 1 }];
  } });
  try { await withQuery(async () => [[{ id: "template", truck_id: "truck", driver_id: "driver", name: "North", waste_type: "Biodegradable", start_time: "06:00" }]], async () => {
    const created = await routes.autoActivateScheduledRoutes();
    assert.equal(created.length, 1); assert.equal(committed, true); assert.match(insertion.sql, /truck_name_snapshot, truck_plate_snapshot/);
    assert.match(insertion.sql, /name, plate_number FROM trucks/); assert.equal(insertion.params.at(-1), "truck");
  }); } finally { pool.getConnection = original; }
});
test("starting a run captures the vehicle identity in the locked transaction", async () => {
  const { startRoute } = require("./routeLifecycle.service"); const original = pool.getConnection;
  let snapshot; let committed = false;
  pool.getConnection = async () => ({ beginTransaction: async () => {}, commit: async () => { committed = true; }, rollback: async () => {}, release: () => {}, query: async (sql, params) => {
    if (sql === "SELECT truck_id FROM route_runs WHERE id = ?") return [[{ truck_id: "truck" }]];
    if (sql.includes("SELECT rr.*, d.user_id")) return [[{ id: "run", truck_id: "truck", user_id: "collector", assigned_truck_id: "truck", truck_name: "Truck at start", driver_status: "ACTIVE", availability_status: "ACTIVE", is_today: 1, is_due: 1, status: "SCHEDULED" }]];
    if (sql.includes("SELECT id FROM route_runs WHERE truck_id")) return [[]];
    if (sql.includes("truck_name_snapshot = ?")) snapshot = { sql, params };
    if (sql.includes("FROM route_run_stops rs")) return [[]];
    return [{ affectedRows: 1 }];
  } });
  try { await withQuery(async () => [[]], async () => {
    await startRoute("run", "collector"); assert.equal(committed, true); assert.ok(snapshot);
    assert.deepEqual(snapshot.params, ["Truck at start", "truck", "run"]); assert.match(snapshot.sql, /truck_plate_snapshot/);
  }); } finally { pool.getConnection = original; }
});
