const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { schemaStatements, resetDatabase, seedAdmin, inspect } = require("./reset-database");
const baseline = schemaStatements(fs.readFileSync(path.resolve(__dirname, "../src/database/schema.sql"), "utf8"));
const admin = { id: "admin-fixture", username: "admin", password: "$2b$12$fixture", role: "ADMIN", status: "ACTIVE", barangay_id: "old-area", street_id: "old-street" };

const database = (options = {}) => {
  const writes = [];
  return { writes, query: async (sql) => {
    if (sql === "SELECT DATABASE() AS name") return [[{ name: "fixture_db" }]];
    if (sql.includes("information_schema.TABLES")) return [options.tables || baseline.map((table) => ({ name: table.name, type: "BASE TABLE" }))];
    if (sql.startsWith("SELECT * FROM users")) return [options.admins || [admin]];
    writes.push(sql);
    return [[]];
  } };
};

test("default invocation previews the reset without deleting data or creating a backup", async () => {
  const db = database();
  const result = await resetDatabase(db);
  assert.equal(result.changed, false);
  assert.equal(result.adminUsername, "admin");
  assert.deepEqual(db.writes, ["SET time_zone = '+00:00'"]);
});

test("apply refuses missing maintenance confirmation and a mismatched target before writing", async () => {
  const db = database();
  await assert.rejects(resetDatabase(db, { apply: true, database: "fixture_db", adminUsername: "admin" }), /API writes are stopped/);
  assert.deepEqual(db.writes, []);
  await assert.rejects(resetDatabase(db, { apply: true, database: "wrong_db", adminUsername: "admin", maintenanceConfirmed: true }), /does not match/);
  assert.ok(db.writes.every((sql) => sql.startsWith("SET time_zone")));
});

test("preflight refuses unknown tables, multiple admins and invalid credentials", async () => {
  await assert.rejects(inspect(database({ tables: [{ name: "unrelated", type: "BASE TABLE" }] }), baseline), /Unrecognized/);
  await assert.rejects(inspect(database({ admins: [admin, admin] }), baseline), /one active admin/);
  await assert.rejects(inspect(database({ admins: [{ ...admin, password: "plain-text" }] }), baseline), /password hash/);
  await assert.rejects(inspect(database(), baseline, { adminUsername: "someone-else" }), /requested username/);
});

test("seeding preserves credentials without copying deleted area links or sessions", async () => {
  const queries = [];
  await seedAdmin({ query: async (sql, values) => queries.push({ sql, values }) }, admin);
  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /INSERT INTO users/);
  assert.doesNotMatch(queries[0].sql, /barangay_id|street_id|single_active_admin|sessions/);
  assert.ok(queries[0].values.includes(admin.password));
  assert.ok(queries[0].values.includes(admin.username));
  assert.match(queries[1].sql, /INSERT INTO user_settings/);
});

test("an incomplete baseline is rejected before database access", () => {
  assert.throws(() => schemaStatements("CREATE TABLE example (id int) ENGINE=InnoDB;"), /Unexpected baseline/);
});

test("a failed backup stops apply before any target tables are dropped", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "greenway-reset-test-"));
  const occupied = path.join(directory, "occupied");
  fs.writeFileSync(occupied, "fixture");
  const db = database();
  try {
    await assert.rejects(resetDatabase(db, {
      apply: true, database: "fixture_db", adminUsername: "admin", maintenanceConfirmed: true, backupDirectory: occupied,
    }));
    assert.deepEqual(db.writes, ["SET time_zone = '+00:00'"]);
  } finally {
    fs.unlinkSync(occupied);
    fs.rmdirSync(directory);
  }
});
