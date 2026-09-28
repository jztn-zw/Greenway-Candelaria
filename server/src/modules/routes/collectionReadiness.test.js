const test = require("node:test");
const assert = require("node:assert/strict");
const { assertCollectionReadyForStops } = require("./collectionReadiness");

const stop = { barangay_id: "barangay-1", street_id: "street-1" };

const connectionWith = ({ available = true, path = [[13.9, 121.4], [13.91, 121.41]], streetBarangay = "barangay-1" } = {}) => {
  const queries = [];
  return {
    queries,
    async query(sql) {
      queries.push(sql);
      if (sql.includes("FROM barangays")) {
        return [[{ id: "barangay-1", collection_service_available: available ? 1 : 0 }]];
      }
      if (sql.includes("FROM barangay_streets")) {
        return [[{ id: "street-1", barangay_id: streetBarangay, name: "Main Street", coverage_path: path }]];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
};

test("an unavailable barangay cannot be put on an enabled route", async () => {
  const connection = connectionWith({ available: false });
  await assert.rejects(assertCollectionReadyForStops(connection, [stop]), { statusCode: 409 });
  assert.match(connection.queries[0], /FOR UPDATE/);
  assert.equal(connection.queries.length, 1);
});

test("a cleared or mismatched street cannot be scheduled", async () => {
  for (const options of [
    { path: null },
    { path: [[13.9, 121.4], [13.9, 121.4]] },
    { streetBarangay: "barangay-2" },
  ]) {
    const connection = connectionWith(options);
    await assert.rejects(assertCollectionReadyForStops(connection, [stop]), { statusCode: 409 });
  }
});

test("a usable street path is checked under a row lock", async () => {
  const connection = connectionWith();
  await assertCollectionReadyForStops(connection, [stop]);
  assert.equal(connection.queries.length, 2);
  assert.match(connection.queries[1], /FOR UPDATE/);
});
