const { randomUUID } = require("crypto");

// Give every API request a safe correlation ID. It contains no user data and
// lets browser-console output be matched to the corresponding server log.
const requestContext = (req, res, next) => {
  req.requestId = randomUUID();
  res.locals.requestId = req.requestId;
  res.setHeader("X-Request-ID", req.requestId);
  next();
};

module.exports = requestContext;
