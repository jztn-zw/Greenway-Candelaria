const router = require("express").Router();
const controller = require("./sessions.controller");
const authenticate = require("../../middleware/auth");

router.get("/", authenticate, controller.getMySessions);
router.delete("/all", authenticate, controller.deleteAll);
router.delete("/:id", authenticate, controller.deleteOne);

module.exports = router;
