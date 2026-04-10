const router = require("express").Router();
const controller = require("./users.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Resident routes
router.get("/profile", authenticate, controller.getProfile);
router.put("/profile", authenticate, controller.updateProfile);
router.put("/change-password", authenticate, controller.changePassword);

// Admin routes
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getAll,
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getById,
);

router.put(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.updateStatus,
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.softDelete,
);

router.get(
  "/:id/reports",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getReportHistory,
);

module.exports = router;
