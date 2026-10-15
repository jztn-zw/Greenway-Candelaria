const { after, test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");
const service = require("./auth.service");
process.env.JWT_SECRET = "fixture-only-secret";
const { createHash } = require("node:crypto");
const originalConnection = pool.getConnection;
beforeEach(() => { pool.getConnection = async () => ({
  beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
  query: (sql, params) => pool.query(sql.replace("FROM users WHERE", "FROM users u WHERE"), params),
}); });
afterEach(() => { pool.getConnection = originalConnection; });
after(() => pool.end());

test("login includes the resident street used by tracking without exposing credentials", async () => {
  const original = { query: pool.query, sign: jwt.sign };
  const resident = { id: "resident", role: "RESIDENT", status: "ACTIVE", password: await bcrypt.hash("Password123!", 4), street_id: "street", street_name: "Main Street", street_area: "North", barangay_id: "barangay" };
  const queries = [];
  pool.query = async (sql, params) => { queries.push({ sql, params }); return sql.includes("FROM users u") ? [[resident]] : [{ affectedRows: 1 }]; };
  jwt.sign = () => "fixture-token";
  try {
    const { user } = await service.login({ identifier: "resident", password: "Password123!" });
    assert.equal(user.street_id, "street"); assert.equal(user.street_name, "Main Street"); assert.equal(user.street_area, "North");
    assert.equal(Object.hasOwn(user, "password"), false);
    assert.ok(queries.some(({ sql }) => sql.includes("FOR UPDATE")));
    assert.equal(queries.find(({ sql }) => sql.includes("INSERT INTO sessions")).params[2], createHash("sha256").update("fixture-token").digest("hex"));
  } finally { pool.query = original.query; jwt.sign = original.sign; }
});

test("session issuance rolls back and releases its connection if insertion fails", async () => {
  const original = { query: pool.query, sign: jwt.sign };
  const resident = { id: 'resident', role: 'RESIDENT', status: 'ACTIVE', password: await bcrypt.hash('Password123!', 4) };
  const calls = [];
  pool.query = async () => [[resident]];
  pool.getConnection = async () => ({
    beginTransaction: async () => { calls.push('begin'); },
    query: async sql => { if (sql.startsWith('SELECT')) return [[resident]]; throw new Error('fixture insert failure'); },
    commit: async () => { calls.push('commit'); }, rollback: async () => { calls.push('rollback'); }, release: () => { calls.push('release'); },
  });
  jwt.sign = () => 'fixture-token';
  try {
    await assert.rejects(service.login({ identifier: 'resident', password: 'Password123!' }), /fixture insert failure/);
    assert.deepEqual(calls, ['begin', 'rollback', 'release']);
  } finally { pool.query = original.query; jwt.sign = original.sign; }
});

test("an old-password login cannot issue a session after recovery commits", async () => {
  const original = { query: pool.query, compare: bcrypt.compare };
  const code = '0123-4567-89AB-CDEF-0123-4567-89AB-CDEF';
  const resident = { id: 'resident', role: 'RESIDENT', status: 'ACTIVE', deleted_at: null,
    password: await bcrypt.hash('OldPassword123!', 4), recovery_code_hash: createHash('sha256').update(code.replaceAll('-', '')).digest('hex') };
  let sessions = 0;
  let resume;
  let reached;
  const gate = new Promise(resolve => { resume = resolve; });
  const comparing = new Promise(resolve => { reached = resolve; });
  bcrypt.compare = async (...args) => { reached(); await gate; return original.compare(...args); };
  const query = async (sql, params) => {
    if (sql.startsWith('SELECT')) return [[{ ...resident }]];
    if (sql.includes('UPDATE users SET password')) { resident.password = params[0]; resident.recovery_code_hash = params[1]; }
    if (sql.includes('DELETE FROM sessions')) sessions = 0;
    if (sql.includes('INSERT INTO sessions')) sessions++;
    return [{ affectedRows: 1 }];
  };
  pool.query = query;
  pool.getConnection = async () => ({ query, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {} });
  try {
    const login = service.login({ identifier: 'resident', password: 'OldPassword123!' });
    const rejected = assert.rejects(login, error => error.statusCode === 401);
    await comparing;
    await service.recoverPassword({ recovery_code: code, new_password: 'NewPassword123!' });
    resume();
    await rejected;
    assert.equal(sessions, 0);
  } finally { resume(); pool.query = original.query; bcrypt.compare = original.compare; }
});

test("banned login reveals the restriction only after the correct password", async () => {
  const original = { query: pool.query, log: auditService.log };
  const account = { id: "resident", role: "RESIDENT", status: "BANNED", password: await bcrypt.hash("Password123!", 4) };
  pool.query = async () => [[account]];
  auditService.log = async () => {};
  try {
    await assert.rejects(
      service.login({ identifier: "resident", password: "WrongPassword123!" }),
      error => error.statusCode === 401 && error.message === "Invalid username or password",
    );
    await assert.rejects(
      service.login({ identifier: "resident", password: "Password123!" }),
      error => error.statusCode === 403 && error.message === "Your account is currently restricted. Please contact MENRO for assistance.",
    );
  } finally { pool.query = original.query; auditService.log = original.log; }
});
