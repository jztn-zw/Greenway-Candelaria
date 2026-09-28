const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./trucks.service");
const auditService = require("../audit/audit.service");

after(() => pool.end());

test("a truck with route-run history cannot be deleted", async () => {
  const originalQuery = pool.query;
  const originalConnection = pool.getConnection;
  const statements = [];
  let rolledBack = false;
  pool.query = async () => [[{ id: "truck-1", name: "Truck 1", plate_number: "ABC-123" }]];
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { throw new Error("Must not commit"); },
    rollback: async () => { rolledBack = true; },
    release: () => {},
    query: async (sql) => {
      statements.push(sql);
      if (sql.includes("FROM trucks WHERE id")) return [[{ id: "truck-1" }]];
      if (sql.includes("AS route_runs")) return [[{ routes: 0, route_runs: 1, tracking_logs: 0 }]];
      throw new Error(`Unexpected query: ${sql}`);
    },
  });
  try {
    await assert.rejects(service.remove("truck-1"), { statusCode: 409 });
    assert.equal(rolledBack, true);
    assert.equal(statements.some((sql) => sql.includes("DELETE FROM trucks")), false);
    assert.equal(statements.some((sql) => sql.includes("DELETE FROM tracking_logs")), false);
  } finally {
    pool.query = originalQuery;
    pool.getConnection = originalConnection;
  }
});

test("truck creation rolls back when its audit entry cannot be saved", async () => {
  const originalQuery = pool.query;
  const originalConnection = pool.getConnection;
  const originalAudit = auditService.logInTransaction;
  let committed = false;
  let rolledBack = false;
  pool.query = async () => [[]];
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { committed = true; },
    rollback: async () => { rolledBack = true; },
    release: () => {},
    query: async () => [{ affectedRows: 1 }],
  });
  auditService.logInTransaction = async (_connection, entry) => {
    assert.equal(entry.user_id, "actual-admin-id");
    assert.equal(entry.module, "trucks");
    throw new Error("audit insert failed");
  };
  try {
    await assert.rejects(service.create({ name: "Truck", plate_number: "XYZ-123", truck_model: "Model" }, "actual-admin-id"), /audit insert failed/);
    assert.equal(committed, false);
    assert.equal(rolledBack, true);
  } finally {
    pool.query = originalQuery;
    pool.getConnection = originalConnection;
    auditService.logInTransaction = originalAudit;
  }
});
