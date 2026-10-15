const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { createHmac, randomBytes } = require("node:crypto");
const { recordRateLimit } = require("./rateLimitAudit");
const hashKey = randomBytes(32);
const minute = 60_000;
const accountKey = (req) => req.user.id;
const ipKey = (req) => ipKeyGenerator(req.ip);
const credentialKey = (req) => {
  const identifier = typeof req.body?.identifier === "string" ? req.body.identifier.trim().toLowerCase() : "";
  // Keep attempted identities and passwords out of counter keys and audit logs.
  return `${ipKey(req)}:${createHmac("sha256", hashKey).update(identifier).digest("hex")}`;
};

// Separate stores prevent one type of activity from exhausting another's quota.
// Counters are process-local; multiple API instances require a shared store.
const createLimiter = (policy, { windowMs, limit, keyGenerator = accountKey, ...options }) => rateLimit({
  windowMs, limit, keyGenerator, ...options,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfterSeconds = Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000));
    recordRateLimit(req, policy, retryAfterSeconds);
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      success: false, code: "RATE_LIMITED", retryAfterSeconds,
      message: `Too many requests. Try again in ${retryAfterSeconds} seconds.`,
      requestId: req.requestId,
    });
  },
});

const loginBurstLimiter = createLimiter("login-burst", { windowMs: minute, limit: 60, keyGenerator: ipKey });
const loginIpLimiter = createLimiter("login-ip", { windowMs: 15 * minute, limit: 100, keyGenerator: ipKey, skipSuccessfulRequests: true });
const loginLimiter = createLimiter("login", { windowMs: 15 * minute, limit: 10, keyGenerator: credentialKey, skipSuccessfulRequests: true });
const registrationLimiter = createLimiter("registration", { windowMs: 60 * minute, limit: 20, keyGenerator: ipKey });
const recoveryIpLimiter = createLimiter("recovery-ip", { windowMs: 15 * minute, limit: 20, keyGenerator: ipKey });
const recoveryLimiter = createLimiter("recovery", { windowMs: 15 * minute, limit: 5, keyGenerator: ipKey });
const recoveryCodeLimiter = createLimiter("recovery-code", { windowMs: 15 * minute, limit: 5 });
const accountDeletionLimiter = createLimiter("account-deletion", { windowMs: 15 * minute, limit: 5 });
const passwordChangeLimiter = createLimiter("password-change", { windowMs: 15 * minute, limit: 10 });
const profileWriteLimiter = createLimiter("profile", { windowMs: minute, limit: 30 });
const settingsWriteLimiter = createLimiter("settings", { windowMs: minute, limit: 60 });
const uploadLimiter = createLimiter("uploads", { windowMs: 15 * minute, limit: 30 });
const reportBurstLimiter = createLimiter("report-burst", { windowMs: minute, limit: 3 });
const reportCreationLimiter = createLimiter("reports", { windowMs: 60 * minute, limit: 20 });
const messageLimiter = createLimiter("messages", { windowMs: minute, limit: 20 });
const breakdownLimiter = createLimiter("breakdowns", { windowMs: minute, limit: 5 });
const collectorStatusLimiter = createLimiter("collector-status", { windowMs: minute, limit: 30 });

module.exports = {
  createLimiter, loginBurstLimiter, loginIpLimiter, loginLimiter, registrationLimiter,
  recoveryIpLimiter, recoveryLimiter, recoveryCodeLimiter, passwordChangeLimiter, accountDeletionLimiter,
  profileWriteLimiter, settingsWriteLimiter, uploadLimiter, reportBurstLimiter,
  reportCreationLimiter, messageLimiter, breakdownLimiter, collectorStatusLimiter,
};
