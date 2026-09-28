const router = require("express").Router();
const controller = require("./barangays.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Public - used by register dropdown, resident tracking, route maps, filters
router.get("/", controller.getAll);

router.get("/manage", authenticate, authorize("ADMIN"), controller.getManagerOverview);

router.get("/:id/streets/manage", authenticate, authorize("ADMIN"), controller.getManagerStreets);

router.get("/:id/streets", controller.getStreets);

router.put("/:id/collection-service", authenticate, authorize("ADMIN"), controller.updateCollectionService);
router.post("/:id/streets", authenticate, authorize("ADMIN"), controller.createStreet);
router.put("/:id/streets/:streetId", authenticate, authorize("ADMIN"), controller.updateStreet);
router.put("/:id/streets/:streetId/coverage", authenticate, authorize("ADMIN"), controller.updateStreetCoverage);
router.delete("/:id/streets/:streetId", authenticate, authorize("ADMIN"), controller.deleteStreet);

// Public - used by report form and details lookup
router.get("/:id", controller.getById);

module.exports = router;
