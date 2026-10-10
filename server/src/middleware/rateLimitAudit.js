const audit = require("../modules/audit/audit.service");
const pending = new Map();
let flushing = false;

// Bound both memory and database work under floods of distinct IPs/accounts.
// Summaries are best-effort; a process restart can lose the current minute.
const recordRateLimit = (req, policy, retryAfterSeconds) => {
  let key = JSON.stringify([policy, req.user?.id || null, req.ip]);
  const overflow = !pending.has(key) && pending.size >= 200;
  if (overflow) key = "overflow";
  const now = new Date().toISOString();
  if (!pending.has(key)) pending.set(key, {
    user_id: overflow ? null : req.user?.id || null,
    action: "RATE_LIMITED", module: "auth",
    ip_address: overflow ? null : req.ip,
    new_value: {
      policy: overflow ? "overflow" : policy, blocked_count: 0,
      first_blocked_at: now, last_blocked_at: now, retry_after_seconds: retryAfterSeconds,
    },
  });
  const entry = pending.get(key);
  entry.new_value.blocked_count++;
  entry.new_value.last_blocked_at = now;
  entry.new_value.retry_after_seconds = retryAfterSeconds;
};

const flushRateLimitAudit = async () => {
  if (flushing || pending.size === 0) return;
  flushing = true;
  const entries = [...pending.values()];
  pending.clear();
  try { for (const entry of entries) await audit.log(entry); }
  finally { flushing = false; }
};
setInterval(() => void flushRateLimitAudit(), 60_000).unref();
module.exports = { recordRateLimit, flushRateLimitAudit };
