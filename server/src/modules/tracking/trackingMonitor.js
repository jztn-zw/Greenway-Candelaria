const { notifyStaleGpsRoutes } = require("./tracking.service");

const MONITOR_INTERVAL_MS = 60_000;

const startTrackingMonitor = () => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await notifyStaleGpsRoutes();
    } catch (err) {
      console.error("[Tracking monitor] Stale GPS check failed:", err.message);
    } finally {
      isRunning = false;
    }
  };

  void run();
  return setInterval(run, MONITOR_INTERVAL_MS);
};

module.exports = { startTrackingMonitor };
