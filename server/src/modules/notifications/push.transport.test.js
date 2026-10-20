const { test } = require('node:test');
const assert = require('node:assert/strict');
const { expoRequest, withPushSlot } = require('./push.transport');

test('broadcasts limit concurrent provider operations and release slots after failure', async () => {
  let running = 0, peak = 0;
  const finish = [];
  const operations = Array.from({ length: 12 }, (_, i) => withPushSlot(async () => {
    running++; peak = Math.max(peak, running);
    await new Promise(resolve => finish.push(resolve));
    running--;
    if (i === 0) throw Error('fixture failure');
  }).catch(() => {}));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(running, 6);
  while (finish.length) { finish.splice(0).forEach(resolve => resolve()); await new Promise(resolve => setImmediate(resolve)); }
  await Promise.all(operations);
  assert.equal(peak, 6); assert.equal(running, 0);
});

test('provider failures distinguish retryable network/throttling errors from permanent credential/payload errors', async () => {
  const original = global.fetch;
  try {
    for (const status of [400, 401, 403, 429, 500, 503]) {
      global.fetch = async () => ({ ok: false, status });
      await assert.rejects(expoRequest('send', []), error => error.retryable === (status === 429 || status >= 500));
    }
    global.fetch = async () => { throw Error('private network diagnostics'); };
    await assert.rejects(expoRequest('send', []), error => error.retryable === true && !error.message.includes('private'));
  } finally { global.fetch = original; }
});
