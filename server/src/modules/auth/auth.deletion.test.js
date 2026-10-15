const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../../config/db");
const service = require("./auth.service");
const { accountDeletionSchema } = require("./auth.schema");
after(() => pool.end());

const fixture = async (options, run) => {
  const password = await bcrypt.hash("CurrentPassword123!", 4);
  let user = { id: "resident", full_name: "Resident", username: "resident", email: "resident@example.test", phone: "+639123456789", avatar_url: "/avatar.png", barangay_id: "barangay", street_id: "street", role: "RESIDENT", status: "ACTIVE", deleted_at: null, password, self_deactivated_at: null, profile_completed: 1, ...options.user };
  let sessions = options.sessions ?? ["old-session"]; let audits = []; let snapshot;
  const statements = []; const state = { committed: false, rolledBack: false };
  const original = { query: pool.query, connection: pool.getConnection, secret: process.env.JWT_SECRET };
  process.env.JWT_SECRET = "test-only-deletion-secret";
  const query = async (sql, params = []) => {
    statements.push({ sql, params });
    if (sql.trimStart().startsWith("SELECT") && sql.includes("FROM sessions")) {
      return [sessions.some((token) => params.includes(token)) ? [{ ...user, user_id: user.id }] : []];
    }
    if (sql.trimStart().startsWith("SELECT")) return [[{ ...user }]];
    if (sql.includes("deleted_at = UTC_TIMESTAMP()")) {
      Object.assign(user, { deleted_at: "2026-10-15", full_name: "Deleted Resident", username: null, email: null, phone: null, avatar_url: null, barangay_id: null, street_id: null, recovery_code_hash: null, password: params[0] });
    }
    if (sql.includes("status = 'DEACTIVATED'")) user.status = "DEACTIVATED";
    if (sql.includes("status = 'ACTIVE'")) { user.status = "ACTIVE"; user.self_deactivated_at = null; }
    if (sql.includes("SET password = ?, recovery_code_hash = ?")) { user.password = params[0]; user.recovery_code_hash = params[1]; }
    if (sql.includes("DELETE FROM sessions")) {
      if (options.failRevocation) throw new Error("revocation failed");
      sessions = [];
    }
    if (options.failCleanup && sql.includes("DELETE FROM notifications")) throw new Error("cleanup failed");
    if (sql.includes("INSERT INTO sessions")) {
      if (options.failSession) throw new Error("session failed");
      sessions.push(params[2]);
    }
    if (sql.includes("INSERT INTO audit_logs")) {
      if (options.failAudit) throw new Error("audit failed");
      audits.push(params[2]);
    }
    return [{ affectedRows: 1 }];
  };
  pool.query = query;
  pool.getConnection = async () => ({ query,
    beginTransaction: async () => { snapshot = { user: { ...user }, sessions: [...sessions], audits: [...audits] }; },
    commit: async () => { state.committed = true; },
    rollback: async () => { state.rolledBack = true; user = snapshot.user; sessions = snapshot.sessions; audits = snapshot.audits; },
    release: () => {},
  });
  try { await run({ user: () => user, sessions: () => sessions, audits: () => audits, state, statements }); }
  finally {
    pool.query = original.query; pool.getConnection = original.connection;
    if (original.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original.secret;
  }
};

test("resident deletion anonymizes the profile, preserves reports, and revokes sessions atomically", async () => {
  await fixture({}, async ({ user, sessions, audits, statements }) => {
    await service.deleteResident("resident", "CurrentPassword123!", "old-session", "test-ip");
    assert.equal(user().status, "DEACTIVATED");
    assert.ok(user().deleted_at);
    assert.equal(user().full_name, "Deleted Resident");
    for (const field of ["username", "email", "phone", "avatar_url", "barangay_id", "street_id", "recovery_code_hash"]) assert.equal(user()[field], null);
    assert.equal(await bcrypt.compare("CurrentPassword123!", user().password), false);
    assert.deepEqual(sessions(), []);
    assert.deepEqual(audits(), ["DELETE_USER"]);
    assert.equal(statements.some(({ sql }) => /DELETE FROM (users|reports)/.test(sql)), false);
  });
});

test("wrong confirmation password leaves the resident active and signed in", async () => {
  await fixture({}, async ({ user, sessions }) => {
    await assert.rejects(service.deleteResident("resident", "WrongPassword", "old-session"), (error) => error.statusCode === 400);
    assert.equal(user().status, "ACTIVE"); assert.deepEqual(sessions(), ["old-session"]);
  });
});

test("deletion rechecks session revocation inside the account transaction", async () => {
  await fixture({ sessions: [] }, async ({ user, audits }) => {
    await assert.rejects(service.deleteResident("resident", "CurrentPassword123!", "old-session"), (error) => error.statusCode === 401);
    assert.equal(user().status, "ACTIVE"); assert.deepEqual(audits(), []);
  });
});

test("a login already checking credentials cannot issue a session after deletion", async () => {
  const compare = bcrypt.compare;
  let resume; let comparing;
  const started = new Promise((resolve) => { comparing = resolve; });
  bcrypt.compare = async () => { comparing(); await new Promise((resolve) => { resume = resolve; }); return true; };
  try {
    await fixture({}, async ({ user, statements }) => {
      const login = service.login({ identifier: "resident", password: "CurrentPassword123!" });
      const denied = assert.rejects(login, (error) => error.statusCode === 403);
      await started;
      user().deleted_at = "2026-10-15";
      resume(); await denied;
      assert.equal(statements.some(({ sql }) => sql.includes("INSERT INTO sessions")), false);
    });
  } finally { resume?.(); bcrypt.compare = compare; }
});

test("deleted accounts cannot log in or use old HTTP and socket tokens", async () => {
  const authenticate = require("../../middleware/auth");
  const { authenticateSocketUser } = require("../../sockets/socketAuth");
  await fixture({}, async ({ sessions }) => {
    const old = await service.login({ identifier: "resident", password: "CurrentPassword123!" });
    await service.deleteResident("resident", "CurrentPassword123!", old.token);
    await assert.rejects(service.login({ identifier: "resident", password: "CurrentPassword123!" }), error => [401, 403].includes(error.statusCode));
    assert.equal(sessions().length, 0);
    let status; let forwarded = false;
    await authenticate({ headers: { authorization: `Bearer ${old.token}` }, baseUrl: "/api/users" },
      { status(code) { status = code; return this; }, json() {} }, () => { forwarded = true; });
    assert.equal(status, 401); assert.equal(forwarded, false);
    assert.equal(await authenticateSocketUser({ handshake: { auth: { token: old.token } } }), null);
  });
});

test("repeating deletion cannot duplicate its audit outcome", async () => {
  await fixture({}, async ({ audits }) => {
    await service.deleteResident("resident", "CurrentPassword123!", "old-session");
    await assert.rejects(service.deleteResident("resident", "CurrentPassword123!", "old-session"), error => error.statusCode === 404);
    assert.deepEqual(audits(), ["DELETE_USER"]);
  });
});

test("recovery cannot restore a deleted account even with a legacy reactivation marker", async () => {
  const { createRecoveryCode } = require("./auth.recovery");
  const recovery = createRecoveryCode();
  await fixture({ user: { deleted_at: "2026-10-15", status: "DEACTIVATED", self_deactivated_at: "2026-10-14", recovery_code_hash: recovery.hash } }, async ({ statements }) => {
    await assert.rejects(service.recoverPassword({ recovery_code: recovery.code, new_password: "NewPassword123!" }), error => error.statusCode === 401);
    assert.equal(statements.some(({ sql }) => sql.startsWith("UPDATE")), false);
  });
});

for (const user of [{ role: "ADMIN" }, { role: "DRIVER" }, { status: "BANNED" }, { deleted_at: "2026-10-01" }]) {
  test(`deletion refuses account state ${JSON.stringify(user)}`, async () => {
    await fixture({ user }, async ({ statements }) => {
      await assert.rejects(service.deleteResident("resident", "CurrentPassword123!", "old-session"), (error) => [403, 404, 409].includes(error.statusCode));
      assert.equal(statements.some(({ sql }) => sql.startsWith("UPDATE")), false);
    });
  });
}

for (const failure of ["failRevocation", "failCleanup", "failAudit"]) {
  test(`deletion rolls back on ${failure}`, async () => {
    await fixture({ [failure]: true }, async ({ user, sessions, audits }) => {
      await assert.rejects(service.deleteResident("resident", "CurrentPassword123!", "old-session"), /failed/);
      assert.equal(user().status, "ACTIVE"); assert.equal(user().self_deactivated_at, null);
      assert.equal(user().deleted_at, null); assert.equal(user().username, "resident");
      assert.deepEqual(sessions(), ["old-session"]); assert.deepEqual(audits(), []);
    });
  });
}

test("correct login reactivates a self-deactivated resident and issues a new token", async () => {
  await fixture({ user: { status: "DEACTIVATED", self_deactivated_at: "2026-10-14 10:00:00.000" } }, async ({ user, sessions, audits }) => {
    const result = await service.login({ identifier: "resident", password: "CurrentPassword123!" });
    assert.equal(result.reactivated, true); assert.equal(result.user.status, "ACTIVE");
    assert.equal(user().self_deactivated_at, null);
    assert.equal(sessions().length, 1); assert.notEqual(sessions()[0], "old-session");
    assert.ok(jwt.decode(result.token).jti);
    assert.deepEqual(audits(), ["REACTIVATE_USER"]);
  });
});

test("wrong login password cannot reactivate a self-deactivated resident", async () => {
  await fixture({ user: { status: "DEACTIVATED", self_deactivated_at: "2026-10-14 10:00:00.000" } }, async ({ user }) => {
    await assert.rejects(service.login({ identifier: "resident", password: "WrongPassword" }), (error) => error.statusCode === 401);
    assert.equal(user().status, "DEACTIVATED");
  });
});

for (const user of [{ status: "BANNED", self_deactivated_at: "2026-10-14" }, { status: "DEACTIVATED", self_deactivated_at: null }, { role: "DRIVER", status: "DEACTIVATED", self_deactivated_at: "2026-10-14" }]) {
  test(`normal login cannot bypass restricted state ${JSON.stringify(user)}`, async () => {
    await fixture({ user }, async ({ statements }) => {
      await assert.rejects(service.login({ identifier: "resident", password: "CurrentPassword123!" }), (error) => error.statusCode === 403);
      assert.equal(statements.some(({ sql }) => sql.includes("INSERT INTO sessions")), false);
    });
  });
}

test("reactivation rolls back if the new session cannot be saved", async () => {
  await fixture({ user: { status: "DEACTIVATED", self_deactivated_at: "2026-10-14" }, failSession: true }, async ({ user, audits }) => {
    await assert.rejects(service.login({ identifier: "resident", password: "CurrentPassword123!" }), /session failed/);
    assert.equal(user().status, "DEACTIVATED"); assert.deepEqual(audits(), []);
  });
});

test("deletion schema accepts the exact password and rejects missing or oversized input", () => {
  assert.equal(accountDeletionSchema.parse({ password: " password " }).password, " password ");
  assert.equal(accountDeletionSchema.safeParse({ password: "" }).success, false);
  assert.equal(accountDeletionSchema.safeParse({ password: "a".repeat(256) }).success, false);
  assert.equal(accountDeletionSchema.safeParse({ password: "valid", user_id: "someone-else" }).success, false);
});

test("a self-deactivated resident can recover a forgotten password, then reactivate by signing in", async () => {
  const { createRecoveryCode } = require("./auth.recovery");
  const recovery = createRecoveryCode();
  await fixture({ user: { status: "DEACTIVATED", self_deactivated_at: "2026-10-14", recovery_code_hash: recovery.hash } }, async ({ user }) => {
    await service.recoverPassword({ recovery_code: recovery.code, new_password: "NewPassword123!" });
    assert.equal(user().status, "DEACTIVATED");
    assert.ok(user().self_deactivated_at);
    const result = await service.login({ identifier: "resident", password: "NewPassword123!" });
    assert.equal(result.reactivated, true);
  });
});

for (const user of [{ status: "BANNED", self_deactivated_at: "2026-10-14" }, { status: "DEACTIVATED", self_deactivated_at: null }]) {
  test(`recovery cannot bypass restricted account ${JSON.stringify(user)}`, async () => {
    const { createRecoveryCode } = require("./auth.recovery");
    const recovery = createRecoveryCode();
    await fixture({ user: { ...user, recovery_code_hash: recovery.hash } }, async ({ statements }) => {
      await assert.rejects(service.recoverPassword({ recovery_code: recovery.code, new_password: "NewPassword123!" }), (error) => error.statusCode === 401);
      assert.equal(statements.some(({ sql }) => sql.startsWith("UPDATE")), false);
    });
  });
}
