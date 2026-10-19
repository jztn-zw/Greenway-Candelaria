const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const requestContext = require('./requestContext');

test('opt-in slow read timings contain route templates but no private URLs or request values', () => {
  const previous = process.env.API_SLOW_READ_MS, original = console.info, logs = [];
  process.env.API_SLOW_READ_MS = '0.000001';
  console.info = value => logs.push(JSON.parse(value));
  try {
    const req = { method: 'GET', route: { path: '/my/:id' }, baseUrl: '/api/reports',
      originalUrl: '/api/reports/my/private-id?search=secret', headers: { Authorization: 'Bearer secret' } };
    const res = Object.assign(new EventEmitter(), { locals: {}, statusCode: 200, setHeader() {} });
    requestContext(req, res, () => {}); res.emit('finish');
    assert.equal(logs.length, 1); assert.equal(logs[0].route, '/my/:id'); assert.equal(logs[0].domain, 'reports');
    assert.equal(typeof logs[0].duration_ms, 'number');
    assert.doesNotMatch(JSON.stringify(logs), /private-id|secret|Bearer|search/);
  } finally { console.info = original; if (previous === undefined) delete process.env.API_SLOW_READ_MS; else process.env.API_SLOW_READ_MS = previous; }
});

test('default request context produces no performance logs', () => {
  const previous = process.env.API_SLOW_READ_MS, original = console.info, logs = [];
  delete process.env.API_SLOW_READ_MS; console.info = value => logs.push(value);
  try {
    const res = Object.assign(new EventEmitter(), { locals: {}, statusCode: 200, setHeader() {} });
    requestContext({ method: 'GET' }, res, () => {}); res.emit('finish');
    assert.equal(logs.length, 0);
  } finally { console.info = original; if (previous !== undefined) process.env.API_SLOW_READ_MS = previous; }
});
