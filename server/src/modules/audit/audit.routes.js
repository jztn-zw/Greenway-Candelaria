const router = require("express").Router();
const controller = require("./audit.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// All routes — admin only
router.use(authenticate, authorize("ADMIN"));

router.get("/", controller.getAll);
router.get("/filters", controller.getFilterOptions);
router.get("/:id", controller.getById);

// Clear all — admin only
router.delete("/clear", controller.clearAll);

module.exports = router;
