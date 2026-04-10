const router = require("express").Router();
const controller = require("./audit.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// All routes — admin only
router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/", controller.getAll);
router.get("/:id", controller.getById);

// Clear all — super admin only
router.delete("/clear", authorize("SUPER_ADMIN"), controller.clearAll);

module.exports = router;
