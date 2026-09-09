const router = require("express").Router();
const controller = require("./routes.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// ── NEW: Specific routes MUST go BEFORE /:id routes ──
router.get(
  "/today/mine",
  authenticate,
  authorize("DRIVER"),
  controller.getMyRouteToday,
);

router.get("/today", authenticate, controller.getAllRoutesToday);

router.get(
  "/missed-collections",
  authenticate,
  authorize("ADMIN"),
  controller.getMissedCollections,
);

// ── EXISTING ROUTES BELOW ──

// Public — residents and drivers can view routes
router.get("/", controller.getAll);
router.get("/:id", controller.getById);

// Driver / Admin — mark stop progress
router.put(
  "/:id/stops/:stopId/status",
  authenticate,
  authorize("DRIVER", "ADMIN"),
  controller.updateStopStatus,
);

// Driver / Admin — end their route (marks all remaining stops as MISSED)
router.put(
  "/:id/end",
  authenticate,
  authorize("DRIVER", "ADMIN"),
  controller.endRoute,
);

router.put(
  "/:id/pause",
  authenticate,
  authorize("DRIVER"),
  controller.setRoutePaused,
);

router.put(
  "/:id/start",
  authenticate,
  authorize("DRIVER"),
  controller.startRoute,
);

// Admin only
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.remove,
);

module.exports = router;
