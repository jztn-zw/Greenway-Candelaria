const router = require("express").Router();
const controller = require("./dashboard.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

router.get("/", authenticate, authorize("ADMIN"), controller.getAdminDashboard);

module.exports = router;
