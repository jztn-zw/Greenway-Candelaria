const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./users.service");
const { updateStatusSchema } = require("./users.schema");
const jwt = require("jsonwebtoken");
const authenticate = require("../../middleware/auth");
const { authenticateSocketUser } = require("../../sockets/socketAuth");
const bcrypt = require("bcryptjs");
const authService = require("../auth/auth.service");

after(() => pool.end());

const withAccount = async (options, run) => {
  const previous = { ...options.user };
  let account = { ...previous };
  let sessions = ["existing-session"];
  let snapshot;
  const statements = [];
  const state = { committed: false, rolledBack: false, released: false };
  const originalQuery = pool.query;
  const originalConnection = pool.getConnection;
  pool.query = async (sql) => {
    assert.match(sql, /SELECT/);
    if (sql.includes("FROM sessions")) return [sessions.length ? [{ ...account }] : []];
    return [[{ ...account }]];
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => { snapshot = { account: { ...account }, sessions: [...sessions] }; },
    query: async (sql, params) => {
      statements.push({ sql, params });
      if (sql.includes("FOR UPDATE")) return [[{ ...account }]];
      if (sql.startsWith("UPDATE users")) { account.status = params[0]; account.ban_reason = params[1]; }
      if (sql.startsWith("DELETE FROM sessions")) {
        if (options.failRevocation) throw new Error("session write failed");
        sessions = [];
      }
      if (sql.includes("INSERT INTO audit_logs") && options.failAudit) throw new Error("audit write failed");
      return [{ affectedRows: 1 }];
    },
    commit: async () => { state.committed = true; },
    rollback: async () => { state.rolledBack = true; account = snapshot.account; sessions = snapshot.sessions; },
    release: () => { state.released = true; },
  });
  try { await run({ statements, state, account: () => account, sessions: () => sessions }); }
  finally { pool.query = originalQuery; pool.getConnection = originalConnection; }
};

const resident = { id: "resident", role: "RESIDENT", status: "ACTIVE", full_name: "Test Resident", ban_reason: null };

test("bans a resident with a trimmed reason and revokes sessions in the same transaction as the audit", async () => {
  await withAccount({ user: resident }, async ({ statements, state, sessions }) => {
    const updated = await service.updateStatus("resident", { status: "BANNED", ban_reason: "  Repeated abusive reports  " }, "admin", "test-ip");
    assert.equal(updated.status, "BANNED");
    assert.equal(updated.ban_reason, "Repeated abusive reports");
    assert.deepEqual(sessions(), []);
    assert.equal(state.committed, true);
    assert.equal(state.released, true);
    const audit = statements.find(({ sql }) => sql.includes("INSERT INTO audit_logs"));
    assert.equal(audit.params[2], "BAN_USER");
    assert.equal(JSON.parse(audit.params[6]).ban_reason, "Repeated abusive reports");
    assert.equal(statements.some(({ sql }) => /DELETE FROM (users|reports)/.test(sql)), false);
  });
});

test("unbanning clears the reason without restoring revoked sessions", async () => {
  await withAccount({ user: { ...resident, status: "BANNED", ban_reason: "Previous reason" } }, async ({ statements, state }) => {
    const updated = await service.updateStatus("resident", { status: "ACTIVE", ban_reason: "Ignored" }, "admin");
    assert.equal(updated.status, "ACTIVE");
    assert.equal(updated.ban_reason, null);
    assert.equal(state.committed, true);
    const audit = statements.find(({ sql }) => sql.includes("INSERT INTO audit_logs"));
    assert.equal(audit.params[2], "UNBAN_USER");
    assert.equal(JSON.parse(audit.params[5]).ban_reason, "Previous reason");
    assert.equal(statements.some(({ sql }) => /INSERT INTO sessions/.test(sql)), false);
  });
});

for (const requestedStatus of ["ACTIVE", "DEACTIVATED", "BANNED"]) {
  test(`admin cannot change a deactivated resident to ${requestedStatus}`, async () => {
    await withAccount({ user: { ...resident, status: "DEACTIVATED" } }, async ({ account, statements }) => {
      await assert.rejects(service.updateStatus("resident", { status: requestedStatus, ban_reason: "Reason" }, "admin"),
        (error) => [400, 409].includes(error.statusCode));
      assert.equal(account().status, "DEACTIVATED");
      assert.equal(statements.some(({ sql }) => sql.startsWith("UPDATE")), false);
    });
  });
}

test("admin cannot deactivate an active resident through the API", async () => {
  await withAccount({ user: resident }, async ({ account }) => {
    await assert.rejects(service.updateStatus("resident", { status: "DEACTIVATED" }, "admin"), (error) => error.statusCode === 400);
    assert.equal(account().status, "ACTIVE");
  });
});

for (const failure of ["failRevocation", "failAudit"]) {
  test(`ban rolls back status and sessions on ${failure}`, async () => {
    await withAccount({ user: resident, [failure]: true }, async ({ account, state, sessions }) => {
      await assert.rejects(service.updateStatus("resident", { status: "BANNED", ban_reason: "Abuse" }, "admin"), /write failed/);
      assert.equal(account().status, "ACTIVE");
      assert.deepEqual(sessions(), ["existing-session"]);
      assert.deepEqual(state, { committed: false, rolledBack: true, released: true });
    });
  });
}

test("retrying a ban preserves its original reason and does not duplicate the audit", async () => {
  await withAccount({ user: { ...resident, status: "BANNED", ban_reason: "Original reason" } }, async ({ statements }) => {
    const updated = await service.updateStatus("resident", { status: "BANNED", ban_reason: "Repeated request" }, "admin");
    assert.equal(updated.ban_reason, "Original reason");
    assert.equal(statements.some(({ sql }) => sql.startsWith("UPDATE") || sql.includes("INSERT INTO audit_logs")), false);
  });
});

test("other account types retain their existing administrative deactivation behavior", async () => {
  await withAccount({ user: { ...resident, id: "collector", role: "DRIVER" } }, async ({ sessions }) => {
    const updated = await service.updateStatus("collector", { status: "DEACTIVATED" }, "admin");
    assert.equal(updated.status, "DEACTIVATED");
    assert.deepEqual(sessions(), []);
  });
});

test("a ban blocks HTTP and realtime access, and unbanning cannot revive the old session", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-ban-session-secret";
  const token = jwt.sign({ id: "resident" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const socket = { handshake: { auth: { token } } };
  const httpAccess = async () => {
    let statusCode = 200; let forwarded = false;
    const response = { status(code) { statusCode = code; return this; }, json() { return this; } };
    await authenticate({ headers: { authorization: `Bearer ${token}` }, baseUrl: "/api/users" }, response, () => { forwarded = true; });
    return { statusCode, forwarded };
  };
  try {
    await withAccount({ user: resident }, async () => {
      assert.deepEqual(await httpAccess(), { statusCode: 200, forwarded: true });
      assert.equal((await authenticateSocketUser(socket)).id, "resident");
      await service.updateStatus("resident", { status: "BANNED", ban_reason: "Abuse" }, "admin");
      assert.deepEqual(await httpAccess(), { statusCode: 401, forwarded: false });
      assert.equal(await authenticateSocketUser(socket), null);
      await service.updateStatus("resident", { status: "ACTIVE" }, "admin");
      assert.deepEqual(await httpAccess(), { statusCode: 401, forwarded: false });
      assert.equal(await authenticateSocketUser(socket), null);
    });
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("ban reasons are required, trimmed, and limited to the database field length", () => {
  for (const reason of [undefined, "", "   ", "a".repeat(256)]) {
    assert.equal(updateStatusSchema.safeParse({ status: "BANNED", ban_reason: reason }).success, false);
  }
  assert.equal(updateStatusSchema.parse({ status: "BANNED", ban_reason: "  Abuse  " }).ban_reason, "Abuse");
  assert.equal(updateStatusSchema.safeParse({ status: "ACTIVE" }).success, true);
  assert.equal(updateStatusSchema.safeParse({ status: "DEACTIVATED" }).success, true);
});

test("a login already checking credentials cannot create a session after a ban commits", async () => {
  const originalCompare = bcrypt.compare;
  let resume; let comparing;
  const started = new Promise((resolve) => { comparing = resolve; });
  bcrypt.compare = async () => { comparing(); await new Promise((resolve) => { resume = resolve; }); return true; };
  try {
    await withAccount({ user: resident }, async ({ sessions, statements }) => {
      const login = authService.login({ identifier: "resident", password: "TestPassword123!" });
      const denied = assert.rejects(login, (error) => error.statusCode === 403);
      await started;
      await service.updateStatus("resident", { status: "BANNED", ban_reason: "Abuse" }, "admin");
      resume();
      await denied;
      assert.deepEqual(sessions(), []);
      assert.equal(statements.some(({ sql }) => sql.includes("INSERT INTO sessions")), false);
    });
  } finally { resume?.(); bcrypt.compare = originalCompare; }
});
