// Limit provider work across broadcasts; inbox writes never wait for these slots.
let active = 0;
const waiting = [];
async function withPushSlot(operation) {
  if (active >= 6) await new Promise(resolve => waiting.push(resolve));
  else active++;
  try { return await operation(); }
  finally { const next = waiting.shift(); if (next) next(); else active--; }
}

async function expoRequest(path, payload) {
  let response;
  try {
    response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_PUSH_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}` } : {}) },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
    });
  } catch { throw Object.assign(new Error('Push provider connection failed'), { retryable: true }); }
  if (!response.ok) throw Object.assign(new Error('Push provider unavailable'), {
    retryable: response.status === 429 || response.status >= 500,
    retryAfter: Math.min(30000, Math.max(0, Number(response.headers?.get('retry-after')) * 1000 || 0)),
  });
  return (await response.json()).data;
}
const waitForPushRetry = (attempt, error) => new Promise(resolve => setTimeout(resolve,
  Math.max(error?.retryAfter || 0, 1000 * 2 ** attempt + Math.floor(Math.random() * 250))));

module.exports = { withPushSlot, expoRequest, waitForPushRetry };
