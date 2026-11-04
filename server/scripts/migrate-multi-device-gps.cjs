// Preview is read-only; --apply requires explicit database approval and stopped writers.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

async function migrate(db, { apply = false, backup } = {}) {
  const [columns] = await db.query('SHOW COLUMNS FROM route_runs');
  const column = columns.find(row => row.Field === 'gps_session_id');
  if (column && (column.Type.toLowerCase() !== 'varchar(36)' || column.Null !== 'YES')) {
    throw Error('Existing gps_session_id has an incompatible definition');
  }
  const [[before]] = await db.query('SELECT COUNT(*) AS total FROM route_runs');
  if (!apply || column) return { mode: apply ? 'already_current' : 'preview', missing: column ? [] : ['gps_session_id'], runs: before.total };
  if (!backup) throw Error('A verified schema backup is required');
  const [[definition]] = await db.query('SHOW CREATE TABLE route_runs');
  await backup(definition['Create Table']);
  await db.query('ALTER TABLE route_runs ADD COLUMN gps_session_id VARCHAR(36) DEFAULT NULL');
  const [afterColumns] = await db.query('SHOW COLUMNS FROM route_runs');
  const afterColumn = afterColumns.find(row => row.Field === 'gps_session_id');
  if (afterColumn?.Type.toLowerCase() !== 'varchar(36)' || afterColumn.Null !== 'YES') throw Error('Column verification failed');
  const [[after]] = await db.query('SELECT COUNT(*) AS total, COUNT(gps_session_id) AS owned FROM route_runs');
  if (Number(before.total) !== Number(after.total) || Number(after.owned) !== 0) throw Error('Run preservation check failed');
  return { mode: 'applied', runs: after.total, owned: after.owned };
}
module.exports = { migrate };

if (require.main === module) (async () => {
  require('dotenv').config({ quiet: true });
  const { pool } = require('../src/config/db');
  try {
    const apply = process.argv.includes('--apply');
    if (apply && !process.argv.includes('--maintenance-confirmed')) throw Error('Stop API/worker writers and confirm maintenance before apply');
    const result = await migrate(pool, { apply, backup: async sql => {
      const directory = path.join(__dirname, '../backups', `multi-device-gps-${new Date().toISOString().replaceAll(':', '-')}`);
      await fs.mkdir(directory, { recursive: true });
      const file = path.join(directory, 'route_runs-schema.sql');
      const content = `${sql};\n`;
      const hash = data => createHash('sha256').update(data).digest('hex');
      await fs.writeFile(file, content, { flag: 'wx' });
      const checksum = hash(content);
      if (hash(await fs.readFile(file)) !== checksum) throw Error('Backup checksum verification failed');
      await fs.writeFile(path.join(directory, 'sha256.txt'), `${checksum}  route_runs-schema.sql\n`, { flag: 'wx' });
      console.log(JSON.stringify({ backup: file, sha256: checksum }));
    } });
    console.log(JSON.stringify(result));
  } catch (error) { console.error('Multi-device upgrade failed:', error.code || error.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
