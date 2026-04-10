const { registerTrackingSocket } = require("./tracking.socket");

const initSockets = (io) => {
  // Register tracking events
  registerTrackingSocket(io);

  // You can easily add more socket modules here later (e.g., chat, notifications)
};

module.exports = { initSockets };
