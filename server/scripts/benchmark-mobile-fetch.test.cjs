const { test } = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('./benchmark-mobile-fetch.cjs');

test('public probes perform bounded GET reads and print only safe timing summaries', async () => {
  const calls = [], output = [];
  await run({ BENCHMARK_BASE_URL: 'https://fixture.invalid', BENCHMARK_SAMPLES: '2' }, async (url, config) => {
    calls.push({ url, config }); return { status: 200, arrayBuffer: async () => Buffer.from('private fixture body') };
  }, value => output.push(value));
  assert.equal(calls.length, 4); assert.equal(output.length, 2);
  assert.ok(calls.every(call => call.config.method === undefined && !call.config.headers.Authorization));
  assert.equal(output.join('').includes('private fixture body'), false);
});

test('optional authenticated page probes never log tokens, response data or request URLs', async () => {
  const output = [], calls = [];
  await run({ BENCHMARK_BASE_URL: 'https://fixture.invalid', BENCHMARK_SAMPLES: '1', BENCHMARK_RESIDENT_TOKEN: 'fixture-token' }, async (url, config) => {
    calls.push({ url, config }); return { status: 200, arrayBuffer: async () => Buffer.from('private resident record') };
  }, value => output.push(value));
  assert.ok(calls.some(call => call.config.headers.Authorization === 'Bearer fixture-token'));
  assert.ok(output.some(value => value.includes('resident:calendar')));
  assert.doesNotMatch(output.join(''), /fixture-token|private resident record|https:|Bearer/);
});
