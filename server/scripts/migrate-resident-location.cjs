// Read-only by default. --apply requires explicit configured-database approval.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

const compatible = columns => columns.some(row => row.Field === 'resident_location' && row.Type.toLowerCase() === 'json' && row.Null === 'YES');
async function migrate(db, { apply = false, backup } = {}) {
  const [columns] = await db.query('SHOW COLUMNS FROM users');
  const exists = columns.some(row => row.Field === 'resident_location');
  if (exists && !compatible(columns)) throw Error('Existing resident_location column has an incompatible definition');
  const [[before]] = await db.query('SELECT COUNT(*) AS total FROM users');
  if (!apply || exists) return { mode: apply ? 'already_current' : 'preview', missing: exists ? [] : ['resident_location'], accounts: before.total };
  if (!backup) throw Error('A verified schema backup is required');
  const [[definition]] = await db.query('SHOW CREATE TABLE users');
  await backup(definition['Create Table']);
  await db.query('ALTER TABLE users ADD COLUMN resident_location JSON DEFAULT NULL AFTER street_id');
  const [afterColumns] = await db.query('SHOW COLUMNS FROM users');
  if (!compatible(afterColumns)) throw Error('Resident location column could not be verified');
  const [[after]] = await db.query('SELECT COUNT(*) AS total, COUNT(resident_location) AS located FROM users');
  return { mode: 'applied', accounts_before: before.total, accounts_after: after.total, accounts_with_location: after.located };
}
module.exports = { migrate };

if (require.main === module) (async () => {
  require('dotenv').config({ quiet: true });
  const { pool } = require('../src/config/db');
  try {
    const result = await migrate(pool, { apply: process.argv.includes('--apply'), backup: async sql => {
      const directory = path.join(__dirname, '../backups', `resident-location-${new Date().toISOString().replaceAll(':', '-')}`);
      await fs.mkdir(directory, { recursive: true });
      const file = path.join(directory, 'users-schema.sql');
      const content = `${sql};\n`;
      const hash = value => createHash('sha256').update(value).digest('hex');
      await fs.writeFile(file, content, { flag: 'wx' });
      const checksum = hash(content);
      if (hash(await fs.readFile(file)) !== checksum) throw Error('Schema backup checksum verification failed');
      await fs.writeFile(path.join(directory, 'sha256.txt'), `${checksum}  users-schema.sql\n`, { flag: 'wx' });
      console.log(JSON.stringify({ backup: file, sha256: checksum }));
    } });
    console.log(JSON.stringify(result));
  } catch (error) { console.error('Resident location migration failed:', error.code || error.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
