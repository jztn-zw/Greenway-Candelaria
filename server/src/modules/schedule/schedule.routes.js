const router = require("express").Router();
const jwt = require("jsonwebtoken");
const controller = require("./schedule.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");
const { pool } = require("../../config/db");

// Optional auth: identifies user if token provided, but allows public access
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [users] = await pool.query(
        "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
        [decoded.id],
      );
      if (users.length > 0) {
        req.user = users[0];
      }
    }
  } catch (err) {
    req.user = null;
  }
  next();
};

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

// ─── Legacy 7-Day Collection Schedule & Reminders ──────────
router.get("/reminders", authenticate, authorize("ADMIN"), controller.getReminder);
router.put("/reminders", authenticate, authorize("ADMIN"), controller.updateReminder);
router.get("/", controller.getAll);
router.put("/:id", authenticate, authorize("ADMIN"), controller.update);

module.exports = router;
