const { registerTrackingSocket } = require("./tracking.socket");
const { registerNotificationsSocket } = require("./notifications.socket");

const initSockets = (io) => {
  try {
    registerTrackingSocket(io);
  } catch (err) {
    console.error("[Socket] ❌ Failed to initialize Tracking socket:", err.message);
  }

  try {
    registerNotificationsSocket(io);
  } catch (err) {
    console.error("[Socket] ❌ Failed to initialize Notifications socket:", err.message);
  }
};

module.exports = { initSockets };
