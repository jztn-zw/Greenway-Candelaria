const router = require("express").Router();
const controller = require("./schedule.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Public — residents can view the collection schedule
router.get("/", controller.getAll);

// Admin only — update a specific day's waste type
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.update,
);

// Admin only — reminder settings
router.get(
  "/reminders",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getReminder,
);

router.put(
  "/reminders",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.updateReminder,
);

module.exports = router;
