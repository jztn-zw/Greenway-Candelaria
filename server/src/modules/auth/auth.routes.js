const router = require("express").Router();
const controller = require("./auth.controller");
const authenticate = require("../../middleware/auth");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/logout", authenticate, controller.logout);
router.get("/me", authenticate, controller.getMe);

module.exports = router;
