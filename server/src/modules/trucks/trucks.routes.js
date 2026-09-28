const router = require("express").Router();
const controller = require("./trucks.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Fleet details are available only to authenticated GreenWay roles.
router.get("/", authenticate, authorize("ADMIN", "RESIDENT", "DRIVER"), controller.getAll);
router.get("/:id", authenticate, authorize("ADMIN", "RESIDENT", "DRIVER"), controller.getById);

// Admin only
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  controller.remove,
);

module.exports = router;
