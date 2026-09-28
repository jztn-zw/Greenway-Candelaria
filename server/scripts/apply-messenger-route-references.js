require("dotenv").config({ quiet: true });
const { pool } = require("../src/config/db");
(async () => {
  const [[counts]] = await pool.query(`SELECT COUNT(*) AS invalid_links FROM driver_messages dm
    LEFT JOIN route_runs rr ON rr.id = dm.route_id WHERE dm.route_id IS NOT NULL AND rr.id IS NULL`);
  if (Number(counts.invalid_links)) throw new Error("Unrecognized message route references require review; no messages were changed");
  const [keys] = await pool.query(`SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'driver_messages' AND COLUMN_NAME = 'route_id' AND REFERENCED_TABLE_NAME IS NOT NULL`);
  // The identifier comes from schema metadata and must still be strictly safe.
  for (const key of keys) {
    if (!/^[a-zA-Z0-9_]+$/.test(key.CONSTRAINT_NAME)) throw new Error("Unexpected message constraint name");
  }
  const needsForeignKey = !keys.some((key) => key.REFERENCED_TABLE_NAME === "route_runs");
  const drops = keys.map((key) => `DROP FOREIGN KEY ${key.CONSTRAINT_NAME}, `).join("");
  if (needsForeignKey) await pool.query(`ALTER TABLE driver_messages ${drops}ADD CONSTRAINT fk_driver_messages_run FOREIGN KEY (route_id) REFERENCES route_runs(id) ON DELETE SET NULL`);
  const [indexes] = await pool.query("SHOW INDEX FROM driver_messages");
  const names = new Set(indexes.map((index) => index.Key_name));
  for (const [name, columns] of [["idx_driver_messages_conversation", "driver_id, created_at, id"], ["idx_driver_messages_unread", "driver_id, is_read, sent_by"]]) {
    if (!names.has(name)) await pool.query(`ALTER TABLE driver_messages ADD INDEX ${name} (${columns})`);
  }
  console.log(JSON.stringify({ messageRouteReferencesReady: true, indexesReady: true, foreignKeyChanged: needsForeignKey }));
})().catch((error) => { console.error("Messenger migration failed:", error.code || error.message); process.exitCode = 1; }).finally(() => pool.end());
