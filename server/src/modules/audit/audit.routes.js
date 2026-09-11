const router = require("express").Router();
const controller = require("./audit.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// All routes — admin only
router.use(authenticate, authorize("ADMIN"));

router.get("/", controller.getAll);
router.get("/filters", controller.getFilterOptions);
router.post("/export", controller.recordExport);
router.get("/:id", controller.getById);

module.exports = router;
