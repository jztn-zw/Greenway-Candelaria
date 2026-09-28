const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const routeRuns = require("./routeRuns.service");
const drivers = require("../drivers/drivers.service");
const driverController = require("../drivers/drivers.controller");

after(() => pool.end());

test("dashboard finished-run reads remain scoped to the driver and tracking defaults stay open-only", async () => {
  const original = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return [[{ run_id: "run-1", run_status: "COMPLETED", truck_id: "truck-1", ended_at: "2026-09-27 02:00:00", total_paused_seconds: 600 }]];
  };
  try {
    await routeRuns.getMyRouteToday("driver-user");
    const dashboard = await routeRuns.getMyRouteToday("driver-user", { includeFinished: true });
    assert.match(calls[0].sql, /rr.status IN \('ACTIVE','PAUSED','SCHEDULED'\)/);
    assert.match(calls[1].sql, /rr.status IN \('ACTIVE','PAUSED','SCHEDULED','PARTIAL','COMPLETED','CANCELLED'\)/);
    for (const call of calls) {
      assert.match(call.sql, /rr.run_date = \? AND d.user_id = \?/);
      assert.equal(call.params[1], "driver-user");
    }
    assert.equal(dashboard.ended_at, "2026-09-27 02:00:00");
    assert.equal(dashboard.total_paused_seconds, 600);
  } finally { pool.query = original; }
});

test("dashboard profile includes maintenance facts without contact or account metadata", async () => {
  const original = drivers.getByUserId;
  drivers.getByUserId = async (id) => {
    assert.equal(id, "signed-in-driver");
    return { full_name: "Collector", truck_id: "t1", truck_name: "Truck 1", truck_plate: "ABC-123",
      truck_status: "IDLE", truck_availability: "UNDER_MAINTENANCE", truck_model: "Model A",
      email: "private@example.invalid", phone: "123", last_login: "private", user_id: "private" };
  };
  let payload;
  const res = { status() { return this; }, json(body) { payload = body; return this; } };
  try {
    await driverController.getMe({ user: { id: "signed-in-driver" }, query: { view: "dashboard" } }, res, (error) => { throw error; });
    assert.equal(payload.data.truck_availability, "UNDER_MAINTENANCE");
    assert.equal(payload.data.truck_model, "Model A");
    for (const key of ["email", "phone", "last_login", "user_id"]) assert.equal(key in payload.data, false);
    await driverController.getMe({ user: { id: "signed-in-driver" }, query: {} }, res, (error) => { throw error; });
    assert.equal(payload.data.email, "private@example.invalid");
  } finally { drivers.getByUserId = original; }
});
