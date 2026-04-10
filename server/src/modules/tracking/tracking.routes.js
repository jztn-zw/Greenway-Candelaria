const router = require("express").Router();
const controller = require("./tracking.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Public — anyone can see live truck locations
router.get("/live", controller.getLive);

// Driver — send location ping
router.post("/ping", authenticate, authorize("DRIVER"), controller.ping);

// Admin — view and clear truck history
router.get(
  "/:truckId/history",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getHistory,
);

router.delete(
  "/:truckId/history",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.clearHistory,
);

module.exports = router;
