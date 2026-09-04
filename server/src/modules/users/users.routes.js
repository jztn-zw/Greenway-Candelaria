const router = require("express").Router();
const controller = require("./users.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");
const { uploadAvatar } = require("../../config/cloudinary");

// Resident routes
router.get("/profile", authenticate, controller.getProfile);
router.put("/profile", authenticate, controller.updateProfile);
router.put("/change-password", authenticate, controller.changePassword);
router.post("/avatar", authenticate, uploadAvatar.single("avatar"), controller.uploadAvatar);
router.get("/settings", authenticate, controller.getSettings);
router.put("/settings", authenticate, controller.updateSettings);


// Admin routes
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  controller.getAll,
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.getById,
);

router.put(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  controller.updateStatus,
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.softDelete,
);

router.get(
  "/:id/reports",
  authenticate,
  authorize("ADMIN"),
  controller.getReportHistory,
);

module.exports = router;
