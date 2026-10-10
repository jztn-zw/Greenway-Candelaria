const router = require("express").Router();
const controller = require("./tracking.controller");
const authenticate = require("../../middleware/auth");
const { createLimiter } = require("../../middleware/rateLimits");
const readLimit = createLimiter("tracking-read", { windowMs: 60_000, limit: 120 });
const pingLimit = createLimiter("gps", { windowMs: 60_000, limit: 30 });
const roadLimit = createLimiter("road-routing", { windowMs: 60_000, limit: 60 });
router.use(authenticate);
const authorize = require("../../middleware/role");

// Live locations contain sensitive operational data. All implemented roles can
// consume the feed, but anonymous clients cannot.
router.get(
  "/road-route",
  authorize("ADMIN", "RESIDENT", "DRIVER"),
  roadLimit,
  controller.getRoadRoute,
);

router.get(
  "/live",
  authorize("ADMIN", "RESIDENT", "DRIVER"),
  readLimit,
  controller.getLive,
);

router.post("/street-coverage-route", authorize("ADMIN"), roadLimit, controller.getStreetCoverageRoute);

router.get(
  "/admin/overview",
  authorize("ADMIN"),
  controller.getAdminOverview,
);

// Driver — send location ping
router.post("/ping", authorize("DRIVER"), pingLimit, controller.ping);

// Admin — view and clear truck history
router.get(
  "/:truckId/history",
  authorize("ADMIN"),
  readLimit,
  controller.getHistory,
);

router.delete(
  "/:truckId/history",
  authorize("ADMIN"),
  controller.clearHistory,
);

module.exports = router;
