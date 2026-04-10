const router = require("express").Router();
const controller = require("./reports.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Resident — view own reports (must be before /:id)
router.get(
  "/my",
  authenticate,
  authorize("RESIDENT", "ADMIN", "SUPER_ADMIN"),
  controller.getMyReports,
);

// Admin — get all reports with filters
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getAll,
);

// Resident/Admin — submit a report
router.post("/", authenticate, controller.create);

// Admin — get single report
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getById,
);

// Admin — update status
router.put(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.updateStatus,
);

// Admin — flag as false or duplicate
router.put(
  "/:id/flag",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.flagReport,
);

// Admin — update priority
router.put(
  "/:id/priority",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.updatePriority,
);

// Admin — internal notes
router.post(
  "/:id/notes",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.addNote,
);

router.get(
  "/:id/notes",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getNotes,
);

// Admin — status history
router.get(
  "/:id/history",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getStatusHistory,
);

module.exports = router;
