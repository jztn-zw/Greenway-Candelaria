const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const { completeResidentProfile } = require('./auth.setup');
const { residentSetupSchema } = require('./auth.schema');
after(() => pool.end());
const street = { id: '22222222-2222-4222-8222-222222222222', barangay_id: '11111111-1111-4111-8111-111111111111',
  coverage_path: [[13.93, 121.42], [13.93, 121.43]], coverage_edit: { mode: 'ROAD', points: [[13.93, 121.42], [13.93, 121.43]] } };
const input = { full_name: 'Test Resident', username: 'resident', barangay_id: street.barangay_id, street_id: street.id,
  resident_location: { method: 'MANUAL_PIN', latitude: 13.9301, longitude: 121.425 } };
test('website setup requires location while existing mobile setup contracts remain compatible', () => {
  for (const resident_location of [null, undefined]) {
    const result = residentSetupSchema.safeParse({ ...input, location_required: true, resident_location });
    assert.equal(result.success, false);
    assert.ok(result.error.issues.some(issue => issue.path[0] === 'resident_location'));
  }
  assert.equal(residentSetupSchema.safeParse({ ...input, location_required: true }).success, true);
  assert.equal(residentSetupSchema.safeParse({ ...input, resident_location: undefined }).success, true);
});
for (const scenario of ['success', 'location write failure', 'settings failure', 'changed controls', 'repeated setup', 'missing selected street']) {
  test(`location setup: ${scenario} preserves atomic completion and existing street scope`, async () => {
    const original = pool.getConnection;
    const calls = []; let saved;
    pool.getConnection = async () => ({
      beginTransaction: async () => calls.push('begin'), rollback: async () => calls.push('rollback'),
      commit: async () => calls.push('commit'), release: () => calls.push('release'),
      query: async (sql, params) => {
        if (sql.includes('FOR SHARE')) throw Object.assign(Error('Shared locks are unsupported by TiDB'), { code: 'ER_NOT_SUPPORTED_YET' });
        if (sql.includes('FROM users') && sql.includes('FOR UPDATE')) return [[{ role: 'RESIDENT', status: 'ACTIVE', profile_completed: scenario === 'repeated setup' ? 1 : 0 }]];
        if (sql.includes('FROM barangays')) return [[{ id: street.barangay_id }]];
        if (sql.includes('FROM barangay_streets') && sql.includes('coverage_path')) {
          assert.match(sql, /FOR UPDATE$/);
          assert.deepEqual(params, [street.id, street.barangay_id]);
          return [scenario === 'missing selected street' ? [] : [street]];
        }
        if (sql.includes('FROM barangay_streets')) return [[{ id: street.id }]];
        if (sql.startsWith('UPDATE users SET resident_location')) {
          calls.push('location'); saved = JSON.parse(params[0]);
          if (scenario === 'location write failure') throw new Error('fixture location failure');
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE users')) { calls.push('profile'); assert.equal(params[3], street.barangay_id); assert.equal(params[4], street.id); return [{ affectedRows: 1 }]; }
        if (sql.includes('user_settings')) { calls.push('settings'); if (scenario === 'settings failure') throw new Error('fixture settings failure'); return [{ affectedRows: 1 }]; }
        throw new Error('Unexpected fixture query');
      },
    });
    try {
      const value = scenario === 'changed controls' ? { ...input, resident_location: { method: 'STREET_POINT', latitude: 13.93, longitude: 121.425, pointIndex: 0 } } : input;
      if (['success', 'repeated setup'].includes(scenario)) {
        await completeResidentProfile('resident', residentSetupSchema.parse(value));
        assert.equal(calls.includes('commit'), true);
        assert.equal(calls.includes('rollback'), false);
        if (scenario === 'success') assert.deepEqual(saved, { ...input.resident_location, streetId: street.id, barangayId: street.barangay_id });
        else assert.deepEqual(calls, ['begin', 'commit', 'release']);
      } else {
        await assert.rejects(completeResidentProfile('resident', value));
        assert.equal(calls.includes('commit'), false); assert.equal(calls.includes('rollback'), true);
        if (['changed controls', 'missing selected street'].includes(scenario)) assert.equal(calls.includes('profile'), false);
      }
      assert.equal(calls.at(-1), 'release');
    } finally { pool.getConnection = original; }
  });
}
