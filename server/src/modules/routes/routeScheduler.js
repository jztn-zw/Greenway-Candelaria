const routeService = require("./routes.service");
const {
  broadcastLiveUpdate,
  broadcastRouteUpdate,
} = require("../../sockets/tracking.socket");

const SCHEDULER_INTERVAL_MS = 60 * 1000;

const startRouteScheduler = (io) => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      const activatedRouteIds = await routeService.autoActivateScheduledRoutes();
      if (activatedRouteIds.length > 0) {
        await broadcastLiveUpdate(io);
        broadcastRouteUpdate(io, {
          type: "scheduled-route-activated",
          routeIds: activatedRouteIds,
        });
      }
    } catch (error) {
      console.error("[RouteScheduler] Failed to auto-activate routes:", error);
    } finally {
      isRunning = false;
    }
  };

  void run();
  const timer = setInterval(() => {
    void run();
  }, SCHEDULER_INTERVAL_MS);

  return () => clearInterval(timer);
};

module.exports = { startRouteScheduler };
