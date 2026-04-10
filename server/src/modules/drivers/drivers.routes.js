const router = require("express").Router();
const controller = require("./drivers.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Driver self-routes (must come before /:id)
router.get("/me", authenticate, authorize("DRIVER"), controller.getMe);

router.put(
  "/me/status",
  authenticate,
  authorize("DRIVER"),
  controller.updateMyStatus,
);

router.get(
  "/me/messages",
  authenticate,
  authorize("DRIVER"),
  controller.getMyMessages,
);

router.put(
  "/me/messages/read",
  authenticate,
  authorize("DRIVER"),
  controller.markMyMessagesAsRead,
);

// Admin route: persist admin -> driver message in driver_messages
router.post(
  "/messages",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.sendMessageToDriver,
);

// Admin routes
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getAll,
);

router.get(
  "/:id/activity",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getActivityLog,
);

router.get(
  "/:id/messages",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getMessagesForAdmin,
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getById,
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.update,
);

router.put(
  "/:id/assign-truck",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.assignTruck,
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.remove,
);

module.exports = router;
