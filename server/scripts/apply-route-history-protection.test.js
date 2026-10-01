const { test } = require("node:test");
const assert = require("node:assert/strict");
const { applyRouteHistoryProtection } = require("./apply-route-history-protection");
const fixture = ({ ready = false, missingKey = false, invalidLinks = 0, unexpectedTarget = false } = {}) => {
  const statements = [];
  const column = { COLUMN_TYPE: "varchar(36)", IS_NULLABLE: ready ? "YES" : "NO", CHARACTER_SET_NAME: "utf8mb4", COLLATION_NAME: "utf8mb4_bin" };
  let keys = missingKey ? [] : [{ CONSTRAINT_NAME: "fk_route_runs_template", REFERENCED_TABLE_NAME: unexpectedTarget ? "other" : "routes", REFERENCED_COLUMN_NAME: "id", DELETE_RULE: ready ? "SET NULL" : "CASCADE" }];
  const db = { query: async (sql) => {
    statements.push(sql);
    if (sql.includes("information_schema.COLUMNS")) return [[{ ...column }]];
    if (sql.includes("information_schema.KEY_COLUMN_USAGE")) return [keys];
    if (sql.includes("AS gpsLogs")) return [[{ runs: 12, stops: 42, gpsLogs: 200 }]];
    if (sql.includes("AS invalidLinks")) return [[{ invalidLinks }]];
    if (sql.includes("DROP FOREIGN KEY")) keys = [];
    else if (sql.includes("MODIFY COLUMN")) column.IS_NULLABLE = "YES";
    else if (sql.includes("ADD CONSTRAINT")) keys = [{ CONSTRAINT_NAME: "fk_route_runs_template", REFERENCED_TABLE_NAME: "routes", REFERENCED_COLUMN_NAME: "id", DELETE_RULE: "SET NULL" }];
    else throw new Error(`Unexpected SQL: ${sql}`);
    return [{ affectedRows: 0 }];
  } };
  return { db, statements };
};
test("replaces cascade deletion with nullable history links without changing historical rows", async () => {
  const { db, statements } = fixture();
  const result = await applyRouteHistoryProtection(db);
  assert.equal(result.ready, true); assert.equal(result.changed, true);
  assert.deepEqual(result.before, result.after);
  assert.equal(statements.filter((sql) => sql.startsWith("ALTER TABLE")).length, 3);
  assert.ok(statements.every((sql) => !/^(DELETE|UPDATE|INSERT)\b/.test(sql)));
  const again = await applyRouteHistoryProtection(db);
  assert.equal(again.changed, false);
  assert.equal(statements.filter((sql) => sql.startsWith("ALTER TABLE")).length, 3);
});
test("checks without modifying an outdated schema", async () => {
  const { db, statements } = fixture();
  assert.equal((await applyRouteHistoryProtection(db, { checkOnly: true })).ready, false);
  assert.ok(statements.every((sql) => sql.startsWith("SELECT")));
});
test("resumes a migration whose foreign key was already removed", async () => {
  const { db, statements } = fixture({ missingKey: true });
  assert.equal((await applyRouteHistoryProtection(db)).ready, true);
  assert.ok(!statements.some((sql) => sql.includes("DROP FOREIGN KEY")));
});
test("refuses orphaned historical links before any schema write", async () => {
  const { db, statements } = fixture({ invalidLinks: 1 });
  await assert.rejects(applyRouteHistoryProtection(db), /Unrecognized historical route references/);
  assert.ok(statements.every((sql) => sql.startsWith("SELECT")));
});
test("refuses an unexpected foreign key target before any schema write", async () => {
  const { db, statements } = fixture({ unexpectedTarget: true });
  await assert.rejects(applyRouteHistoryProtection(db), /Unexpected route history schema/);
  assert.ok(statements.every((sql) => sql.startsWith("SELECT")));
});
