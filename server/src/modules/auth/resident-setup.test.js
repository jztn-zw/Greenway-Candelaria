const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const { registerSchema, residentSetupSchema } = require('./auth.schema');
const service = require('./auth.service');
after(() => pool.end());
const signup = { email: ' Resident@Example.test ', password: 'Password123!', confirm_password: 'Password123!', terms_accepted: true };

test('minimal signup requires email, matching passwords and accepted terms', () => {
  assert.equal(registerSchema.parse(signup).email, 'resident@example.test');
  for (const change of [{ email: '' }, { confirm_password: 'different' }, { terms_accepted: false }]) {
    assert.throws(() => registerSchema.parse({ ...signup, ...change }));
  }
  const invalid = registerSchema.safeParse({ ...signup, email: 'invalid' });
  assert.equal(invalid.success, false);
  assert.ok(invalid.error.issues.some(issue => issue.path[0] === 'email'));
});

test('minimal signup creates an incomplete account without invented profile details', async () => {
  const original = pool.query;
  let insert;
  pool.query = async (sql, params) => {
    if (sql.startsWith('SELECT')) return [[]];
    if (sql.includes('INSERT INTO users')) { insert = { sql, params }; return [{ affectedRows: 1 }]; }
    throw new Error('Unexpected query');
  };
  try {
    const result = await service.register(signup);
    assert.equal(result.email, 'resident@example.test');
    assert.equal(result.profile_completed, false);
    assert.equal(insert.params[1], null);
    assert.equal(insert.params[2], null);
    assert.match(insert.sql, /profile_completed/);
  } finally { pool.query = original; }
});

const setup = { full_name: 'Test Resident', username: 'resident', phone: '+639123456789', barangay_id: '11111111-1111-4111-8111-111111111111', street_id: '22222222-2222-4222-8222-222222222222' };
test('resident setup requires a Philippine contact phone and normalizes whitespace', () => {
  for (const phone of [undefined, null, '', '   ', '+638123456789', '+6391234', '09123456789']) {
    const result = residentSetupSchema.safeParse({ ...setup, phone });
    assert.equal(result.success, false);
    assert.ok(result.error.issues.some(issue => issue.path[0] === 'phone'));
  }
  assert.equal(residentSetupSchema.parse({ ...setup, phone: ' +639123456789 ' }).phone, setup.phone);
});
test('setup is atomic, validates street ownership and marks completion only after saving', async () => {
  const original = pool.getConnection;
  const originalQuery = pool.query;
  const calls = [];
  let badStreet = true;
  pool.getConnection = async () => ({
    beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'), release: () => calls.push('release'),
    query: async (sql, params) => {
      if (sql.includes('FOR UPDATE')) return [[{ role: 'RESIDENT', status: 'ACTIVE', profile_completed: 0 }]];
      if (sql.includes('FROM barangays')) return [[{ id: setup.barangay_id, collection_service_available: 1 }]];
      if (sql.includes('FROM barangay_streets')) return [badStreet ? [] : [{ id: setup.street_id }]];
      if (sql.includes('UPDATE users')) { calls.push('saved'); assert.equal(params[0], 'Test Resident'); assert.equal(params[2], setup.phone); return [{ affectedRows: 1 }]; }
      if (sql.includes('user_settings')) { calls.push('settings'); return [{ affectedRows: 1 }]; }
      throw new Error(`Unexpected query ${sql}`);
    },
  });
  pool.query = async () => [[{ id: 'resident', ...setup, role: 'RESIDENT', profile_completed: 1 }]];
  try {
    await assert.rejects(service.completeResidentProfile('resident', setup), error => error.statusCode === 400);
    assert.deepEqual(calls, ['begin', 'rollback', 'release']);
    calls.length = 0; badStreet = false;
    assert.equal((await service.completeResidentProfile('resident', setup)).profile_completed, true);
    assert.deepEqual(calls, ['begin', 'saved', 'settings', 'commit', 'release']);
  } finally { pool.getConnection = original; pool.query = originalQuery; }
});

test('pending residents cannot read collection HTTP or realtime data but can resume setup', async () => {
  const jwt = require('jsonwebtoken');
  const authenticate = require('../../middleware/auth');
  const { authenticateSocketUser } = require('../../sockets/socketAuth');
  const original = pool.query;
  process.env.JWT_SECRET = 'setup-fixture-secret';
  const token = jwt.sign({ id: 'resident' }, process.env.JWT_SECRET);
  pool.query = async sql => sql.includes('FROM sessions') && !sql.includes('JOIN users')
    ? [[{ user_id: 'resident' }]] : [[{ id: 'resident', role: 'RESIDENT', status: 'ACTIVE', profile_completed: 0 }]];
  const res = { status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  try {
    let allowed = false;
    await authenticate({ headers: { authorization: `Bearer ${token}` }, baseUrl: '/api/tracking', path: '/live' }, res, () => { allowed = true; });
    assert.equal(allowed, false); assert.equal(res.statusCode, 403);
    await authenticate({ headers: { authorization: `Bearer ${token}` }, baseUrl: '/api/auth', path: '/me' }, res, () => { allowed = true; });
    assert.equal(allowed, true);
    assert.equal(await authenticateSocketUser({ handshake: { auth: { token } } }), null);
  } finally { pool.query = original; }
});

test('login returns the completed profile when setup commits after credential lookup', async () => {
  const bcrypt = require('bcryptjs');
  const original = { query: pool.query, connection: pool.getConnection };
  process.env.JWT_SECRET = 'setup-login-fixture';
  const password = await bcrypt.hash('Password123!', 4);
  const current = { id: 'resident', role: 'RESIDENT', status: 'ACTIVE', password, profile_completed: 1, full_name: 'Test Resident', username: 'resident', barangay_id: setup.barangay_id, street_id: setup.street_id };
  pool.query = async sql => [[sql.includes('(u.email =') ? { ...current, profile_completed: 0, full_name: null, username: null, barangay_id: null, street_id: null } : current]];
  pool.getConnection = async () => ({ beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async sql => sql.startsWith('SELECT') ? [[current]] : [{ affectedRows: 1 }] });
  try {
    const result = await service.login({ identifier: 'resident@example.test', password: 'Password123!' });
    assert.equal(result.user.profile_completed, true);
    assert.equal(result.user.full_name, 'Test Resident');
    assert.equal(result.user.street_id, setup.street_id);
  } finally { pool.query = original.query; pool.getConnection = original.connection; }
});

for (const scenario of ['duplicate username', 'settings failure', 'missing street', 'blocked account', 'wrong role', 'repeat completed setup']) {
  test(`setup handles ${scenario} without partial or repeated profile changes`, async () => {
    const original = { connection: pool.getConnection, query: pool.query };
    const calls = [];
    pool.getConnection = async () => ({
      beginTransaction: async () => calls.push('begin'), rollback: async () => calls.push('rollback'), commit: async () => calls.push('commit'), release: () => calls.push('release'),
      query: async sql => {
        if (sql.includes('FOR UPDATE')) return [[{ role: scenario === 'wrong role' ? 'ADMIN' : 'RESIDENT', status: scenario === 'blocked account' ? 'BANNED' : 'ACTIVE', profile_completed: scenario === 'repeat completed setup' ? 1 : 0 }]];
        if (sql.includes('FROM barangays')) return [[{ collection_service_available: 1 }]];
        if (sql.includes('FROM barangay_streets')) return [[{ id: setup.street_id }]];
        if (sql.includes('UPDATE users')) {
          calls.push('update');
          if (scenario === 'duplicate username') throw Object.assign(new Error('fixture duplicate'), { code: 'ER_DUP_ENTRY' });
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('user_settings')) throw new Error('fixture settings failure');
        throw new Error('Unexpected query');
      },
    });
    pool.query = async () => [[{ id: 'resident', profile_completed: 1, role: 'RESIDENT' }]];
    try {
      if (scenario === 'repeat completed setup') {
        assert.equal((await service.completeResidentProfile('resident', setup)).profile_completed, true);
        assert.deepEqual(calls, ['begin', 'commit', 'release']);
      } else {
        await assert.rejects(service.completeResidentProfile('resident', { ...setup, street_id: scenario === 'missing street' ? null : setup.street_id }), error =>
          scenario === 'duplicate username' ? error.statusCode === 409 : scenario === 'settings failure' ? error.message === 'fixture settings failure' : [400, 403].includes(error.statusCode));
        assert.ok(calls.includes('rollback'));
        assert.ok(!calls.includes('commit'));
        assert.equal(calls.at(-1), 'release');
      }
    } finally { pool.getConnection = original.connection; pool.query = original.query; }
  });
}
