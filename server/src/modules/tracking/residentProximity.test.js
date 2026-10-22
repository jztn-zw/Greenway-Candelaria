const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../../config/db');
const { checkProximityAndNotify } = require('./tracking.service');
after(() => pool.end());

const pin = (latitude, streetId = 'street') => ({ method: 'MANUAL_PIN', latitude, longitude: 121,
  barangayId: 'brgy', streetId });
const fixture = (residents, overrides = {}) => {
  const receipts = new Set(), inbox = [], queries = [];
  const stop = { id: 'stop', barangay_id: 'brgy', street_id: 'street', location: 'Main Street',
    coverage_path: [[14, 121], [14.03, 121]], ...overrides };
  const context = { run: { id: 'run', status: 'ACTIVE', collection_started_at: 'started' }, notifications: [], db: { query: async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('FROM route_run_stops rs')) return [[stop]];
    if (sql.includes('FROM users u')) return [residents.filter(user => !receipts.has(user.id))];
    if (sql.includes('INSERT INTO route_run_proximity_receipts')) { params[0].forEach(row => receipts.add(row[1])); return [{}]; }
    if (sql.includes('INSERT INTO notifications')) { inbox.push(...params[0]); return [{}]; }
    if (sql.startsWith('UPDATE route_run_stops')) return [{}];
    throw Error(`Unexpected query: ${sql}`);
  } } };
  return { context, inbox, receipts, queries };
};

test('uses each personal pin at 500m, keeps checking after the first resident, and deduplicates after inbox deletion', async () => {
  const f = fixture([{ id: 'near', resident_location: pin(14.00449), barangay_id: 'brgy', street_id: 'street' },
    { id: 'far', resident_location: JSON.stringify(pin(14.00451)), barangay_id: 'brgy', street_id: 'street' }]);
  await checkProximityAndNotify(f.context, 14, 121);
  assert.deepEqual(f.inbox.map(row => row[1]), ['near']);
  f.inbox.length = 0;
  await checkProximityAndNotify(f.context, 14, 121);
  assert.equal(f.inbox.length, 0);
  await checkProximityAndNotify(f.context, 14.0001, 121);
  assert.deepEqual(f.inbox.map(row => row[1]), ['far']);
  const recipientQuery = f.queries.find(q => q.sql.includes('FROM users u'));
  assert.match(recipientQuery.sql, /u\.status = 'ACTIVE'/);
  assert.match(recipientQuery.sql, /u\.deleted_at IS NULL/);
  assert.match(recipientQuery.sql, /u\.street_id = \?/);
  assert.match(recipientQuery.sql, /NOT EXISTS/);
  assert.deepEqual(recipientQuery.params, ['brgy', 'street', 'run']);
  assert.match(f.inbox[0][4], /500 metres/);
  assert.doesNotMatch(f.inbox[0][7], /latitude|longitude/);
});

test('a distant home pin does not inherit street proximity; legacy and invalid pins use the 500m coverage fallback', async () => {
  const f = fixture([
    { id: 'distant', barangay_id: 'brgy', street_id: 'street', resident_location: pin(14.02) },
    { id: 'legacy', resident_location: null },
    { id: 'invalid', resident_location: '{broken' },
    { id: 'stale', barangay_id: 'brgy', street_id: 'street', resident_location: pin(14.02, 'old-street') },
  ]);
  await checkProximityAndNotify(f.context, 14, 121);
  assert.deepEqual(f.inbox.map(row => row[1]), ['legacy', 'invalid', 'stale']);
  const outside = fixture([{ id: 'legacy', resident_location: null }], { coverage_path: [[14.005, 121], [14.006, 121]] });
  await checkProximityAndNotify(outside.context, 14, 121);
  assert.equal(outside.inbox.length, 0);
});

test('personal pins work without legacy stop coordinates; whole barangay targets retain barangay scope', async () => {
  const f = fixture([{ id: 'home', barangay_id: 'brgy', street_id: 'street', resident_location: pin(14) }], { street_id: null, coverage_path: null });
  await checkProximityAndNotify(f.context, 14, 121);
  assert.equal(f.inbox.length, 1);
  assert.deepEqual(f.queries.find(q => q.sql.includes('FROM users u')).params, ['brgy', 'run']);
});

test('paused or ended runs cannot generate approaching alerts', async () => {
  for (const status of ['PAUSED', 'COMPLETED', 'PARTIAL', 'CANCELLED', 'SCHEDULED']) {
    const f = fixture([{ id: 'resident', resident_location: null }]);
    f.context.run.status = status;
    await checkProximityAndNotify(f.context, 14, 121);
    assert.equal(f.queries.length, 0);
  }
});
