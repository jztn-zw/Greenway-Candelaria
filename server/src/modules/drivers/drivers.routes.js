const router = require("express").Router();
const controller = require("./drivers.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

const rateLimit = require("express-rate-limit");
const messageLimiter = rateLimit({
  windowMs: 60_000, limit: 20, keyGenerator: (req) => req.user.id,
  standardHeaders: "draft-7", legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ success: false, message: "Too many messages. Please wait a minute.", requestId: req.requestId }),
});
router.get("/me/messages/conversation", authenticate, authorize("DRIVER"), controller.getWebConversation);
router.post("/me/messages/conversation", authenticate, authorize("DRIVER"), messageLimiter, controller.sendWebMessage);
router.get("/:id/messages/conversation", authenticate, authorize("ADMIN"), controller.getWebConversation);
router.post("/:id/messages/conversation", authenticate, authorize("ADMIN"), messageLimiter, controller.sendWebMessage);

// Driver self-routes (must come before /:id)
router.get("/me", authenticate, authorize("DRIVER"), controller.getMe);
router.post("/me/breakdowns", authenticate, authorize("DRIVER"), messageLimiter, controller.reportBreakdown);

router.put(
  "/me/status",
  authenticate,
  authorize("DRIVER"),
  messageLimiter,
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
