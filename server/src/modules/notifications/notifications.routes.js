const router = require("express").Router();
const controller = require("./notifications.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// ⚠️ Specific routes MUST come before /:id
const push = require('./push.service');
const { success } = require('../../utils/apiResponse');
router.put('/push-device', authenticate, authorize('DRIVER', 'RESIDENT'), async (req, res, next) => {
  try { return success(res, await push.register(req.user, req.token, req.body), 'Mobile notification settings saved'); }
  catch (err) { next(err); }
});
router.delete('/push-device', authenticate, authorize('DRIVER', 'RESIDENT'), async (req, res, next) => {
  try { return success(res, await push.unregister(req.user, req.token, req.body), 'Mobile device removed'); }
  catch (err) { next(err); }
});

// Get my notifications
router.get("/", authenticate, controller.getMyNotifications);

// Get unread count
router.get("/unread-count", authenticate, controller.getUnreadCount);

// Mark ALL as read (before /:id or Express catches 'read-all' as an id)
router.put("/read-all", authenticate, controller.markAllAsRead);

// Clear all notifications
router.delete("/clear", authenticate, controller.clearAll);

// Admin — manually send notifications to specific users
router.post(
  "/send",
  authenticate,
  authorize("ADMIN"),
  controller.sendNotification,
);

// Mark one as read
router.put("/:id/read", authenticate, controller.markAsRead);

// Delete one
router.delete("/:id", authenticate, controller.deleteOne);

module.exports = router;
