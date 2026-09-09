const { createHash } = require("crypto");

// Sessions are bearer credentials. Store only a one-way hash so a database
// export cannot be used directly as an authenticated session token.
const hashSessionToken = (token) =>
  createHash("sha256").update(String(token)).digest("hex");

module.exports = hashSessionToken;
