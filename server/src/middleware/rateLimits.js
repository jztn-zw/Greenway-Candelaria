const rateLimit = require("express-rate-limit");

const sendLimitResponse = (req, res) =>
  res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
    requestId: req.requestId,
  });

const sharedOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: sendLimitResponse,
};

// Authentication is public and the most common brute-force target. Successful
// requests do not count, so normal sign-in and registration behavior is unchanged.
const authLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
});

// Limit expensive multipart uploads without limiting GPS pings or normal API use.
const uploadLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000,
  max: 30,
});

// A resident can still make many genuine reports, but this prevents rapid spam.
const reportCreationLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60 * 1000,
  max: 20,
});

module.exports = { authLimiter, uploadLimiter, reportCreationLimiter };
