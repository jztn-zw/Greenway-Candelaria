const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const { updateProfile } = require('./users.service');
const { updateProfileSchema } = require('./users.schema');
after(() => pool.end());
const barangay = '00000000-0000-4000-8000-000000000001';
const street = '00000000-0000-4000-8000-000000000002';
const payload = { barangay_id: barangay, street_id: street,
  resident_location: { method: 'MANUAL_PIN', latitude: 14, longitude: 121 } };

test('profile location contract accepts a complete address and rejects incomplete, null or mixed writes', () => {
  assert.equal(updateProfileSchema.safeParse(payload).success, true);
  for (const data of [{ ...payload, barangay_id: undefined }, { ...payload, street_id: null },
    { ...payload, resident_location: null }, { ...payload, full_name: 'Other' }]) {
    assert.equal(updateProfileSchema.safeParse(data).success, false);
  }
  // Legacy clients and ordinary profile edits keep their existing contract.
  assert.equal(updateProfileSchema.safeParse({ barangay_id: barangay, street_id: street }).success, true);
  assert.equal(updateProfileSchema.safeParse({ full_name: 'Resident' }).success, true);
});

const fixture = async (options, exercise) => {
  const originalQuery = pool.query, originalConnection = pool.getConnection;
  const state = { commits: 0, rollbacks: 0, writes: [], released: false };
  pool.query = async sql => {
    if (sql.includes('FROM users u')) return [[{ id: 'resident', ...payload }]];
    throw Error(`Unexpected nontransactional query: ${sql}`);
  };
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => { state.commits++; },
    rollback: async () => { state.rollbacks++; }, release: () => { state.released = true; },
    query: async (sql, params) => {
      if (sql.includes('FOR SHARE')) throw Object.assign(Error('Shared locks are unsupported by TiDB'), { code: 'ER_NOT_SUPPORTED_YET' });
      if (sql.includes('FROM users')) return [options.unavailable ? [] : [{ id: 'resident', role: options.role || 'RESIDENT' }]];
      if (sql.includes('FROM barangay_streets')) {
        assert.match(sql, /FOR UPDATE$/);
        return [options.missingStreet ? [] : [{ id: street, barangay_id: barangay,
          coverage_path: [[14, 121], [14.001, 121]], coverage_edit: { mode: 'ROAD', points: [[14, 121], [14.001, 121]] } }]];
      }
      if (sql.startsWith('UPDATE users') || sql.includes('INSERT INTO user_settings')) {
        state.writes.push({ sql, params });
        if (options.failSettings && sql.includes('user_settings')) throw Error('settings failed');
        return [{ affectedRows: 1 }];
      }
      throw Error(`Unexpected query: ${sql}`);
    },
  });
  try { await exercise(state); } finally { pool.query = originalQuery; pool.getConnection = originalConnection; }
};

test('saves the validated pin, street, barangay and settings in a single transaction', async () => {
  await fixture({}, async state => {
    const result = await updateProfile('resident', payload);
    assert.equal(result.id, 'resident');
    assert.equal(state.commits, 1); assert.equal(state.rollbacks, 0); assert.equal(state.released, true);
    assert.equal(state.writes.length, 2);
    assert.match(state.writes[0].sql, /barangay_id = \?, street_id = \?, resident_location = \?/);
    assert.deepEqual(JSON.parse(state.writes[0].params[2]), { ...payload.resident_location, barangayId: barangay, streetId: street });
    assert.match(state.writes[1].sql, /primary_barangay_id/);
  });
});
test('rejects invalid coverage or wrong barangay/street without writing the address', async () => {
  for (const missingStreet of [false, true]) await fixture({ missingStreet }, async state => {
    await assert.rejects(updateProfile('resident', { ...payload, resident_location: { ...payload.resident_location, latitude: 15 } }), error => error.statusCode === 400);
    assert.equal(state.writes.length, 0); assert.equal(state.commits, 0); assert.equal(state.rollbacks, 1);
  });
});
test('settings failure rolls back the whole address save', async () => {
  await fixture({ failSettings: true }, async state => {
    await assert.rejects(updateProfile('resident', payload), /settings failed/);
    assert.equal(state.commits, 0); assert.equal(state.rollbacks, 1); assert.equal(state.released, true);
  });
});
test('inactive/deleted accounts and other roles cannot write resident pins', async () => {
  for (const options of [{ unavailable: true }, { role: 'ADMIN' }, { role: 'DRIVER' }]) await fixture(options, async state => {
    await assert.rejects(updateProfile('resident', payload), error => error.statusCode === 403);
    assert.equal(state.writes.length, 0); assert.equal(state.rollbacks, 1);
  });
});
