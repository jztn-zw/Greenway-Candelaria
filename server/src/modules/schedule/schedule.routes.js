const router = require("express").Router();
const controller = require("./schedule.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");
const optionalAuth = require("../../middleware/optionalAuth");

// ─── Centralized Calendar Events ───────────────────────────

// Read events (Strict backend visibility: Admins see all, Residents see only PUBLIC)
router.get("/events", optionalAuth, controller.getEvents);
router.get("/events/:id", optionalAuth, controller.getEventById);

// Admin-only event management
router.post(
  "/events",
  authenticate,
  authorize("ADMIN"),
  controller.createEvent,
);

router.put(
  "/events/:id",
  authenticate,
  authorize("ADMIN"),
  controller.updateEvent,
);

router.delete(
  "/events/:id",
  authenticate,
  authorize("ADMIN"),
  controller.deleteEvent,
);

// ─── Route-derived collection schedule & reminders ─────────
router.get("/reminders", authenticate, authorize("ADMIN"), controller.getReminder);
router.put("/reminders", authenticate, authorize("ADMIN"), controller.updateReminder);
router.get("/", authenticate, authorize("RESIDENT"), controller.getAll);

module.exports = router;
