const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { applyPostSourceRemoval } = require("./apply-post-source-removal");

let backupDirectory;
beforeEach(async () => { backupDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "greenway-post-source-")); });
afterEach(async () => {
  for (const file of await fs.readdir(backupDirectory)) await fs.unlink(path.join(backupDirectory, file));
  await fs.rmdir(backupDirectory);
});

const database = (hasSource = true) => {
  let present = hasSource;
  const writes = [];
  const rows = [{ id: "post-1", source: "MENRO Candelaria" }];
  const db = { query: async (sql) => {
    if (sql === "SHOW COLUMNS FROM posts") return [["id", "created_by", "body", ...(present ? ["source"] : [])].map((Field) => ({ Field }))];
    if (sql.startsWith("SELECT id, source")) return [rows];
    if (sql.startsWith("SELECT COUNT(*)")) return [[{ total: 12 }]];
    if (sql.includes("ALTER TABLE posts")) {
      const backups = await fs.readdir(backupDirectory);
      assert.equal(backups.length, 1, "Backup must exist before removing the column");
      const saved = JSON.parse(await fs.readFile(path.join(backupDirectory, backups[0]), "utf8"));
      assert.deepEqual(saved.attributions, rows);
      writes.push(sql);
      present = false;
      return [{}];
    }
    throw new Error(`Unexpected query: ${sql}`);
  } };
  return { db, writes };
};

test("backs up existing credits before removing only the attribution column and can be rerun", async () => {
  const { db, writes } = database();
  const result = await applyPostSourceRemoval(db, { backupDirectory });
  assert.equal(result.sourcePresent, false);
  assert.equal(result.authorRecorded, true);
  assert.equal(result.postsBefore, 12);
  assert.equal(result.postsAfter, 12);
  assert.equal(result.backedUpAttributions, 1);
  assert.match(writes[0], /DROP COLUMN source/);
  assert.doesNotMatch(writes[0], /DROP TABLE|DROP COLUMN created_by|DELETE FROM/);
  assert.deepEqual(await applyPostSourceRemoval(db, { backupDirectory }), { sourcePresent: false, authorRecorded: true });
  assert.equal(writes.length, 1);
});

test("check mode reports the schema without changing the database or exporting data", async () => {
  const { db, writes } = database();
  assert.deepEqual(await applyPostSourceRemoval(db, { checkOnly: true, backupDirectory }), { sourcePresent: true, authorRecorded: true });
  assert.equal(writes.length, 0);
  assert.deepEqual(await fs.readdir(backupDirectory), []);
});

test("a failed backup prevents the column from being dropped", async () => {
  const { db, writes } = database();
  const file = path.join(backupDirectory, "not-a-directory");
  await fs.writeFile(file, "occupied");
  await assert.rejects(applyPostSourceRemoval(db, { backupDirectory: file }));
  assert.equal(writes.length, 0);
});
