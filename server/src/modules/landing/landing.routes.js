const router = require("express").Router();
const controller = require("./landing.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// ── Public Routes ──────────────────────────────────────────
router.get("/", controller.getAll);
router.get("/:section", controller.getBySection);

// ── Admin Routes ───────────────────────────────────────────
router.put(
  "/:section",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.updateSection,
);

router.patch(
  "/:section/visibility",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.toggleVisibility,
);

router.get(
  "/:section/history",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.getHistory,
);

module.exports = router;
