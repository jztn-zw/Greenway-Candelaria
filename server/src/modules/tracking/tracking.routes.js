const router = require("express").Router();
const controller = require("./tracking.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Live locations contain sensitive operational data. All implemented roles can
// consume the feed, but anonymous clients cannot.
router.get("/road-route", controller.getRoadRoute);

router.get(
  "/live",
  authenticate,
  authorize("ADMIN", "RESIDENT", "DRIVER"),
  controller.getLive,
);

router.get(
  "/admin/overview",
  authenticate,
  authorize("ADMIN"),
  controller.getAdminOverview,
);

// Driver — send location ping
router.post("/ping", authenticate, authorize("DRIVER"), controller.ping);

// Admin — view and clear truck history
router.get(
  "/:truckId/history",
  authenticate,
  authorize("ADMIN"),
  controller.getHistory,
);

router.delete(
  "/:truckId/history",
  authenticate,
  authorize("ADMIN"),
  controller.clearHistory,
);

module.exports = router;
