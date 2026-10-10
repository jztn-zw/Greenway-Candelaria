const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
const tables = [...schema.matchAll(/CREATE TABLE\s+`?(\w+)`?\s*\([\s\S]*?\) ENGINE[^;]*;/g)];

test("the baseline contains only active tables and creates referenced tables first", () => {
  assert.equal(tables.length, 33);
  const created = new Set();
  for (const [sql, name] of tables) {
    for (const [, parent] of sql.matchAll(/REFERENCES\s+`?(\w+)`?\s*\(/g)) {
      assert.ok(created.has(parent), `${name} requires ${parent} to exist first`);
    }
    assert.ok(!created.has(name));
    created.add(name);
  }
  for (const retired of ["collection_schedule", "collection_schedule_reminder_log", "reminder_settings"]) {
    assert.ok(!created.has(retired));
  }
  assert.doesNotMatch(schema, /`(?:profile_visible|language)`/);
  assert.doesNotMatch(schema, /DROP TABLE|INSERT INTO|FOREIGN_KEY_CHECKS\s*=\s*0/i);
});

test("the baseline retains account, tracking and route-history protections", () => {
  assert.match(schema, /UNIQUE KEY `uq_users_single_active_admin`/);
  assert.doesNotMatch(schema, /google_subject/);
  assert.match(schema, /`recovery_code_hash` char\(64\) DEFAULT NULL/);
  assert.match(schema, /`profile_completed` tinyint\(1\) NOT NULL DEFAULT '1'/);
  assert.match(schema, /UNIQUE KEY `uq_barangay_street_identity`/);
  assert.match(schema, /UNIQUE KEY `uq_tracking_sample`/);
  const pushTable = tables.find(([, name]) => name === 'mobile_push_devices')[0];
  assert.match(pushTable, /REFERENCES `sessions` \(`id`\) ON DELETE CASCADE/);
  assert.match(pushTable, /REFERENCES `users` \(`id`\) ON DELETE CASCADE/);
  assert.match(tables.find(([, name]) => name === "audit_logs")[0], /`user_id` varchar\(36\) DEFAULT NULL/);
  assert.doesNotMatch(tables.find(([, name]) => name === "reports")[0], /`priority`/);
  assert.match(schema, /CONSTRAINT `fk_route_runs_template`[^\n]+ON DELETE SET NULL/);
  assert.match(schema, /CONSTRAINT `fk_route_runs_truck_restrict`[^\n]+ON DELETE RESTRICT/);
  assert.match(schema, /CONSTRAINT `fk_tracking_logs_truck_restrict`[^\n]+ON DELETE RESTRICT/);
  const names = [...schema.matchAll(/CONSTRAINT\s+`?(\w+)`?\s/g)].map((match) => match[1]);
  assert.equal(new Set(names).size, names.length, "Constraint names must be database-unique");
});
