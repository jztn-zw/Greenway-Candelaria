const router = require("express").Router();
const controller = require("./reports.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");
const { uploadReports } = require("../../config/cloudinary");
const { uploadLimiter, reportCreationLimiter } = require("../../middleware/rateLimits");

// Resident — upload report photos to Cloudinary (must be before /:id)
router.post(
  "/upload-photos",
  authenticate,
  uploadLimiter,
  uploadReports.array("photos", 5),
  controller.uploadPhotos,
);

// Resident — get own report stats (must be before /my and /:id)
router.get(
  "/my/stats",
  authenticate,
  authorize("RESIDENT", "ADMIN"),
  controller.getMyStats,
);

// Resident — view own reports (must be before /:id)
router.get(
  "/my",
  authenticate,
  authorize("RESIDENT", "ADMIN"),
  controller.getMyReports,
);

// Resident — view a single owned report (must be before /:id)
router.get(
  "/my/:id",
  authenticate,
  authorize("RESIDENT", "ADMIN"),
  controller.getMyReportById,
);


// Admin — get all reports with filters
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  controller.getAll,
);

// Resident/Admin — submit a report
router.post("/", authenticate, reportCreationLimiter, controller.create);

// Admin — get single report
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.getById,
);

// Admin — update status
router.put(
  "/:id/status",
  authenticate,
  authorize("ADMIN"),
  controller.updateStatus,
);

// Admin — flag as false or duplicate
router.put(
  "/:id/flag",
  authenticate,
  authorize("ADMIN"),
  controller.flagReport,
);

// Admin — update priority
router.put(
  "/:id/priority",
  authenticate,
  authorize("ADMIN"),
  controller.updatePriority,
);

// Admin — internal notes
router.post(
  "/:id/notes",
  authenticate,
  authorize("ADMIN"),
  controller.addNote,
);

router.get(
  "/:id/notes",
  authenticate,
  authorize("ADMIN"),
  controller.getNotes,
);

// Admin — status history
router.get(
  "/:id/history",
  authenticate,
  authorize("ADMIN"),
  controller.getStatusHistory,
);

// Admin or Resident (pending only) — soft-delete report
router.delete(
  "/:id",
  authenticate,
  controller.softDelete,
);

module.exports = router;
