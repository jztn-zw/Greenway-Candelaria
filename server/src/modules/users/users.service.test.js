const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");
const service = require("./users.service");
const { changePasswordSchema, updateAdminSettingsSchema } = require("./users.schema");

after(() => pool.end());
test('optional coordinates are selected only for the owner profile and omitted from auth responses', async () => {
  const original = pool.query;
  const location = { method: 'MANUAL_PIN', latitude: 13.93, longitude: 121.42 };
  const statements = [];
  pool.query = async sql => { statements.push(sql); return [[{ id: 'resident', role: 'RESIDENT', resident_location: location }]]; };
  try {
    assert.deepEqual((await service.getProfile('resident')).resident_location, location);
    assert.match(statements[0], /u\.resident_location/);
    await service.getById('resident'); assert.doesNotMatch(statements[1], /resident_location/);
    const me = await require('../auth/auth.service').getMe('resident');
    assert.equal(Object.hasOwn(me, 'resident_location'), false);
  } finally { pool.query = original; }
});
test("admin resident details include the assigned street name", async () => {
  const original = pool.query;
  let statement = "";
  pool.query = async (sql) => {
    statement = sql;
    return [[{ id: "resident", barangay_name: "Poblacion", street_name: "Mabini Street" }]];
  };
  try {
    const resident = await service.getById("resident");
    assert.equal(resident.street_name, "Mabini Street");
    assert.match(statement, /bs\.name AS street_name/);
    assert.match(statement, /LEFT JOIN barangay_streets bs ON u\.street_id = bs\.id/);
  } finally { pool.query = original; }
});

test("resident contact changes persist without changing collection area; other roles keep their existing restrictions", async () => {
  const original = pool.query;
  let role = 'RESIDENT';
  const writes = [];
  pool.query = async (sql, params) => {
    if (sql.startsWith('SELECT role')) return [[{ role }]];
    if (sql.startsWith('UPDATE users')) { writes.push({ sql, params }); return [{ affectedRows: 1 }]; }
    if (sql.includes('FROM users u')) return [[{ id: 'resident', email: null, role }]];
    throw new Error('Unexpected contact fixture query');
  };
  try {
    await service.updateProfile('resident', { email: null, phone: '' });
    assert.equal(writes.length, 1);
    assert.doesNotMatch(writes[0].sql, /barangay_id|street_id/);
    assert.deepEqual(writes[0].params, [null, null, 'resident']);
    role = 'ADMIN';
    await assert.rejects(service.updateProfile('admin', { email: 'admin@example.test' }), error => error.statusCode === 403);
    assert.equal(writes.length, 1);
  } finally { pool.query = original; }
});

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

test("deleted resident count includes only resident tombstones", async () => {
  const original = pool.query;
  let statement = "";
  pool.query = async (sql) => {
    statement = sql;
    return [[{ total: 4 }]];
  };
  try {
    assert.equal(await service.getDeletedResidentCount(), 4);
    assert.match(statement, /role = 'RESIDENT'/);
    assert.match(statement, /deleted_at IS NOT NULL/);
  } finally { pool.query = original; }
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
    const originalConnection = pool.getConnection;
    const resident = { barangay_id: "barangay-old", street_id: "street-old", resident_location: { method: 'MANUAL_PIN' } };
    pool.query = async (sql, params) => {
      if (sql.includes("FROM users") && sql.includes("FOR UPDATE")) return [[{ id: "resident" }]];
      if (sql.includes("FROM barangays")) return [[{ id: next }]];
      if (sql.startsWith("UPDATE users SET")) {
        if (sql.includes("street_id")) {
          assert.match(sql, /CASE WHEN barangay_id <=> \? THEN street_id ELSE NULL END/);
          assert.match(sql, /resident_location = CASE WHEN barangay_id <=> \? THEN resident_location ELSE NULL END/);
          assert.deepEqual(params, [next, next, next, "resident"]);
          if (resident.barangay_id !== next) { resident.street_id = null; resident.resident_location = null; }
        }
        resident.barangay_id = next;
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("UPDATE user_settings")) return [{ affectedRows: 1 }];
      if (sql.includes("FROM user_settings")) return [[{ user_id: "resident", primary_barangay_id: next }]];
      throw new Error(`Unexpected query: ${sql}`);
    };
    pool.getConnection = async () => ({ query: pool.query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {} });
    try {
      await service.updateUserSettings("resident", { primary_barangay_id: next });
      assert.equal(resident.street_id, next === "barangay-old" ? "street-old" : null);
      assert.deepEqual(resident.resident_location, next === "barangay-old" ? { method: 'MANUAL_PIN' } : null);
      assert.equal(resident.barangay_id, next);
    } finally { pool.query = original; pool.getConnection = originalConnection; }
  });
}

for (const operation of ["read", "write", "profile"]) {
  test(`late ${operation} cannot restore a deleted resident's area or settings`, async () => {
    const original = { query: pool.query, connection: pool.getConnection };
    const statements = [];
    const query = async (sql) => {
      statements.push(sql);
      if (sql.includes("FROM users") && sql.includes("FOR UPDATE")) return [[]];
      if (sql.includes("FROM barangays")) return [[{ id: "barangay" }]];
      if (sql.includes("FROM user_settings")) return [[]];
      if (sql.includes("FROM users u")) return [[]];
      return [{ affectedRows: 0 }];
    };
    pool.query = query;
    pool.getConnection = async () => ({ query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {} });
    try {
      const request = operation === "read" ? service.getUserSettings("deleted")
        : operation === "write" ? service.updateUserSettings("deleted", { primary_barangay_id: "barangay" })
        : service.updateProfile("deleted", { barangay_id: "barangay" });
      await assert.rejects(request, error => error.statusCode === 403);
      assert.equal(statements.some(sql => /^(INSERT INTO|UPDATE) user_settings/.test(sql.trimStart())), false);
      for (const sql of statements.filter(sql => sql.startsWith("UPDATE users"))) assert.match(sql, /deleted_at IS NULL/);
    } finally { pool.query = original.query; pool.getConnection = original.connection; }
  });
}

test("a settings request waiting behind deletion rechecks the account after acquiring its lock", async () => {
  const original = { query: pool.query, connection: pool.getConnection };
  let releaseLock;
  let lockRequested;
  let deleted = false;
  const writes = [];
  const waiting = new Promise(resolve => { lockRequested = resolve; });
  const lock = new Promise(resolve => { releaseLock = resolve; });
  const query = async sql => {
    if (sql.includes("FROM users") && sql.includes("FOR UPDATE")) {
      lockRequested();
      await lock;
      return [deleted ? [] : [{ id: "resident" }]];
    }
    writes.push(sql);
    return [[]];
  };
  pool.query = query;
  pool.getConnection = async () => ({ query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {} });
  try {
    const request = service.updateUserSettings("resident", { primary_barangay_id: "barangay" });
    const denied = assert.rejects(request, error => error.statusCode === 403);
    await waiting;
    assert.deepEqual(writes, []);
    deleted = true;
    releaseLock();
    await denied;
    assert.deepEqual(writes, []);
  } finally { releaseLock(); pool.query = original.query; pool.getConnection = original.connection; }
});
