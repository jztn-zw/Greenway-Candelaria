// Destructive maintenance command. Default invocation is read-only.
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const retiredTables = ["collection_schedule", "collection_schedule_reminder_log", "reminder_settings"];
const identifier = (name) => {
  if (!/^[A-Za-z0-9_]+$/.test(name || "")) throw new Error("Unexpected database identifier");
  return `\`${name}\``;
};
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const rowDigest = (rows) => digest(rows.map((row) => JSON.stringify(row)).sort().join("\n"));
const schemaStatements = (source) => {
  const statements = [...source.matchAll(/CREATE TABLE\s+`?(\w+)`?\s*\([\s\S]*?\) ENGINE[^;]*;/g)];
  if (statements.length !== 32) throw new Error("Unexpected baseline schema");
  const created = new Set();
  for (const [sql, name] of statements) {
    identifier(name);
    for (const [, parent] of sql.matchAll(/REFERENCES\s+`?(\w+)`?\s*\(/g)) {
      if (!created.has(parent)) throw new Error("Baseline table dependencies are out of order");
    }
    if (created.has(name) || retiredTables.includes(name)) throw new Error("Unexpected baseline table");
    created.add(name);
  }
  return statements.map(([sql, name]) => ({ name, sql }));
};

const inspect = async (db, baseline, { database, adminUsername } = {}) => {
  const [[target]] = await db.query("SELECT DATABASE() AS name");
  identifier(target.name);
  if (database && database !== target.name) throw new Error("Configured database does not match the requested target");
  const [tables] = await db.query("SELECT TABLE_NAME AS name, TABLE_TYPE AS type FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME");
  const allowed = new Set([...baseline.map((table) => table.name), ...retiredTables]);
  if (tables.some((table) => table.type !== "BASE TABLE" || !allowed.has(table.name)) ||
      baseline.some((table) => !tables.some((current) => current.name === table.name))) {
    throw new Error("Unrecognized database tables; review before resetting");
  }
  const [admins] = await db.query("SELECT * FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL");
  if (admins.length !== 1 || admins[0].status !== "ACTIVE" || !admins[0].username ||
      !/^\$2[aby]\$\d{2}\$/.test(admins[0].password || "") ||
      (adminUsername && admins[0].username !== adminUsername)) {
    throw new Error("Expected one active admin with the requested username and a password hash");
  }
  return { database: target.name, tables: tables.map((table) => table.name), admin: admins[0] };
};

const exportBackup = async (db, state, directory) => {
  await fs.mkdir(directory, { recursive: true });
  const statements = ["SET NAMES utf8mb4", "SET time_zone = '+00:00'", "SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO'", "SET FOREIGN_KEY_CHECKS = 0"];
  const counts = {};
  const contents = {};
  await db.beginTransaction();
  try {
    for (const name of state.tables) {
      const [[definition]] = await db.query(`SHOW CREATE TABLE ${identifier(name)}`);
      statements.push(definition["Create Table"]);
    }
    for (const name of state.tables) {
      const [columns] = await db.query(`SHOW FULL COLUMNS FROM ${identifier(name)}`);
      const writable = columns.filter((column) => !/\b(?:VIRTUAL|STORED) GENERATED\b/.test(column.Extra));
      const [rows] = await db.query(`SELECT ${writable.map((column) => identifier(column.Field)).join(", ")} FROM ${identifier(name)}`);
      counts[name] = rows.length;
      contents[name] = { columns: writable.map((column) => column.Field), sha256: rowDigest(rows) };
      for (let offset = 0; offset < rows.length; offset += 100) {
        const values = rows.slice(offset, offset + 100).map((row) => `(${writable.map((column) => {
          const value = row[column.Field];
          return db.escape(column.Type === "json" && value !== null && typeof value === "object" ? JSON.stringify(value) : value);
        }).join(", ")})`);
        statements.push(`INSERT INTO ${identifier(name)} (${writable.map((column) => identifier(column.Field)).join(", ")}) VALUES ${values.join(",\n")}`);
      }
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
  statements.push("SET FOREIGN_KEY_CHECKS = 1");
  const sql = "-- Private GreenWay backup. Restore into an empty database. Do not commit.\n" + statements.join(";\n\n") + ";\n";
  const backupFile = path.join(directory, "restore.sql");
  await fs.writeFile(backupFile, sql, { flag: "wx" });
  const checksum = digest(Buffer.from(sql));
  const manifest = { exportedAt: new Date().toISOString(), database: state.database, tableCounts: counts, tableContents: contents, file: "restore.sql", sha256: checksum };
  await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), { flag: "wx" });
  if (digest(await fs.readFile(backupFile)) !== checksum) throw new Error("Backup checksum verification failed");
  return { directory, statements, counts, contents, checksum };
};

const verifyBackupAndSchema = async (db, state, backup, baseline) => {
  const scratch = `greenway_reset_verify_${crypto.randomBytes(6).toString("hex")}`;
  let created = false;
  try {
    await db.query(`CREATE DATABASE ${identifier(scratch)} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`);
    created = true;
    await db.query(`USE ${identifier(scratch)}`);
    for (const sql of backup.statements) await db.query(sql);
    for (const [name, count] of Object.entries(backup.counts)) {
      const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM ${identifier(name)}`);
      if (Number(row.total) !== count) throw new Error("Backup restore row count verification failed");
      const expected = backup.contents[name];
      const [rows] = await db.query(`SELECT ${expected.columns.map(identifier).join(", ")} FROM ${identifier(name)}`);
      if (rowDigest(rows) !== expected.sha256) throw new Error("Backup restore content verification failed");
    }
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const name of state.tables) await db.query(`DROP TABLE ${identifier(name)}`);
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    for (const table of baseline) await db.query(table.sql);
    const [tables] = await db.query("SHOW TABLES");
    if (tables.length !== baseline.length) throw new Error("Baseline schema import verification failed");
  } finally {
    await db.query(`USE ${identifier(state.database)}`);
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
    if (created) await db.query(`DROP DATABASE ${identifier(scratch)}`);
  }
};

const seedAdmin = async (db, admin) => {
  const preserved = ["id", "full_name", "username", "email", "phone", "password", "recovery_code_hash", "avatar_url", "two_factor"];
  await db.query(`INSERT INTO users (${preserved.map(identifier).join(", ")}, role, status, profile_completed)
    VALUES (${preserved.map(() => "?").join(", ")}, 'ADMIN', 'ACTIVE', 1)`, preserved.map((column) => admin[column] ?? null));
  await db.query("INSERT INTO user_settings (id, user_id) VALUES (?, ?)", [crypto.randomUUID(), admin.id]);
};

const resetDatabase = async (db, { apply = false, database, adminUsername, maintenanceConfirmed = false, backupDirectory } = {}) => {
  const source = await fs.readFile(path.resolve(__dirname, "../src/database/schema.sql"), "utf8");
  const baseline = schemaStatements(source);
  if (apply && (!database || !adminUsername || !maintenanceConfirmed)) {
    throw new Error("Apply requires an explicit database, admin username, and confirmation that API writes are stopped");
  }
  await db.query("SET time_zone = '+00:00'");
  const state = await inspect(db, baseline, { database, adminUsername });
  const summary = { database: state.database, adminUsername: state.admin.username, tablesBefore: state.tables.length, tablesAfter: baseline.length };
  if (!apply) return { ...summary, changed: false };
  const directory = backupDirectory || path.resolve(__dirname, "../backups", `database-reset-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const backup = await exportBackup(db, state, directory);
  console.log(JSON.stringify({ stage: "backup-verified", directory: backup.directory, tables: state.tables.length }));
  await verifyBackupAndSchema(db, state, backup, baseline);
  console.log(JSON.stringify({ stage: "restore-and-schema-verified", tables: baseline.length }));
  // Refuse a reset if records changed after the snapshot. API writes must remain stopped.
  for (const [name, count] of Object.entries(backup.counts)) {
    const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM ${identifier(name)}`);
    if (Number(row.total) !== count) throw new Error("Database changed during backup verification; no target tables dropped");
  }
  const [[currentAdmin]] = await db.query("SELECT password FROM users WHERE id = ?", [state.admin.id]);
  if (currentAdmin?.password !== state.admin.password) throw new Error("Admin credentials changed during backup verification");
  // DDL is not transactional. The verified private backup is the recovery path.
  await db.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const name of state.tables) await db.query(`DROP TABLE ${identifier(name)}`);
  } finally {
    await db.query("SET FOREIGN_KEY_CHECKS = 1");
  }
  for (const table of baseline) await db.query(table.sql);
  await db.beginTransaction();
  try {
    await seedAdmin(db, state.admin);
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
  for (const table of baseline) {
    const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM ${identifier(table.name)}`);
    if (Number(row.total) !== (["users", "user_settings"].includes(table.name) ? 1 : 0)) {
      throw new Error("Reset record count verification failed");
    }
  }
  return { ...summary, changed: true, backupDirectory: backup.directory, adminCredentialsPreserved: true, users: 1, sessions: 0 };
};

if (require.main === module) {
  require("dotenv").config({ quiet: true });
  const { pool } = require("../src/config/db");
  const value = (flag) => process.argv[process.argv.indexOf(flag) + 1];
  (async () => {
    const connection = await pool.getConnection();
    try {
      console.log(JSON.stringify(await resetDatabase(connection, {
        apply: process.argv.includes("--apply"),
        database: process.argv.includes("--database") ? value("--database") : undefined,
        adminUsername: process.argv.includes("--admin") ? value("--admin") : undefined,
        maintenanceConfirmed: process.argv.includes("--maintenance-confirmed"),
      })));
    } finally { connection.release(); }
  })().catch((error) => {
    // Database error messages can contain private SQL values. Do not log them.
    console.error("Database reset failed:", error.code || (error.sql ? error.name : error.message));
    process.exitCode = 1;
  }).finally(() => pool.end());
}

module.exports = { schemaStatements, inspect, exportBackup, verifyBackupAndSchema, seedAdmin, resetDatabase };
