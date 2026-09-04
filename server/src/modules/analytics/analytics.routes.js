const router = require("express").Router();
const controller = require("./analytics.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// All analytics — admin only
router.use(authenticate, authorize("ADMIN"));

router.get("/overview", controller.getOverview);
router.get("/reports", controller.getReportsAnalytics);
router.get("/trucks", controller.getTrucksAnalytics);
router.get("/users", controller.getUsersAnalytics);
router.get("/posts", controller.getPostsAnalytics);
router.get("/barangays", controller.getBarangaysAnalytics);

module.exports = router;
