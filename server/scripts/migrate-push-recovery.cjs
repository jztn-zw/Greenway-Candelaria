// Default: read-only preview. --apply requires the user's explicit approval.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
require('dotenv').config({ quiet: true });
const { pool } = require('../src/config/db');

async function migrate(db, { apply = false, backup } = {}) {
  const [columns] = await db.query('SHOW COLUMNS FROM mobile_push_devices');
  const expected = { registration_version: 'varchar(36)', last_error: 'varchar(40)', native_token_hash: 'char(64)' };
  const missing = [];
  for (const [name, type] of Object.entries(expected)) {
    const column = columns.find(row => row.Field === name);
    if (!column) missing.push(name);
    else if (column.Type.toLowerCase() !== type || column.Null !== 'YES') throw Error('Existing push recovery column has an incompatible definition');
  }
  const [[before]] = await db.query('SELECT COUNT(*) AS total FROM mobile_push_devices');
  if (!apply || !missing.length) return { mode: apply ? 'already_current' : 'preview', missing, registrations: before.total };
  if (!backup) throw Error('A schema backup is required');
  const [[definition]] = await db.query('SHOW CREATE TABLE mobile_push_devices');
  await backup(definition['Create Table']);
  await db.query(`ALTER TABLE mobile_push_devices ${missing.map(name => `ADD COLUMN ${name} ${expected[name]} DEFAULT NULL`).join(', ')}`);
  const [afterColumns] = await db.query('SHOW COLUMNS FROM mobile_push_devices');
  if (!Object.keys(expected).every(name => afterColumns.some(row => row.Field === name))) throw Error('Recovery columns were not verified');
  const [[after]] = await db.query('SELECT COUNT(*) AS total FROM mobile_push_devices');
  return { mode: 'applied', added: missing, registrations_before: before.total, registrations_after: after.total };
}
module.exports = { migrate };

if (require.main === module) (async () => {
  try {
    const apply = process.argv.includes('--apply');
    const result = await migrate(pool, { apply, backup: async sql => {
      const directory = path.join(__dirname, '../backups', `push-recovery-${new Date().toISOString().replaceAll(':', '-')}`);
      await fs.mkdir(directory, { recursive: true });
      const source = sql + ';\n';
      await fs.writeFile(path.join(directory, 'mobile_push_devices.sql'), source, { flag: 'wx' });
      const saved = await fs.readFile(path.join(directory, 'mobile_push_devices.sql'));
      const checksum = createHash('sha256').update(source).digest('hex');
      if (createHash('sha256').update(saved).digest('hex') !== checksum) throw Error('Backup checksum verification failed');
      await fs.writeFile(path.join(directory, 'SHA256.txt'), checksum + '\n', { flag: 'wx' });
    } });
    console.log(JSON.stringify(result));
  } catch { console.error('Push recovery migration stopped; inspect the approved schema and database access.'); process.exitCode = 1; }
  finally { await pool.end(); }
})();
