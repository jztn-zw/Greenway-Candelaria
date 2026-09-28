const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { summarizeTodayOperations, getAdminDashboard } = require("./dashboard.service");
after(() => require("../../config/db").pool.end());

const trucks = [{ id: "t1", name: "Truck 1" }, { id: "t2", name: "Truck 2" }];
const stop = (run, truck, status, id) => ({
  run_id: run, truck_id: truck, run_status: "ACTIVE", route_name: run,
  stop_id: id, barangay_id: "b1", barangay_name: "Barangay 1", stop_status: status,
});

test("multiple runs produce one truck and one barangay, without declaring partial coverage done", () => {
  const result = summarizeTodayOperations(trucks, [
    stop("r1", "t1", "DONE", "s1"),
    stop("r2", "t1", "NOT_STARTED", "s2"),
    stop("r3", "t2", "MISSED", "s3"),
  ]);
  assert.equal(result.trucks.length, 2);
  assert.equal(result.trucks[0].total_stops, 2);
  assert.equal(result.trucks[0].completed_stops, 1);
  assert.equal(result.barangays.length, 1);
  assert.equal(result.barangays[0].status, "MISSED");
  assert.equal(result.barangays[0].truck_name, "Truck 1, Truck 2");
});

test("all stops must be done and cancelled runs do not count toward coverage", () => {
  const result = summarizeTodayOperations(trucks, [
    stop("r1", "t1", "DONE", "s1"),
    { ...stop("r2", "t1", "MISSED", "s2"), run_status: "CANCELLED" },
  ]);
  assert.equal(result.trucks[0].total_stops, 1);
  assert.equal(result.barangays[0].status, "DONE");
  assert.equal(result.trucks[1].run_status, null);
});

test("paused and scheduled runs take priority over completed routes", () => {
  const result = summarizeTodayOperations(trucks, [
    { ...stop("r1", "t1", "DONE", "s1"), run_status: "COMPLETED" },
    { ...stop("r2", "t1", "NOT_STARTED", "s2"), run_status: "PAUSED" },
  ]);
  assert.equal(result.trucks[0].run_status, "PAUSED");
  assert.equal(result.barangays[0].status, "IN_PROGRESS");
});

test("dashboard reads dated runs and converts monthly timestamps using the application timezone", async () => {
  const { pool } = require("../../config/db");
  const originalQuery = pool.query;
  const statements = [];
  pool.query = async (sql, params) => {
    statements.push({ sql, params });
    if (sql.includes("AS users_total")) return [[{}]];
    if (sql.includes("AS awaiting_triage")) return [[{}]];
    if (sql.includes("LIMIT 100")) return [[{
      id: "report-1", reference_number: "WR-1", violation_type: "ILLEGAL_DUMPING",
      barangay_name: "Barangay 1", created_at: "2026-09-26 01:00:00",
    }]];
    return [[]];
  };
  try {
    const result = await getAdminDashboard();
    const runQuery = statements.find(({ sql }) => sql.includes("FROM route_runs rr"));
    assert.match(runQuery.sql, /WHERE rr.run_date = \?/);
    assert.equal(runQuery.params[0], result.overview.as_of_date);
    assert.equal(statements.some(({ sql }) => sql.includes("FROM routes r")), false);
    const monthly = statements.filter(({ sql }) => sql.includes("AS month"));
    assert.equal(monthly.length, 2);
    monthly.forEach(({ sql, params }) => {
      assert.match(sql, /CONVERT_TZ\(created_at, '\+00:00', \?\)/);
      assert.equal(params[0], process.env.APP_TIME_ZONE || "Asia/Manila");
    });
    assert.equal(result.reportsAnalytics.resolution_rate, "0.00%");
    assert.equal(result.attention.items.length, 1);
    assert.equal(result.attention.items[0].kind, "report");
    assert.equal(result.attention.items[0].target_id, "report-1");
    assert.match(result.attention.items[0].title, /WR-1/);
    const queueQuery = statements.find(({ sql }) => sql.includes("LIMIT 100"));
    assert.match(queueQuery.sql, /r.status = 'SUBMITTED'/);
    assert.match(queueQuery.sql, /ORDER BY r.created_at ASC, r.id ASC/);
  } finally {
    pool.query = originalQuery;
  }
});
