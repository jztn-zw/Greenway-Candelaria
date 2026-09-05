const router = require("express").Router();
const controller = require("./announcements.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Announcement content is account-scoped so barangay-targeted notices cannot leak.
router.get(
  "/list/all",
  authenticate,
  authorize("ADMIN"),
  controller.getBarangayList,
);

router.get("/", authenticate, controller.getAll);
router.get("/:id", authenticate, controller.getById);

// Admin — create, update, delete
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

// Resident — mark as read
router.post("/:id/read", authenticate, controller.markAsRead);

// Admin — view who read the announcement
router.get(
  "/:id/receipts",
  authenticate,
  authorize("ADMIN"),
  controller.getReceipts,
);

module.exports = router;
