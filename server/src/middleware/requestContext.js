const { randomUUID } = require("crypto");

// Give every API request a safe correlation ID. It contains no user data and
// lets browser-console output be matched to the corresponding server log.
const requestContext = (req, res, next) => {
  req.requestId = randomUUID();
  res.locals.requestId = req.requestId;
  res.setHeader("X-Request-ID", req.requestId);
  const threshold = Number(process.env.API_SLOW_READ_MS);
  if (req.method === 'GET' && Number.isFinite(threshold) && threshold > 0) {
    const started = process.hrtime.bigint();
    res.once('finish', () => {
      const duration = Number(process.hrtime.bigint() - started) / 1e6;
      if (duration < threshold) return;
      // Only known domain names and Express route templates; never raw URLs,
      // query strings, IDs, SQL, payloads, authorization or user/session details.
      const candidate = String(req.baseUrl || '').split('/')[2];
      const domains = ['auth', 'users', 'reports', 'posts', 'schedule', 'notifications', 'tracking', 'routes', 'drivers', 'barangays'];
      console.info(JSON.stringify({ event: 'slow_api_read', request_id: req.requestId,
        domain: domains.includes(candidate) ? candidate : 'other',
        route: typeof req.route?.path === 'string' ? req.route.path : 'unmatched',
        status: res.statusCode, duration_ms: Math.round(duration * 100) / 100,
      }));
    });
  }
  next();
};

module.exports = requestContext;
