const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./barangays.service");

after(() => pool.end());

test("a zero-length coverage path is rejected before writing", async () => {
  await assert.rejects(
    service.updateStreetCoverage("barangay-1", "street-1", [[13.9, 121.4], [13.9, 121.4]]),
    { statusCode: 400 },
  );
});

const withFakeConnection = async (query, action) => {
  const original = pool.getConnection;
  const statements = [];
  const transaction = { committed: false, rolledBack: false, released: false };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => { transaction.committed = true; },
    rollback: async () => { transaction.rolledBack = true; },
    release: () => { transaction.released = true; },
    query: async (sql, params) => {
      statements.push({ sql, params });
      return query(sql, params);
    },
  });
  try {
    await action(statements, transaction);
  } finally {
    pool.getConnection = original;
  }
};

test("coverage edits refresh scheduled runs but leave started run history untouched", async () => {
  await withFakeConnection(async (sql) => {
    if (sql.includes("FROM barangays WHERE")) return [[{ id: "barangay-1" }]];
    if (sql.includes("FROM barangay_streets WHERE")) return [[{ id: "street-1" }]];
    return [{ affectedRows: 1 }];
  }, async (statements, transaction) => {
    const path = [[13.9, 121.4], [13.91, 121.41]];
    await service.updateStreetCoverage("barangay-1", "street-1", path);
    const snapshotWrite = statements.find(({ sql }) => sql.includes("SET rrs.coverage_path"));
    assert.ok(snapshotWrite);
    assert.match(snapshotWrite.sql, /rr\.status = 'SCHEDULED'/);
    assert.deepEqual(JSON.parse(snapshotWrite.params[0]), path);
    assert.equal(transaction.committed, true);
    assert.equal(transaction.released, true);
  });
});

test("an active route prevents clearing its street path", async () => {
  await withFakeConnection(async (sql) => {
    if (sql.includes("FROM barangays WHERE")) return [[{ id: "barangay-1" }]];
    if (sql.includes("FROM barangay_streets WHERE")) return [[{ id: "street-1" }]];
    if (sql.includes("FROM route_stops rs")) return [[{ id: "stop-1" }]];
    if (sql.includes("FROM route_run_stops rrs")) return [[]];
    throw new Error(`Unexpected query: ${sql}`);
  }, async (statements, transaction) => {
    await assert.rejects(service.updateStreetCoverage("barangay-1", "street-1", null), { statusCode: 409 });
    assert.equal(statements.some(({ sql }) => sql.includes("UPDATE barangay_streets")), false);
    assert.equal(transaction.rolledBack, true);
  });
});

test("a recorded driver stop prevents street deletion", async () => {
  await withFakeConnection(async (sql) => {
    if (sql.includes("FROM barangays WHERE")) return [[{ collection_service_available: 1 }]];
    if (sql.includes("FROM barangay_streets WHERE")) return [[{ id: "street-1" }]];
    if (sql.includes("AS route_run_stops")) return [[{ residents: 0, route_stops: 0, route_run_stops: 1 }]];
    throw new Error(`Unexpected query: ${sql}`);
  }, async (statements, transaction) => {
    await assert.rejects(service.deleteStreet("barangay-1", "street-1"), { statusCode: 409 });
    assert.equal(statements.some(({ sql }) => sql.includes("DELETE FROM barangay_streets")), false);
    assert.equal(transaction.rolledBack, true);
  });
});

test("service cannot be disabled while a scheduled run still serves the barangay", async () => {
  await withFakeConnection(async (sql) => {
    if (sql.includes("FROM barangays WHERE")) return [[{ id: "barangay-1", status: "ACTIVE" }]];
    if (sql.includes("AS route_count")) return [[{ route_count: 0 }]];
    if (sql.includes("AS run_count")) return [[{ run_count: 1 }]];
    throw new Error(`Unexpected query: ${sql}`);
  }, async (statements, transaction) => {
    await assert.rejects(service.updateCollectionService("barangay-1", false), { statusCode: 409 });
    assert.equal(statements.some(({ sql }) => sql.includes("UPDATE barangays SET")), false);
    assert.equal(transaction.rolledBack, true);
  });
});

test("street renames update pending run labels without changing completed runs", async () => {
  await withFakeConnection(async (sql) => {
    if (sql.includes("FROM barangays WHERE")) return [[{ id: "barangay-1" }]];
    if (sql.includes("SELECT id FROM barangay_streets WHERE id")) return [[{ id: "street-1" }]];
    if (sql.includes("LOWER(TRIM(name))")) return [[]];
    return [{ affectedRows: 1 }];
  }, async (statements, transaction) => {
    await service.updateStreet("barangay-1", "street-1", { name: "New Street", area: "Zone A" });
    const snapshotWrite = statements.find(({ sql }) => sql.includes("SET rrs.stop_name"));
    assert.ok(snapshotWrite);
    assert.match(snapshotWrite.sql, /rr\.status = 'SCHEDULED'/);
    assert.equal(snapshotWrite.params[0], "New Street (Zone A)");
    assert.equal(transaction.committed, true);
  });
});
