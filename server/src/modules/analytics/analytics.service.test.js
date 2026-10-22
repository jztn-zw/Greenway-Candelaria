const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const { getAnalyticsDashboard } = require("./analytics.service");
after(() => pool.end());

const runs = [
  { run_id: "run-1", run_date: "2026-10-21", route_name: "Saved collection route", status: "COMPLETED", driver_name: "Collector", truck_name: "Original truck", truck_plate: "SAVED-01" },
  { run_id: "run-2", run_date: "2026-10-20", route_name: null, status: "PARTIAL", driver_name: "Collector", truck_name: "Original truck", truck_plate: "SAVED-01" },
];
const withDashboard = async (filters, runRows, action) => {
  const original = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("rr.id AS run_id")) return [runRows];
    if (sql.includes("FROM tracking_logs tl JOIN route_runs rr")) return [[
      { id: "gps-1", route_run_id: "run-1", latitude: 0, longitude: 0, captured_at: "2026-10-21 23:59:55" },
      { id: "gps-2", route_run_id: "run-1", latitude: 0.001, longitude: 0, captured_at: "2026-10-22 00:00:00" },
    ]];
    if (sql.includes("AS scheduled_stops") && !sql.includes("AS all_completed_stops")) return [[{}]];
    if (sql.includes("AS open_reports")) return [[{}]];
    if (sql.includes("AS new_this_period")) return [[{}]];
    if (sql.includes("COUNT(DISTINCT r.user_id) AS count") || sql.includes("FROM announcement_read_receipts")) return [[{}]];
    return [[]];
  };
  try { await action(await getAnalyticsDashboard(filters), calls); }
  finally { pool.query = original; }
};

test("analytics returns full-run GPS distance with saved truck identity and unavailable histories", async () => {
  await withDashboard({ from: "2026-10-01", to: "2026-10-21", barangayId: "barangay-A" }, runs, async (data, calls) => {
    const [measured, missing] = data.collectionRunDistances;
    assert.equal(measured.route, "Saved collection route");
    assert.equal(measured.truck, "Original truck");
    assert.equal(measured.plate, "SAVED-01");
    assert.ok(Math.abs(measured.distanceKm - 0.111195) < 0.000001);
    assert.equal(missing.distanceKm, null);
    assert.equal(missing.route, "Collection route");
    const selection = calls.find(call => call.sql.includes("rr.id AS run_id"));
    assert.deepEqual(selection.params, ["2026-10-01", "2026-10-21", "barangay-A"]);
    assert.match(selection.sql, /rr.status IN \('COMPLETED', 'PARTIAL'\)/);
    assert.match(selection.sql, /rr.collection_started_at IS NOT NULL AND rr.ended_at IS NOT NULL/);
    assert.match(selection.sql, /EXISTS .*selected_stop.route_run_id = rr.id AND selected_stop.barangay_id = \?/);
    assert.match(selection.sql, /COALESCE\(rr.truck_name_snapshot, t.name/);
    assert.doesNotMatch(selection.sql, /JOIN routes /);
    const gps = calls.filter(call => call.sql.includes("FROM tracking_logs tl JOIN route_runs rr"));
    assert.equal(gps.length, 1);
    assert.deepEqual(gps[0].params, [["run-1", "run-2"]]);
    assert.doesNotMatch(gps[0].sql, /run_date|barangay_id/);
    assert.ok(calls.every(call => /^\s*SELECT\b/.test(call.sql)));
  });
});

test("an empty run selection does not read GPS or fabricate a zero-distance run", async () => {
  await withDashboard({ from: "2026-10-01", to: "2026-10-21" }, [], async (data, calls) => {
    assert.deepEqual(data.collectionRunDistances, []);
    assert.equal(calls.some(call => call.sql.includes("FROM tracking_logs tl JOIN route_runs rr")), false);
    const selection = calls.find(call => call.sql.includes("rr.id AS run_id"));
    assert.deepEqual(selection.params, ["2026-10-01", "2026-10-21"]);
    assert.doesNotMatch(selection.sql, /selected_stop/);
  });
});
