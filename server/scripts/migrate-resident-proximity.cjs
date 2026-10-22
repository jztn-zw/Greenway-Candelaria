// Preview by default. Apply only after explicit configured-database approval.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const migration = path.join(__dirname, '../src/database/migrations/2026-10-21-resident-proximity-receipts.sql');

async function migrate(db, { apply = false, backup } = {}) {
  const [tables] = await db.query("SHOW TABLES LIKE 'route_run_proximity_receipts'");
  if (tables.length) {
    const [columns] = await db.query('SHOW COLUMNS FROM route_run_proximity_receipts');
    if (!['route_run_id', 'user_id'].every(name => columns.some(c => c.Field === name && c.Type === 'varchar(36)' && c.Key === 'PRI'))) {
      throw Error('Existing proximity receipts table is incompatible');
    }
    return { mode: apply ? 'already_current' : 'preview', missing: [] };
  }
  if (!apply) return { mode: 'preview', missing: ['route_run_proximity_receipts'] };
  if (!backup) throw Error('A verified schema backup is required');
  const definitions = [];
  for (const table of ['users', 'route_runs', 'route_run_stops', 'notifications']) {
    const [[row]] = await db.query(`SHOW CREATE TABLE ${table}`);
    definitions.push(`${row['Create Table']};`);
  }
  await backup(definitions.join('\n\n') + '\n');
  await db.query(await fs.readFile(migration, 'utf8'));
  // The old broadcast flag covered every eligible resident, even if their inbox
  // has since been cleared. Seed these receipts to avoid replaying that alert.
  await db.query(`INSERT INTO route_run_proximity_receipts (route_run_id, user_id)
    SELECT DISTINCT rs.route_run_id, u.id FROM route_run_stops rs
    JOIN users u ON u.barangay_id = rs.barangay_id
      AND (rs.street_id IS NULL OR u.street_id = rs.street_id)
    WHERE rs.notified_at IS NOT NULL AND u.role = 'RESIDENT'
    UNION
    SELECT DISTINCT rr.id, n.user_id FROM notifications n JOIN route_runs rr ON rr.id = n.ref_id
    WHERE n.type = 'TRUCK_IS_NEAR' AND n.ref_module = 'tracking'`);
  const [columns] = await db.query('SHOW COLUMNS FROM route_run_proximity_receipts');
  if (!['route_run_id', 'user_id'].every(name => columns.some(c => c.Field === name && c.Key === 'PRI'))) {
    throw Error('Proximity receipt primary key verification failed');
  }
  const [[count]] = await db.query('SELECT COUNT(*) AS total FROM route_run_proximity_receipts');
  return { mode: 'applied', receipts: count.total };
}
module.exports = { migrate };

if (require.main === module) (async () => {
  require('dotenv').config({ quiet: true });
  const { pool } = require('../src/config/db');
  let db;
  try {
    db = await pool.getConnection();
    const result = await migrate(db, { apply: process.argv.includes('--apply'), backup: async content => {
      const directory = path.join(__dirname, '../backups', `resident-proximity-${new Date().toISOString().replaceAll(':', '-')}`);
      await fs.mkdir(directory, { recursive: true });
      const file = path.join(directory, 'tracking-schemas.sql');
      const hash = value => createHash('sha256').update(value).digest('hex');
      await fs.writeFile(file, content, { flag: 'wx' });
      const checksum = hash(content);
      if (hash(await fs.readFile(file)) !== checksum) throw Error('Backup checksum verification failed');
      await fs.writeFile(path.join(directory, 'sha256.txt'), `${checksum}  tracking-schemas.sql\n`, { flag: 'wx' });
      console.log(JSON.stringify({ backup: file, sha256: checksum }));
    } });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('Proximity migration failed; do not start the updated API until the table and legacy receipt seed are verified:', error.code || error.message);
    process.exitCode = 1;
  } finally { db?.release(); await pool.end(); }
})();
