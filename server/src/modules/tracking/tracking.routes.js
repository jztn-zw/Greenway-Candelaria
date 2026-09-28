const router = require("express").Router();
const controller = require("./tracking.controller");
const authenticate = require("../../middleware/auth");
const rateLimit = require("express-rate-limit");
const trackingLimiter = (limit) => rateLimit({
  windowMs: 60000, limit, standardHeaders: "draft-7", legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
});
const readLimit = trackingLimiter(120);
const pingLimit = trackingLimiter(30);
const roadLimit = trackingLimiter(60);
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
