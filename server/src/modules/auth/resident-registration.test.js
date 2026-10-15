const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { createHash } = require('node:crypto');
const { pool } = require('../../config/db');
const service = require('./auth.service');
const { registerSchema, recoverySchema } = require('./auth.schema');
after(() => pool.end());

const registration = { full_name: 'Test Resident', username: 'resident', password: 'Password123!', barangay_id: '11111111-1111-4111-8111-111111111111' };
const code = '0123-4567-89AB-CDEF-0123-4567-89AB-CDEF';
const codeHash = createHash('sha256').update(code.replaceAll('-', '')).digest('hex');

test('regular signup accepts missing contacts and rejects invalid provided email', () => {
  assert.equal(registerSchema.parse(registration).email, null);
  assert.equal(registerSchema.parse({ ...registration, email: '   ' }).email, null);
  assert.equal(registerSchema.parse({ ...registration, email: ' Resident@Example.test ' }).email, 'resident@example.test');
  assert.throws(() => registerSchema.parse({ ...registration, email: 'invalid' }));
});

test('recovery enforces the existing password change byte limit', () => {
  const password = 'é'.repeat(40);
  assert.equal(recoverySchema.safeParse({ recovery_code: code, new_password: password, confirm_password: password }).success, false);
});

test('signup stores NULL email, a hashed recovery code, and allows shared contact phones', async () => {
  const original = pool.query;
  let inserted;
  pool.query = async (sql, params) => {
    if (sql.includes('INSERT INTO users')) { inserted = params; assert.match(sql, /recovery_code_hash/); return [{ affectedRows: 1 }]; }
    if (sql.includes('FROM barangays')) return [[{ id: registration.barangay_id }]];
    assert.doesNotMatch(sql, /WHERE phone/);
    return [[]];
  };
  try {
    const result = await service.register({ ...registration, phone: '+639123456789' });
    assert.equal(inserted[3], null);
    assert.equal(result.email, null);
    assert.match(result.recovery_code, /^[A-F0-9]{4}(?:-[A-F0-9]{4}){7}$/);
    const hash = createHash('sha256').update(result.recovery_code.replaceAll('-', '')).digest('hex');
    assert.ok(inserted.includes(hash));
    assert.ok(!inserted.includes(result.recovery_code));
    assert.equal(Object.hasOwn(result, 'recovery_code_hash'), false);
  } finally { pool.query = original; }
});

const withRecoveryDb = async (flags, run) => {
  const original = pool.getConnection;
  const state = { user: { id: 'resident', username: 'resident', role: 'RESIDENT', status: 'ACTIVE', deleted_at: null, recovery_code_hash: codeHash, ...flags }, sessions: 2, calls: [], committed: false, rolledBack: false, released: false };
  let snapshot;
  pool.getConnection = async () => ({
    beginTransaction: async () => { snapshot = { user: { ...state.user }, sessions: state.sessions }; },
    query: async (sql, params) => {
      state.calls.push({ sql, params });
      if (sql.startsWith('SELECT')) return [flags.missing || params[0] !== state.user.recovery_code_hash ? [] : flags.duplicate ? [state.user, { ...state.user, id: 'other' }] : [state.user]];
      if (sql.startsWith('UPDATE users')) { state.user.password = params[0]; state.user.recovery_code_hash = params[1]; return [{ affectedRows: 1 }]; }
      if (sql.startsWith('DELETE FROM sessions')) { if (flags.failRevoke) throw new Error('fixture failure'); state.sessions = 0; return [{ affectedRows: 2 }]; }
      throw new Error('Unexpected SQL');
    },
    commit: async () => { state.committed = true; },
    rollback: async () => { state.rolledBack = true; state.user = snapshot.user; state.sessions = snapshot.sessions; },
    release: () => { state.released = true; },
  });
  try { await run(state); } finally { pool.getConnection = original; }
};

test('recovery changes password, rotates the code and revokes every session atomically', async () => {
  await withRecoveryDb({}, async state => {
    const result = await service.recoverPassword({ recovery_code: code.toLowerCase(), new_password: 'NewPassword123!' });
    assert.equal(await bcrypt.compare('NewPassword123!', state.user.password), true);
    assert.equal(state.sessions, 0);
    assert.ok(state.committed && state.released);
    assert.match(state.calls[0].sql, /WHERE recovery_code_hash = \? LIMIT 2 FOR UPDATE/);
    assert.deepEqual(state.calls[0].params, [codeHash]);
    assert.notEqual(result.recovery_code, code);
    assert.equal(Object.hasOwn(result, 'token'), false);
    await assert.rejects(service.recoverPassword({ recovery_code: code, new_password: 'NextPassword123!' }), error => error.statusCode === 401);
  });
});

test('recovery rejects wrong codes and unavailable accounts without mutations', async () => {
  for (const flags of [{ missing: true }, { duplicate: true }, { recovery_code_hash: null }, { recovery_code_hash: '0'.repeat(64) }, { status: 'BANNED' }, { status: 'DEACTIVATED' }, { deleted_at: '2026-01-01' }]) {
    await withRecoveryDb(flags, async state => {
      await assert.rejects(service.recoverPassword({ recovery_code: code, new_password: 'NewPassword123!' }), error => error.statusCode === 401);
      assert.equal(state.calls.filter(call => !call.sql.startsWith('SELECT')).length, 0);
      assert.ok(state.rolledBack && state.released);
    });
  }
});

test('public recovery validates confirmation, rejects form posts and does not cache secrets', async () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/auth', require('./auth.routes'));
  app.use(require('../../middleware/errorHandler'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/auth`;
  try {
    const result = await fetch(`${base}/recover`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recovery_code: code, new_password: 'NewPassword123!', confirm_password: 'DifferentPassword!' }) });
    assert.equal(result.status, 400);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    const form = await fetch(`${base}/recover`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'identifier=resident' });
    assert.equal(form.status, 415);
    const anonymous = await fetch(`${base}/recovery-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'Password123!' }) });
    assert.equal(anonymous.status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('failed session revocation rolls password and code back', async () => {
  await withRecoveryDb({ failRevoke: true }, async state => {
    await assert.rejects(service.recoverPassword({ recovery_code: code, new_password: 'NewPassword123!' }));
    assert.equal(state.user.password, undefined);
    assert.equal(state.user.recovery_code_hash, codeHash);
    assert.equal(state.sessions, 2);
    assert.ok(state.rolledBack && !state.committed && state.released);
  });
});

test('replacing a recovery code requires the authenticated account password', async () => {
  const original = pool.query;
  let updated = false;
  const password = await bcrypt.hash('Password123!', 4);
  pool.query = async sql => sql.startsWith('SELECT') ? [[{ id: 'resident', password, status: 'ACTIVE', deleted_at: null }]] : (updated = true, [{ affectedRows: 1 }]);
  try {
    await assert.rejects(service.replaceRecoveryCode('resident', 'wrong'), error => error.statusCode === 401);
    assert.equal(updated, false);
    const result = await service.replaceRecoveryCode('resident', 'Password123!');
    assert.ok(updated);
    assert.match(result.recovery_code, /^[A-F0-9-]{39}$/);
  } finally { pool.query = original; }
});

test('recovery needs only a valid code and matching passwords', () => {
  const payload = { recovery_code: code.toLowerCase(), new_password: 'NewPassword123!', confirm_password: 'NewPassword123!' };
  const parsed = recoverySchema.safeParse(payload);
  assert.equal(parsed.success, true);
  assert.equal(Object.hasOwn(parsed.data, 'identifier'), false);
  for (const recovery_code of ['old-code', '', '0000', 'G'.repeat(32)])
    assert.equal(recoverySchema.safeParse({ ...payload, recovery_code }).success, false);
});
