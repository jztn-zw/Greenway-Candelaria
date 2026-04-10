const router = require("express").Router();
const controller = require("./trucks.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");

// Public — resident and driver can see trucks
router.get("/", controller.getAll);
router.get("/:id", controller.getById);

// Admin only
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.create,
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.update,
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "SUPER_ADMIN"),
  controller.remove,
);

module.exports = router;
