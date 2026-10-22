const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./barangays.service");

after(() => pool.end());

test('setup street lookup returns only saved public control points, not admin editing metadata', async () => {
  const original = pool.query;
  const points = [[13.93, 121.42], [13.93, 121.43]];
  pool.query = async sql => sql.includes('FROM barangays WHERE') ? [[{ id: 'b', collection_service_available: 1 }]]
    : [[{ id: 's', name: 'Argao', area: 'Ilaya', coverage_path: points, coverage_edit: JSON.stringify({ mode: 'ROAD', points }) },
      { id: 'old', name: 'Legacy', coverage_edit: null }]];
  try {
    const result = await service.getStreets('b', true);
    assert.deepEqual(result.streets[0].location_points, points);
    assert.deepEqual(result.streets[1].location_points, []);
    assert.equal(Object.hasOwn(result.streets[0], 'coverage_edit'), false);
  } finally { pool.query = original; }
});

test("street lookup returns saved streets independently of collection service availability", async () => {
  const original = pool.query;
  const streets = [{ id: "street-1", barangay_id: "barangay-1", name: "Main Street", area: "Zone A" }];
  try {
    for (const available of [0, 1]) {
      pool.query = async (sql, params) => {
        assert.deepEqual(params, ["barangay-1"]);
        if (sql.includes("FROM barangays WHERE")) return [[{ id: "barangay-1", collection_service_available: available }]];
        assert.match(sql, /WHERE bs\.barangay_id = \?/);
        assert.match(sql, /ORDER BY bs\.name ASC, bs\.area ASC/);
        return [streets];
      };
      assert.deepEqual(await service.getStreets("barangay-1"), {
        collection_service_available: Boolean(available), streets,
      });
    }
  } finally { pool.query = original; }
});

test("street lookup preserves an empty list and rejects a missing barangay", async () => {
  const original = pool.query;
  try {
    pool.query = async sql => sql.includes("FROM barangays WHERE")
      ? [[{ id: "barangay-1", collection_service_available: 0 }]] : [[]];
    assert.deepEqual(await service.getStreets("barangay-1"), { collection_service_available: false, streets: [] });
    pool.query = async () => [[]];
    await assert.rejects(service.getStreets("missing"), { statusCode: 404 });
  } finally { pool.query = original; }
});

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

test("coverage keeps two editable pins separately from detailed road geometry", async () => {
  await withFakeConnection(async () => [[{ id: "exists" }]], async (statements) => {
    const points = [[13.9, 121.4], [13.91, 121.41]];
    const path = [points[0], [13.905, 121.405], points[1]];
    const edit = { mode: "ROAD", points };
    const result = await service.updateStreetCoverage("barangay-1", "street-1", path, edit);
    assert.deepEqual(result.coverage_edit, edit);
    const write = statements.find(row => row.sql.includes("UPDATE barangay_streets"));
    assert.match(write.sql, /coverage_edit = \?/);
    assert.deepEqual(JSON.parse(write.params[1]), edit);
    assert.deepEqual(JSON.parse(write.params[0]), path);
  });
});

test("coverage rejects inconsistent manual drawings and invalid editing metadata before writing", async () => {
  await withFakeConnection(async () => { throw new Error("Validation must happen before any database query"); }, async () => {
  const path = [[13.9, 121.4], [13.91, 121.41]];
  for (const edit of [
    { mode: "INVALID", points: path },
    { mode: "ROAD", points: [path[0]] },
    { mode: "ROAD", points: [[13.8, 121.4], path[1]] },
    { mode: "MANUAL", points: [path[0], [13.905, 121.4], path[1]] },
  ]) {
    await assert.rejects(service.updateStreetCoverage("b", "s", path, edit), { statusCode: 400 });
  }
  });
});

test("road coverage and clearing persist editing metadata atomically", async () => {
  await withFakeConnection(async (sql) => sql.includes("FROM route_stops") || sql.includes("FROM route_run_stops") ? [[]] : [[{ id: "exists" }]], async (statements) => {
    const path = [[13.9, 121.4], [13.91, 121.41]];
    const edit = { mode: "ROAD", points: path };
    assert.deepEqual((await service.updateStreetCoverage("b", "s", path, edit)).coverage_edit, edit);
    statements.length = 0;
    assert.equal((await service.updateStreetCoverage("b", "s", null, null)).coverage_edit, null);
    const write = statements.find(row => row.sql.includes("UPDATE barangay_streets"));
    assert.equal(write.params[0], null);
    assert.equal(write.params[1], null);
  });
});

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
