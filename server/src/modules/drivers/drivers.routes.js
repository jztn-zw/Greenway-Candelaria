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

router.get(
  "/me/history",
  authenticate,
  authorize("DRIVER"),
  controller.getMyHistory,
);

// Admin route: persist admin -> driver message in driver_messages
router.post(
  "/messages",
  authenticate,
  authorize("ADMIN"),
  controller.sendMessageToDriver,
);

// Admin routes
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  controller.getAll,
);

router.get(
  "/:id/activity",
  authenticate,
  authorize("ADMIN"),
  controller.getActivityLog,
);

router.get(
  "/:id/messages",
  authenticate,
  authorize("ADMIN"),
  controller.getMessagesForAdmin,
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.getById,
);

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

router.put(
  "/:id/assign-truck",
  authenticate,
  authorize("ADMIN"),
  controller.assignTruck,
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.remove,
);

module.exports = router;
