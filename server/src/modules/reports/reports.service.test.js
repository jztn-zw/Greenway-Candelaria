const { after, test, mock } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");
const notifications = [];
mock.method(require("../notifications/notifications.service"), "sendToUser", async payload => { notifications.push(payload); });
const service = require("./reports.service");

after(() => { mock.restoreAll(); return pool.end(); });

test("resident history pages search location/type fields while retaining owner and status scope", async () => {
  const originalQuery = pool.query;
  const statements = [];
  pool.query = async (sql, params) => {
    statements.push({ sql, params });
    if (sql.startsWith("SELECT COUNT")) return [[{ total: 31 }]];
    if (sql.includes("FROM reports r")) return [[{ id: "older-fixture-report" }]];
    return [[]];
  };
  try {
    const result = await service.getMyReports("fixture-resident", { page: 2, limit: 15, status: "RESOLVED", search: "Argao" });
    assert.equal(result.page, 2); assert.equal(result.totalPages, 3); assert.equal(result.total, 31);
    assert.equal(result.reports[0].id, "older-fixture-report");
    for (const statement of statements.filter(({ sql }) => sql.includes("FROM reports r"))) {
      assert.match(statement.sql, /r.user_id = \?/); assert.match(statement.sql, /r.deleted_at IS NULL/);
      assert.match(statement.sql, /r.violation_type LIKE/); assert.match(statement.sql, /r.landmark LIKE/);
      assert.match(statement.sql, /search_barangay.name LIKE/);
      assert.deepEqual(statement.params.slice(0, 2), ["fixture-resident", "RESOLVED"]);
      assert.deepEqual(statement.params.slice(2, 7), Array(5).fill("%Argao%"));
    }
    assert.deepEqual(statements.find(({ sql }) => sql.includes("LIMIT ? OFFSET ?")).params.slice(-2), [15, 15]);
  } finally { pool.query = originalQuery; }
});

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
    await service.flagReport("report-1", "admin-1", { is_false: true, false_reason: "Insufficient evidence", resolve: false });
    assert.equal(state.committed, true);
    assert.equal(state.rolledBack, false);
    assert.equal(state.released, true);
    assert.equal(statements.filter(({ sql }) => sql.includes("INSERT INTO report_status_history")).length, 2);
    const write = statements.find(({ sql }) => sql.startsWith("UPDATE reports SET is_false"));
    assert.ok(write.params.includes("RESOLVED"));
    assert.ok(write.params.some(value => typeof value === "string" && value.includes("closed as invalid") && value.includes("Insufficient evidence")));
    assert.equal(statements.some(({ sql, params }) => sql.includes("UPDATE reports SET status = 'RESOLVED'") && params[1] === linked.id), true);
  });
});

test("repeated invalid closure cannot rewrite a terminal review outcome", async () => {
  await withDatabase(async sql => {
    if (sql.includes("SELECT * FROM reports WHERE id")) return [[{ ...current, status: "RESOLVED", is_false: true, false_reason: "Insufficient evidence" }]];
    return [{ affectedRows: 1 }];
  }, async (statements, state) => {
    await assert.rejects(service.flagReport("report-1", "admin-1", { is_false: true, false_reason: "Other" }), error => error.statusCode === 409);
    await assert.rejects(service.flagReport("report-1", "admin-1", { is_duplicate: false }), error => error.statusCode === 409);
    assert.equal(statements.some(({ sql }) => sql.startsWith("UPDATE") || sql.startsWith("INSERT")), false);
    assert.equal(state.rolledBack, true);
  });
});

test("invalid closure notifies the report owner once and a repeated closure sends no second notification", async () => {
  const before = notifications.length;
  current.user_id = "resident-1";
  let closed = false;
  try {
    await withDatabase(async sql => {
      if (sql.includes("SELECT * FROM reports WHERE id")) return [[{ ...current, status: closed ? "RESOLVED" : "SUBMITTED", is_false: closed }]];
      if (sql.includes("FROM reports\n     WHERE duplicate_of_id")) return [[]];
      return [{ affectedRows: 1 }];
    }, async () => {
      await service.flagReport("report-1", "admin-1", { is_false: true, false_reason: "Insufficient evidence" });
      assert.equal(notifications.length, before + 1);
      assert.equal(notifications.at(-1).user_id, "resident-1");
      assert.match(notifications.at(-1).title, /Closed — Invalid Report/);
      closed = true;
      await assert.rejects(service.flagReport("report-1", "admin-1", { is_false: true, false_reason: "Other" }), error => error.statusCode === 409);
      assert.equal(notifications.length, before + 1);
    });
  } finally { current.user_id = null; }
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

test("duplicate closure needs only its reference, preserves the original, and notifies once", async () => {
  for (const originalStatus of ["UNDER_REVIEW", "RESOLVED"]) {
    const original = { ...current, id: "original-1", reference_number: "RPT-ORIGINAL", status: originalStatus };
    const before = notifications.length;
    let closed = false;
    await withDatabase(async (sql, params) => {
      if (sql.includes("WHERE UPPER(reference_number)")) return [[{ id: original.id }]];
      if (sql.includes("SELECT * FROM reports WHERE id")) return [[params[0] === original.id ? original : { ...current, status: closed ? "RESOLVED" : "SUBMITTED", is_duplicate: closed }]];
      if (sql.includes("FROM reports\n     WHERE duplicate_of_id")) return [[]];
      return [{ affectedRows: 1 }];
    }, async (statements, state) => {
      pool.query = async sql => sql.includes("FROM reports r") ? [[{ ...current, status: "RESOLVED", is_duplicate: true, user_id: "duplicate-owner", admin_response: "Closed as a duplicate of RPT-ORIGINAL." }]] : [[]];
      await service.flagReport(current.id, "admin-1", { is_duplicate: true, duplicate_of_reference: "RPT-ORIGINAL", resolve: false });
      assert.equal(state.committed, true);
      const writes = statements.filter(({ sql }) => sql.startsWith("UPDATE reports"));
      assert.equal(writes.length, 1);
      assert.equal(writes[0].params.at(-1), current.id);
      assert.ok(writes[0].params.includes("RESOLVED"));
      assert.ok(writes[0].params.includes("Duplicate of RPT-ORIGINAL."));
      assert.ok(writes[0].params.some(value => typeof value === "string" && value.includes(originalStatus === "RESOLVED" ? "already been resolved" : "being handled through report RPT-ORIGINAL")));
      assert.equal(original.status, originalStatus);
      assert.equal(notifications.length, before + 1);
      assert.equal(notifications.at(-1).user_id, "duplicate-owner");
      assert.match(notifications.at(-1).title, /Closed — Duplicate Report/);
      closed = true;
      await assert.rejects(service.flagReport(current.id, "admin-1", { is_duplicate: true, duplicate_of_reference: "RPT-ORIGINAL" }), error => error.statusCode === 409);
      assert.equal(notifications.length, before + 1);
    });
  }
});

test("duplicate closure refuses a source outside the area or one already flagged", async () => {
  for (const change of [{ barangay_id: "other-area" }, { is_false: true }, { is_duplicate: true }]) {
    const original = { ...current, id: "original-1", reference_number: "RPT-ORIGINAL", ...change };
    await withDatabase(async (sql, params) => {
      if (sql.includes("WHERE UPPER(reference_number)")) return [[{ id: original.id }]];
      if (sql.includes("SELECT * FROM reports WHERE id")) return [[params[0] === original.id ? original : current]];
      return [{ affectedRows: 1 }];
    }, async (statements, state) => {
      await assert.rejects(service.flagReport(current.id, "admin-1", { is_duplicate: true, duplicate_of_reference: "RPT-ORIGINAL" }), error => error.statusCode === 400);
      assert.equal(state.rolledBack, true);
      assert.equal(statements.some(({ sql }) => sql.startsWith("UPDATE") || sql.startsWith("INSERT")), false);
    });
  }
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

test("internal note insert and returned note share one transaction", async () => {
  const savedNote = {
    id: "note-1",
    report_id: current.id,
    note: "Collection was confirmed with the crew.",
    created_by: "admin-1",
    created_by_name: "MENRO",
    created_at: "2026-10-15T10:00:00Z",
  };
  await withDatabase(async sql => {
    if (sql.includes("SELECT reference_number FROM reports")) return [[{ reference_number: current.reference_number }]];
    if (sql.includes("INSERT INTO report_notes")) return [{ affectedRows: 1 }];
    if (sql.includes("FROM report_notes n")) return [[savedNote]];
    throw new Error(`Unexpected query: ${sql}`);
  }, async (statements, state) => {
    const result = await service.addNote(current.id, "admin-1", savedNote.note);
    assert.deepEqual(result, savedNote);
    assert.equal(state.committed, true);
    assert.equal(state.rolledBack, false);
    assert.equal(state.released, true);
    assert.equal(statements.some(({ sql }) => sql.includes("FOR UPDATE")), true);
  });
});

test("internal note is rolled back if the saved note cannot be returned", async () => {
  let inserted = false;
  await withDatabase(async sql => {
    if (sql.includes("SELECT reference_number FROM reports")) return [[{ reference_number: current.reference_number }]];
    if (sql.includes("INSERT INTO report_notes")) { inserted = true; return [{ affectedRows: 1 }]; }
    if (sql.includes("FROM report_notes n")) throw new Error("note response failed");
    throw new Error(`Unexpected query: ${sql}`);
  }, async (_statements, state) => {
    await assert.rejects(service.addNote(current.id, "admin-1", "Collection was confirmed."), /note response failed/);
    assert.equal(inserted, true);
    assert.equal(state.committed, false);
    assert.equal(state.rolledBack, true);
    assert.equal(state.released, true);
  });
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
