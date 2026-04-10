const router = require("express").Router();
const controller = require("./barangays.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Public - used by register dropdown
router.get("/", controller.getAll);

// Admin overview - optimized single payload for Barangay Manager
router.get(
  "/admin/overview",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getAdminOverview,
);

// Public - used by report form
router.get("/:id", controller.getById);

// Admin only
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.update,
);

router.get(
  "/:id/stats",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getStats,
);

module.exports = router;
