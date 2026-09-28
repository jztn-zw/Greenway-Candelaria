const { notifyStaleGpsRoutes, pruneTrackingHistory } = require("./tracking.service");
const { finalizeCompletedRoutes } = require("../routes/routes.service");

const MONITOR_INTERVAL_MS = 60_000;

const startTrackingMonitor = (io) => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      // Resolve terminal routes before looking for stale GPS. A completed
      // route must never be treated as a truck with a lost GPS signal.
      const ended = await finalizeCompletedRoutes();
      if (ended.length) {
        const { broadcastLiveUpdate, broadcastRouteUpdate } = require("../../sockets/tracking.socket");
        broadcastLiveUpdate(io);
        broadcastRouteUpdate(io);
      }
      await notifyStaleGpsRoutes();
      await pruneTrackingHistory();
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
