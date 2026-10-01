// Idempotent application of 20260924_preserve_route_run_history.sql.
const inspect = async (db) => {
  const [columns] = await db.query(`SELECT COLUMN_TYPE, IS_NULLABLE, CHARACTER_SET_NAME, COLLATION_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'route_runs' AND COLUMN_NAME = 'route_id'`);
  const [keys] = await db.query(`SELECT k.CONSTRAINT_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, r.DELETE_RULE
    FROM information_schema.KEY_COLUMN_USAGE k
    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.TABLE_NAME = k.TABLE_NAME
    WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'route_runs' AND k.COLUMN_NAME = 'route_id'`);
  return { column: columns[0], keys };
};
const isReady = ({ column, keys }) => column?.IS_NULLABLE === "YES" && keys.length === 1 &&
  keys[0].CONSTRAINT_NAME === "fk_route_runs_template" && keys[0].REFERENCED_TABLE_NAME === "routes" &&
  keys[0].REFERENCED_COLUMN_NAME === "id" && keys[0].DELETE_RULE === "SET NULL";
const countHistory = async (db) => {
  const [[counts]] = await db.query(`SELECT
    (SELECT COUNT(*) FROM route_runs) AS runs,
    (SELECT COUNT(*) FROM route_run_stops) AS stops,
    (SELECT COUNT(*) FROM tracking_logs) AS gpsLogs`);
  return counts;
};
const identifier = (value) => {
  if (!/^[a-zA-Z0-9_]+$/.test(value || "")) throw new Error("Unexpected route history schema identifier");
  return `\`${value}\``;
};
const applyRouteHistoryProtection = async (db, { checkOnly = false } = {}) => {
  const state = await inspect(db);
  const before = await countHistory(db);
  if (isReady(state) || checkOnly) return { ready: isReady(state), changed: false, before, after: before };
  if (state.column?.COLUMN_TYPE?.toLowerCase() !== "varchar(36)" || state.keys.length > 1 ||
      state.keys.some((key) => key.REFERENCED_TABLE_NAME !== "routes" || key.REFERENCED_COLUMN_NAME !== "id")) {
    throw new Error("Unexpected route history schema; no changes applied");
  }
  // Validate all metadata before the first schema write, preserving the existing collation.
  const charset = identifier(state.column.CHARACTER_SET_NAME);
  const collation = identifier(state.column.COLLATION_NAME);
  const constraintNames = state.keys.map((key) => identifier(key.CONSTRAINT_NAME));
  const [[links]] = await db.query(`SELECT COUNT(*) AS invalidLinks FROM route_runs rr
    LEFT JOIN routes r ON r.id = rr.route_id WHERE rr.route_id IS NOT NULL AND r.id IS NULL`);
  if (Number(links.invalidLinks)) throw new Error("Unrecognized historical route references; no changes applied");
  // TiDB requires these as separate changes. The API guard blocks deletions until the final FK is ready.
  // https://docs.pingcap.com/tidb/stable/sql-statement-alter-table/#mysql-compatibility
  for (const name of constraintNames) await db.query(`ALTER TABLE route_runs DROP FOREIGN KEY ${name}`);
  if (state.column.IS_NULLABLE !== "YES") {
    await db.query(`ALTER TABLE route_runs MODIFY COLUMN route_id VARCHAR(36) CHARACTER SET ${charset} COLLATE ${collation} NULL`);
  }
  await db.query(`ALTER TABLE route_runs ADD CONSTRAINT fk_route_runs_template
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL`);
  if (!isReady(await inspect(db))) throw new Error("Route history protection verification failed");
  const after = await countHistory(db);
  if (Object.keys(before).some((key) => Number(after[key]) < Number(before[key]))) {
    throw new Error("History counts decreased during migration; review concurrent database activity");
  }
  return { ready: true, changed: true, before, after };
};

if (require.main === module) {
  require("dotenv").config({ quiet: true });
  const { pool } = require("../src/config/db");
  (async () => {
    const connection = await pool.getConnection();
    try {
      const result = await applyRouteHistoryProtection(connection, { checkOnly: process.argv.includes("--check") });
      console.log(JSON.stringify(result));
      if (!result.ready) process.exitCode = 1;
    } finally { connection.release(); }
  })().catch((error) => {
    console.error("Route history protection migration failed:", error.code || error.message);
    process.exitCode = 1;
  }).finally(() => pool.end());
}
module.exports = { applyRouteHistoryProtection };
