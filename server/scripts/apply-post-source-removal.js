const fs = require("node:fs/promises");
const path = require("node:path");

const applyPostSourceRemoval = async (db, {
  checkOnly = false,
  backupDirectory = path.resolve(__dirname, "../backups"),
} = {}) => {
  const [columns] = await db.query("SHOW COLUMNS FROM posts");
  const names = new Set(columns.map((column) => column.Field));
  if (!names.has("created_by")) throw new Error("Post author records are missing; review the database schema");
  if (checkOnly || !names.has("source")) {
    return { sourcePresent: names.has("source"), authorRecorded: true };
  }

  const [attributions] = await db.query("SELECT id, source FROM posts WHERE source IS NOT NULL");
  const [[before]] = await db.query("SELECT COUNT(*) AS total FROM posts");
  await fs.mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString();
  const backupFile = path.join(backupDirectory, `post-source-${timestamp.replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(backupFile, JSON.stringify({ exportedAt: timestamp, attributions }, null, 2), { flag: "wx" });

  const migration = await fs.readFile(path.resolve(__dirname, "../src/database/migrations/20261002_remove_post_source.sql"), "utf8");
  await db.query(migration);

  const [afterColumns] = await db.query("SHOW COLUMNS FROM posts");
  const remaining = new Set(afterColumns.map((column) => column.Field));
  if (remaining.has("source") || [...names].some((name) => name !== "source" && !remaining.has(name))) {
    throw new Error("Post column verification failed after migration");
  }
  const [[after]] = await db.query("SELECT COUNT(*) AS total FROM posts");
  if (Number(after.total) < Number(before.total)) throw new Error("Post count decreased during migration; review concurrent database activity");
  return {
    sourcePresent: false,
    authorRecorded: true,
    postsBefore: Number(before.total),
    postsAfter: Number(after.total),
    backedUpAttributions: attributions.length,
    backupFile,
  };
};

if (require.main === module) {
  require("dotenv").config({ quiet: true });
  const { pool } = require("../src/config/db");
  (async () => {
    const connection = await pool.getConnection();
    try {
      console.log(JSON.stringify(await applyPostSourceRemoval(connection, { checkOnly: process.argv.includes("--check") })));
    } finally {
      connection.release();
    }
  })().catch((error) => {
    console.error("Post source migration failed:", error.code || error.message);
    process.exitCode = 1;
  }).finally(() => pool.end());
}

module.exports = { applyPostSourceRemoval };
