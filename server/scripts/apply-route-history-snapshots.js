// Idempotent application of 20260928_route_history_vehicle_snapshots.sql.
require("dotenv").config({ quiet: true });
const { pool } = require("../src/config/db");
const apply = async () => {
  const [columns] = await pool.query("SHOW COLUMNS FROM route_runs");
  const names = new Set(columns.map((column) => column.Field));
  for (const name of ["truck_name_snapshot", "truck_plate_snapshot"]) {
    if (!names.has(name)) await pool.query(`ALTER TABLE route_runs ADD COLUMN ${name} VARCHAR(255) NULL`);
  }
  const [result] = await pool.query(
    `UPDATE route_runs rr JOIN trucks t ON t.id = rr.truck_id
     SET rr.truck_name_snapshot = COALESCE(rr.truck_name_snapshot, t.name),
         rr.truck_plate_snapshot = COALESCE(rr.truck_plate_snapshot, t.plate_number)
     WHERE rr.status IN ('SCHEDULED','ACTIVE','PAUSED')`);
  console.log(JSON.stringify({ snapshotsReady: true, openRunsUpdated: result.affectedRows }));
};
apply().catch((error) => { console.error("Snapshot migration failed:", error.code || error.name); process.exitCode = 1; }).finally(() => pool.end());
