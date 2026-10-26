const { getIO } = require("./notifications.socket");
const { getHandshakeToken } = require("./socketAuth");
const hashSessionToken = require("../utils/hashSessionToken");

// A revocation notice contains no account data. Match only the credentials that
// were removed by the committed login, never a user-selected room or user ID.
const emitSessionsReplaced = async (previousTokens) => {
  if (!previousTokens.length) return;
  const io = getIO();
  if (!io) return;
  try {
    const revoked = new Set(previousTokens);
    const sockets = await io.fetchSockets();
    for (const socket of sockets) {
      const token = getHandshakeToken(socket);
      if (token && (revoked.has(hashSessionToken(token)) || revoked.has(token))) {
        socket.emit("session:replaced", { code: "SESSION_REPLACED" });
        socket.disconnect(true);
      }
    }
  } catch {
    // The authenticated session-check endpoint reconciles missed deliveries.
  }
};

module.exports = { emitSessionsReplaced };
