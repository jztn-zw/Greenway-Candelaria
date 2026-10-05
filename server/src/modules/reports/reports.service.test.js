const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");
const service = require("./reports.service");

after(() => pool.end());

const current = { id: "report-1", reference_number: "RPT-1", barangay_id: "barangay-1", status: "SUBMITTED", is_false: false, is_duplicate: false, user_id: null };
const linked = { id: "report-2", reference_number: "RPT-2", status: "SUBMITTED", user_id: null };

const withDatabase = async (connectionQuery, run) => {
  const originalConnection = pool.getConnection;
  const originalQuery = pool.query;
  const originalLog = auditService.log;
  const statements = [];
  const state = { committed: false, rolledBack: false, released: false };
  auditService.log = async () => {};
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { state.committed = true; },
    rollback: async () => { state.rolledBack = true; },
    release: () => { state.released = true; },
    query: async (sql, params) => {
      statements.push({ sql, params });
      return connectionQuery(sql, params);
    },
  });
  pool.query = async (sql) => {
    if (sql.includes("FROM reports r")) return [[{ ...current, status: "RESOLVED", is_false: true }]];
    if (sql.includes("FROM report_photos") || sql.includes("FROM report_status_history") || sql.includes("FROM report_notes")) return [[]];
    throw new Error(`Unexpected query: ${sql}`);
  };
  try {
    await run(statements, state);
  } finally {
    pool.getConnection = originalConnection;
    pool.query = originalQuery;
    auditService.log = originalLog;
  }
};

test("flag resolution writes the report, history, and linked duplicates in one transaction", async () => {
  await withDatabase(async (sql) => {
    if (sql.includes("SELECT * FROM reports WHERE id")) return [[current]];
    if (sql.includes("FROM reports\n     WHERE duplicate_of_id")) return [[linked]];
    return [{ affectedRows: 1 }];
  }, async (statements, state) => {
    await service.flagReport("report-1", "admin-1", { is_false: true, false_reason: "Could not verify", resolve: true });
    assert.equal(state.committed, true);
    assert.equal(state.rolledBack, false);
    assert.equal(state.released, true);
    assert.equal(statements.filter(({ sql }) => sql.includes("INSERT INTO report_status_history")).length, 2);
    assert.equal(statements.some(({ sql, params }) => sql.includes("UPDATE reports SET status = 'RESOLVED'") && params[1] === linked.id), true);
  });
});

test("flag resolution rolls back if writing status history fails", async () => {
  await withDatabase(async (sql) => {
    if (sql.includes("SELECT * FROM reports WHERE id")) return [[current]];
    if (sql.includes("INSERT INTO report_status_history")) throw new Error("history failed");
    return [{ affectedRows: 1 }];
  }, async (_statements, state) => {
    await assert.rejects(service.flagReport("report-1", "admin-1", { is_false: true, false_reason: "Could not verify", resolve: true }), /history failed/);
    assert.equal(state.committed, false);
    assert.equal(state.rolledBack, true);
    assert.equal(state.released, true);
  });
});

test("admin listing uses a stable tie breaker and clamps a stale page", async () => {
  const originalQuery = pool.query;
  const statements = [];
  pool.query = async (sql, params) => {
    statements.push({ sql, params });
    if (sql.includes("COUNT(*) AS total") && sql.includes("JOIN barangays")) return [[{ total: 11 }]];
    if (sql.includes("SUM(CASE WHEN status")) return [[{ total: 11 }]];
    if (sql.includes("FROM report_photos")) return [[]];
    if (sql.includes("LIMIT ? OFFSET ?")) return [[{ id: "report-11" }]];
    throw new Error(`Unexpected query: ${sql}`);
  };
  try {
    const result = await service.getAll({ page: 3, limit: 10 });
    assert.equal(result.page, 2);
    assert.deepEqual(statements.find(({ sql }) => sql.includes("LIMIT ? OFFSET ?")).params.slice(-2), [10, 10]);
    assert.match(statements.find(({ sql }) => sql.includes("LIMIT ? OFFSET ?")).sql, /ORDER BY r\.created_at DESC, r\.id DESC/);
  } finally {
    pool.query = originalQuery;
  }
});

test("a new report is fully read before commit so a read failure cannot falsely fail a saved submission", async () => {
  const originalQuery = pool.query;
  await withDatabase(async (sql) => {
    if (sql.includes("SELECT counter")) return [[{ counter: 1 }]];
    if (sql.includes("FROM reports r")) throw new Error("report read failed");
    return [{ affectedRows: 1 }];
  }, async (_statements, state) => {
    pool.query = async (sql) => {
      if (sql.includes("FROM barangays")) return [[{ id: "barangay-1" }]];
      throw new Error("report read failed");
    };
    await assert.rejects(service.create("resident", { barangay_id: "barangay-1", violation_type: "ILLEGAL_DUMPING", description: "Fixture" }), /report read failed/);
    assert.equal(state.committed, false); assert.equal(state.rolledBack, true); assert.equal(state.released, true);
  });
  pool.query = originalQuery;
});

test("resident cancellation locks the status before deleting and commits atomically", async () => {
  await withDatabase(async (sql) => {
    if (sql.includes("SELECT * FROM reports")) {
      assert.match(sql, /FOR UPDATE/);
      return [[{ ...current, user_id: "resident" }]];
    }
    return [{ affectedRows: 1 }];
  }, async (statements, state) => {
    pool.query = async (sql) => {
      if (sql.includes("SELECT * FROM reports")) { assert.match(sql, /FOR UPDATE/); return [[{ ...current, user_id: "resident" }]]; }
      return [{ affectedRows: 1 }];
    };
    const result = await service.softDelete("report-1", { id: "resident", role: "RESIDENT" });
    assert.equal(result.id, "report-1"); assert.equal(state.committed, true); assert.equal(state.released, true);
    assert.equal(statements.some(({ sql }) => sql.includes("UPDATE reports SET deleted_at")), true);
  });
});
test("resident cancellation refuses a report already dispatched by admin", async () => {
  await withDatabase(async (sql) => sql.includes("SELECT * FROM reports") ? [[{ ...current, user_id: "resident", status: "DISPATCHED" }]] : [{ affectedRows: 1 }], async (statements, state) => {
    pool.query = async () => [[{ ...current, user_id: "resident", status: "DISPATCHED" }]];
    await assert.rejects(service.softDelete("report-1", { id: "resident", role: "RESIDENT" }), (error) => error.statusCode === 400);
    assert.equal(state.committed, false); assert.equal(state.rolledBack, true);
    assert.equal(statements.some(({ sql }) => sql.includes("UPDATE reports")), false);
  });
});
