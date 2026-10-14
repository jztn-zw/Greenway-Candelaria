const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const { registerSchema, residentSetupSchema, loginSchema } = require('./auth.schema');
const service = require('./auth.service');
after(() => pool.end());

const signup = { username: 'resident_2026', password: 'Password123!', confirm_password: 'Password123!', terms_accepted: true };
test('username signup needs no contacts or profile and rejects invalid names/password confirmation', () => {
  assert.equal(registerSchema.parse(signup).username, signup.username);
  for (const change of [{ username: 'Resident Name' }, { username: 'resident@example.test' }, { confirm_password: 'different' }, { terms_accepted: false }])
    assert.equal(registerSchema.safeParse({ ...signup, ...change }).success, false);
});
test('username signup reserves the name immediately and returns a recovery code', async () => {
  const original = pool.query;
  let inserted;
  pool.query = async (sql, params) => {
    if (sql.startsWith('SELECT')) return [[]];
    if (sql.includes('INSERT INTO users')) { inserted = params; return [{ affectedRows: 1 }]; }
    throw new Error('Unexpected fixture query');
  };
  try {
    const result = await service.register(signup);
    assert.equal(result.username, signup.username); assert.equal(result.email, null);
    assert.equal(result.profile_completed, false); assert.ok(result.recovery_code);
    assert.equal(inserted[2], signup.username); assert.equal(inserted[1], null);
  } finally { pool.query = original; }
});
test('incomplete username signup still checks uniqueness', async () => {
  const original = pool.query;
  pool.query = async () => [[{ id: 'existing' }]];
  try { await assert.rejects(service.register(signup), error => error.statusCode === 409 && error.field === 'username'); }
  finally { pool.query = original; }
});
test('setup contacts are optional and validated only when supplied', () => {
  const setup = { full_name: 'Test Resident', barangay_id: '11111111-1111-4111-8111-111111111111' };
  assert.equal(residentSetupSchema.safeParse(setup).success, true);
  assert.equal(residentSetupSchema.safeParse({ ...setup, email: 'invalid' }).success, false);
  assert.equal(residentSetupSchema.safeParse({ ...setup, phone: '+6391234' }).success, false);
  assert.equal(residentSetupSchema.parse({ ...setup, email: ' Resident@Example.test ' }).email, 'resident@example.test');
});
test('setup accepts only the existing profile avatars', () => {
  const setup = { full_name: 'Test Resident', barangay_id: '11111111-1111-4111-8111-111111111111' };
  assert.equal(residentSetupSchema.safeParse({ ...setup, avatar_url: '/profile-avatars/avatar-7.png' }).success, true);
  for (const avatar_url of ['/profile-avatars/avatar-11.png', 'https://example.test/photo.png', '/other.png'])
    assert.equal(residentSetupSchema.safeParse({ ...setup, avatar_url }).success, false);
});
test('updated username login rejects email while a separate transition accepts it', () => {
  assert.equal(loginSchema.safeParse({ identifier: 'resident@example.test', password: 'Password123!', login_mode: 'username' }).success, false);
  assert.equal(loginSchema.safeParse({ identifier: 'resident@example.test', password: 'Password123!', login_mode: 'legacy-setup' }).success, true);
});
test('setup preserves the signup username and saves optional contacts atomically', async () => {
  const original = pool.getConnection;
  const calls = [];
  const data = { full_name: 'Test Resident', barangay_id: '11111111-1111-4111-8111-111111111111', street_id: '22222222-2222-4222-8222-222222222222', email: null, phone: null, avatar_url: '/profile-avatars/avatar-7.png' };
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => calls.push('commit'), rollback: async () => calls.push('rollback'), release: () => {},
    query: async (sql, params) => {
      if (sql.includes('FOR UPDATE')) return [[{ role: 'RESIDENT', status: 'ACTIVE', profile_completed: 0, username: 'reserved_name', email: null }]];
      if (sql.includes('FROM barangays')) return [[{ id: data.barangay_id, collection_service_available: 0 }]];
      if (sql.includes('FROM barangay_streets')) return [[{ id: data.street_id }]];
      if (sql.includes('UPDATE users')) { calls.push(params); return [{ affectedRows: 1 }]; }
      if (sql.includes('user_settings')) return [{ affectedRows: 1 }];
      throw new Error('Unexpected fixture query');
    },
  });
  try {
    const { completeResidentProfile } = require('./auth.setup');
    await completeResidentProfile('resident', data);
    assert.equal(calls[0][1], 'reserved_name'); assert.equal(calls[0][2], null); assert.equal(calls[0][5], null);
    assert.equal(calls[0][6], data.avatar_url);
    assert.equal(calls[1], 'commit');
    calls.length = 0;
    await assert.rejects(completeResidentProfile('resident', { ...data, username: 'replacement' }), error => error.statusCode === 400);
    assert.deepEqual(calls, ['rollback']);
  } finally { pool.getConnection = original; }
});
test('username mode queries only usernames; email transition is restricted to unfinished residents without a username', async () => {
  const original = pool.query;
  const queries = [];
  pool.query = async (sql, params) => { queries.push({ sql, params }); return [[]]; };
  try {
    for (const login_mode of ['username', 'legacy-setup'])
      await assert.rejects(service.login({ identifier: login_mode === 'username' ? 'resident' : 'old@example.test', password: 'Password123!', login_mode }), error => error.statusCode === 401);
    const username = queries.find(query => query.sql.includes('WHERE u.username'));
    assert.ok(username); assert.equal(username.params.length, 1);
    const transition = queries.find(query => query.sql.includes('WHERE u.email'));
    assert.match(transition.sql, /u.role = 'RESIDENT'/); assert.match(transition.sql, /u.username IS NULL/); assert.match(transition.sql, /u.profile_completed = 0/);
  } finally { pool.query = original; }
});
