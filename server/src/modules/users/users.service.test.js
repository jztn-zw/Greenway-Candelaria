const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");
const service = require("./users.service");
const { changePasswordSchema, updateAdminSettingsSchema } = require("./users.schema");

after(() => pool.end());

test("password change updates the hash and revokes sessions in one transaction", async () => {
  const original = pool.getConnection;
  const originalLog = auditService.log;
  auditService.log = async () => {};
  const password = "CurrentPassword123!";
  const statements = [];
  const state = { committed: false, rolledBack: false, released: false };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    query: async (sql, params) => {
      statements.push({ sql, params });
      if (sql.startsWith("SELECT password")) return [[{ password: await bcrypt.hash(password, 4) }]];
      return [{ affectedRows: 1 }];
    },
    commit: async () => { state.committed = true; },
    rollback: async () => { state.rolledBack = true; },
    release: () => { state.released = true; },
  });
  try {
    await service.changePassword("admin-1", { old_password: password, new_password: "NewPassword123!" });
    assert.equal(state.committed, true);
    assert.equal(state.rolledBack, false);
    assert.equal(state.released, true);
    assert.equal(await bcrypt.compare("NewPassword123!", statements[1].params[0]), true);
    assert.equal(statements[2].sql.startsWith("DELETE FROM sessions"), true);
  } finally {
    pool.getConnection = original;
    auditService.log = originalLog;
  }
});

test("password change rolls back if session revocation fails", async () => {
  const original = pool.getConnection;
  const originalLog = auditService.log;
  auditService.log = async () => {};
  const state = { committed: false, rolledBack: false, released: false };
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    query: async (sql) => {
      if (sql.startsWith("SELECT password")) return [[{ password: await bcrypt.hash("CurrentPassword123!", 4) }]];
      if (sql.startsWith("DELETE FROM sessions")) throw new Error("session write failed");
      return [{ affectedRows: 1 }];
    },
    commit: async () => { state.committed = true; },
    rollback: async () => { state.rolledBack = true; },
    release: () => { state.released = true; },
  });
  try {
    await assert.rejects(service.changePassword("admin-1", {
      old_password: "CurrentPassword123!", new_password: "NewPassword123!",
    }), /session write failed/);
    assert.deepEqual(state, { committed: false, rolledBack: true, released: true });
  } finally {
    pool.getConnection = original;
    auditService.log = originalLog;
  }
});

test("admin alert preferences save in one upsert and preserve other settings", async () => {
  const original = pool.query;
  const statements = [];
  pool.query = async (sql, params) => {
    statements.push({ sql, params });
    if (sql.startsWith("SELECT")) return [[{
      notif_admin_reports: 0,
      notif_admin_route_issues: 1,
      notif_admin_driver_messages: 1,
    }]];
    return [{ affectedRows: 1 }];
  };
  try {
    const result = await service.updateAdminSettings("admin-1", { notif_admin_reports: false });
    assert.deepEqual(result, {
      notif_admin_reports: false,
      notif_admin_route_issues: true,
      notif_admin_driver_messages: true,
    });
    assert.equal(statements[0].sql.startsWith("INSERT INTO user_settings"), true);
    assert.match(statements[0].sql, /ON DUPLICATE KEY UPDATE notif_admin_reports/);
    assert.doesNotMatch(statements[0].sql, /notif_collection_reminders/);
    assert.deepEqual(statements[0].params.slice(1), ["admin-1", false]);
    assert.equal(statements.length, 2);
  } finally {
    pool.query = original;
  }
});

test("profile password and admin preference schemas reject unsafe input", () => {
  assert.equal(changePasswordSchema.safeParse({ old_password: "old", new_password: "é".repeat(40) }).success, false);
  assert.equal(updateAdminSettingsSchema.safeParse({}).success, false);
  assert.equal(updateAdminSettingsSchema.safeParse({ notif_admin_reports: "false" }).success, false);
  assert.equal(updateAdminSettingsSchema.safeParse({ notif_admin_reports: false }).success, true);
});

for (const next of ["barangay-new", null, "barangay-old"]) {
  test(`settings address change to ${next} preserves only a street in the same barangay`, async () => {
    const original = pool.query;
    const resident = { barangay_id: "barangay-old", street_id: "street-old" };
    pool.query = async (sql, params) => {
      if (sql.includes("FROM barangays")) return [[{ id: next }]];
      if (sql.startsWith("UPDATE users SET")) {
        if (sql.includes("street_id")) {
          assert.match(sql, /CASE WHEN barangay_id <=> \? THEN street_id ELSE NULL END/);
          assert.deepEqual(params, [next, next, "resident"]);
          if (resident.barangay_id !== next) resident.street_id = null;
        }
        resident.barangay_id = next;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("UPDATE user_settings")) return [{ affectedRows: 1 }];
      if (sql.includes("FROM user_settings")) return [[{ user_id: "resident", primary_barangay_id: next }]];
      throw new Error(`Unexpected query: ${sql}`);
    };
    try {
      await service.updateUserSettings("resident", { primary_barangay_id: next });
      assert.equal(resident.street_id, next === "barangay-old" ? "street-old" : null);
      assert.equal(resident.barangay_id, next);
    } finally { pool.query = original; }
  });
}
