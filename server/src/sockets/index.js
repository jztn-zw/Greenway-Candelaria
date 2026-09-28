const { registerCollectorChangesSocket } = require("./collectorChanges.socket");
const { registerResidentChangesSocket } = require("./residentChanges.socket");
const { registerTrackingSocket } = require("./tracking.socket");
const { registerNotificationsSocket } = require("./notifications.socket");
const { registerAdminChangesSocket } = require("./adminChanges.socket");

const initSockets = (io) => {
  registerAdminChangesSocket(io);
  registerResidentChangesSocket(io);
  registerCollectorChangesSocket(io);
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
