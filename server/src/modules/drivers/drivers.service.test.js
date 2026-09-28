const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");
const service = require("./drivers.service");
const { resetDriverPasswordSchema } = require("./drivers.schema");

after(() => pool.end());

const withConnection = async (query, run) => {
  const original = pool.getConnection;
  const statements = [];
  const state = { committed: false, rolledBack: false, released: false };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { state.committed = true; },
    rollback: async () => { state.rolledBack = true; },
    release: () => { state.released = true; },
    query: async (sql, params) => {
      statements.push({ sql, params });
      return query(sql, params);
    },
  });
  try {
    await run(statements, state);
  } finally {
    pool.getConnection = original;
  }
};

test("password reset stores a hash and revokes existing sessions atomically", async () => {
  const originalLog = auditService.log;
  let audit;
  auditService.log = async (entry) => { audit = entry; };
  try {
    await withConnection(async (sql) => {
      if (sql.includes("SELECT d.user_id")) return [[{ user_id: "user-1" }]];
      return [{ affectedRows: 1 }];
    }, async (statements, state) => {
      const password = "AdminChosenPassword123!";
      const result = await service.resetPassword("driver-1", "admin-1", password);
      assert.deepEqual(result, { reset: true });
      const passwordWrite = statements.find(({ sql }) => sql.startsWith("UPDATE users SET password"));
      assert.equal(await bcrypt.compare(password, passwordWrite.params[0]), true);
      assert.deepEqual(statements.find(({ sql }) => sql.startsWith("DELETE FROM sessions")).params, ["user-1"]);
      assert.equal(state.committed, true);
      assert.equal(state.released, true);
      assert.equal(audit.action, "RESET_DRIVER_PASSWORD");
      assert.equal(JSON.stringify(audit).includes(password), false);
    });
  } finally {
    auditService.log = originalLog;
  }
});

test("reset requires a supplied password with safe bcrypt length", () => {
  assert.equal(resetDriverPasswordSchema.safeParse({ password: "AdminChosenPassword123!" }).success, true);
  assert.equal(resetDriverPasswordSchema.safeParse({}).success, false);
  assert.equal(resetDriverPasswordSchema.safeParse({ password: "short" }).success, false);
  assert.equal(resetDriverPasswordSchema.safeParse({ password: "        " }).success, false);
  assert.equal(resetDriverPasswordSchema.safeParse({ password: "é".repeat(40) }).success, false);
});

test("failed collector creation rolls back its new user", async () => {
  await withConnection(async (sql) => {
    if (sql.startsWith("SELECT id FROM users")) return [[]];
    if (sql.startsWith("INSERT INTO drivers")) throw new Error("driver insert failed");
    return [{ affectedRows: 1 }];
  }, async (statements, state) => {
    await assert.rejects(service.create({
      full_name: "Test Collector", username: "collector", email: "collector@example.com",
      password: "test-password", phone: "", truck_id: null,
    }), /driver insert failed/);
    assert.equal(statements.some(({ sql }) => sql.startsWith("INSERT INTO users")), true);
    assert.equal(state.rolledBack, true);
    assert.equal(state.committed, false);
    assert.equal(state.released, true);
  });
});

test("activity shows separate dated runs and completed stop totals", async () => {
  const original = pool.query;
  const statements = [];
  pool.query = async (sql, params) => {
    statements.push({ sql, params });
    if (sql.includes("FROM drivers d")) return [[{ id: "driver-1" }]];
    if (sql.includes("FROM route_runs rr")) return [[
      { route_id: "run-1", run_date: "2026-09-24", route_name: "North", status: "COMPLETED", scheduled_start_time: "06:00", collection_started_at: null, ended_at: null, total_stops: 3, completed_stops: 3 },
      { route_id: "run-2", run_date: "2026-09-23", route_name: "North", status: "PARTIAL", scheduled_start_time: "06:00", collection_started_at: null, ended_at: null, total_stops: 3, completed_stops: 1 },
    ]];
    throw new Error(`Unexpected query: ${sql}`);
  };
  try {
    const activity = await service.getActivityLog("driver-1");
    assert.deepEqual(activity.map(({ route_id, status, completed_stops, total_stops }) =>
      [route_id, status, completed_stops, total_stops]), [
      ["run-1", "COMPLETED", 3, 3], ["run-2", "PARTIAL", 1, 3],
    ]);
    assert.match(statements[1].sql, /FROM route_run_stops/);
    assert.deepEqual(statements[1].params, ["driver-1", 30]);
  } finally {
    pool.query = original;
  }
});

test("truck assignment is audited once with the real admin and both trucks", async () => {
  const originalQuery = pool.query;
  const originalAudit = auditService.logInTransaction;
  const entries = [];
  pool.query = async () => [[{ id: "driver-1", user_id: "user-1", full_name: "Collector", truck_id: "truck-new", truck_name: "New Truck" }]];
  auditService.logInTransaction = async (_connection, entry) => { entries.push(entry); };
  try {
    await withConnection(async (sql) => {
      if (sql.includes("SELECT id FROM trucks")) return [[{ id: "truck-new" }]];
      if (sql.includes("SELECT id FROM drivers WHERE truck_id")) return [[]];
      if (sql.includes("SELECT d.user_id, d.truck_id")) {
        return [[{ user_id: "user-1", truck_id: "truck-old", full_name: "Collector", truck_name: "Old Truck" }]];
      }
      if (sql.includes("SELECT name FROM trucks")) return [[{ name: "New Truck" }]];
      return [{ affectedRows: 1 }];
    }, async (_statements, state) => {
      await service.assignTruck("driver-1", "truck-new", "real-admin-id", "192.0.2.1");
      assert.equal(state.committed, true);
      assert.equal(entries.length, 1);
      assert.equal(entries[0].user_id, "real-admin-id");
      assert.equal(entries[0].module, "trucks");
      assert.equal(entries[0].old_value.truck, "Old Truck");
      assert.equal(entries[0].new_value.truck, "New Truck");
    });
  } finally {
    pool.query = originalQuery;
    auditService.logInTransaction = originalAudit;
  }
});
