const { test } = require('node:test');
const assert = require('node:assert/strict');
const { residentLocationSchema, validateResidentLocation, savedStreetPoints } = require('./residentLocation');

const street = { id: 'street', barangay_id: 'brgy', coverage_path: [[13.93, 121.42], [13.93, 121.43]],
  coverage_edit: { mode: 'ROAD', points: [[13.93, 121.42], [13.93, 121.43]] } };
const pin = { method: 'MANUAL_PIN', latitude: 13.9301, longitude: 121.425 };
test('validates the whole street line and preserves an off-road home point', () => {
  const value = validateResidentLocation(pin, street);
  assert.equal(value.latitude, pin.latitude);
  assert.equal(value.longitude, pin.longitude);
  assert.equal(value.streetId, street.id);
  assert.equal(value.barangayId, street.barangay_id);
  assert.equal(validateResidentLocation(null, street), null);
});
test('rejects invalid, distant, missing and malformed street geometry', () => {
  for (const value of [{ ...pin, latitude: 91 }, { ...pin, latitude: 14.5 }, { ...pin, longitude: NaN }]) {
    assert.throws(() => validateResidentLocation(value, street));
  }
  for (const path of [null, '{', [[13.93, 121.42]], [[13.93, 121.42], [null, 121.43]]]) {
    assert.throws(() => validateResidentLocation(pin, { ...street, coverage_path: path }));
  }
});
test('accepts only current saved controls, never arbitrary path vertices', () => {
  const selected = { method: 'STREET_POINT', latitude: 13.93, longitude: 121.42, pointIndex: 0 };
  assert.equal(validateResidentLocation(selected, street).pointIndex, 0);
  for (const change of [{ pointIndex: 1 }, { longitude: 121.425 }, { pointIndex: 2 }]) {
    assert.throws(() => validateResidentLocation({ ...selected, ...change }, street));
  }
  assert.deepEqual(savedStreetPoints(null), []);
  assert.deepEqual(savedStreetPoints({ mode: 'MANUAL', points: street.coverage_path }), []);
  assert.deepEqual(savedStreetPoints(JSON.stringify(street.coverage_edit)), street.coverage_edit.points);
});
test('GPS requires accuracy and capture time; other methods reject GPS metadata', () => {
  const gps = { ...pin, method: 'CURRENT_LOCATION', accuracyMeters: 20, capturedAt: new Date().toISOString() };
  assert.ok(residentLocationSchema.safeParse(gps).success);
  assert.throws(() => validateResidentLocation({ ...gps, accuracyMeters: 213 }, street), error => error.statusCode === 400 && /not accurate enough/.test(error.message));
  for (const value of [{ ...gps, accuracyMeters: undefined }, { ...gps, capturedAt: 'yesterday' },
    { ...pin, capturedAt: gps.capturedAt }, { ...pin, pointIndex: 0 }, { ...gps, method: 'OTHER' }]) {
    assert.equal(residentLocationSchema.safeParse(value).success, false);
  }
});
