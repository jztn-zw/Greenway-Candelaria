const router = require("express").Router();
const controller = require("./drivers.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

const { messageLimiter, breakdownLimiter, collectorStatusLimiter } = require("../../middleware/rateLimits");
router.get("/me/messages/conversation", authenticate, authorize("DRIVER"), controller.getWebConversation);
router.post("/me/messages/conversation", authenticate, authorize("DRIVER"), messageLimiter, controller.sendWebMessage);
router.get("/:id/messages/conversation", authenticate, authorize("ADMIN"), controller.getWebConversation);
router.post("/:id/messages/conversation", authenticate, authorize("ADMIN"), messageLimiter, controller.sendWebMessage);
router.get("/messages/unread", authenticate, authorize("ADMIN"), controller.getAdminUnreadMessages);
router.put("/:id/messages/conversation/read", authenticate, authorize("ADMIN"), controller.markAdminConversationRead);

// Driver self-routes (must come before /:id)
router.get("/me", authenticate, authorize("DRIVER"), controller.getMe);
router.post("/me/breakdowns", authenticate, authorize("DRIVER"), breakdownLimiter, controller.reportBreakdown);

router.put(
  "/me/status",
  authenticate,
  authorize("DRIVER"),
  collectorStatusLimiter,
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
  messageLimiter,
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
  "/:id/activity/:runId",
  authenticate,
  authorize("ADMIN"),
  controller.getActivityDetail,
);

router.post(
  "/:id/reset-password",
  authenticate,
  authorize("ADMIN"),
  controller.resetPassword,
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

router.put(
  "/:id/account-status",
  authenticate,
  authorize("ADMIN"),
  controller.setAccountStatus,
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.remove,
);

module.exports = router;
