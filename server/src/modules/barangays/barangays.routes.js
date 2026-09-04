const router = require("express").Router();
const controller = require("./barangays.controller");

// Public - used by register dropdown, resident tracking, route maps, filters
router.get("/", controller.getAll);

// Public - used by report form and details lookup
router.get("/:id", controller.getById);

module.exports = router;
