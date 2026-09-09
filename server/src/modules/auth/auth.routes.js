const router = require("express").Router();
const controller = require("./auth.controller");
const authenticate = require("../../middleware/auth");
const { authLimiter } = require("../../middleware/rateLimits");

router.post("/register", authLimiter, controller.register);
router.post("/login", authLimiter, controller.login);
router.post("/logout", authenticate, controller.logout);
router.get("/me", authenticate, controller.getMe);

module.exports = router;
