const router = require("express").Router();
const controller = require("./auth.controller");
const authenticate = require("../../middleware/auth");
const { authLimiter } = require("../../middleware/rateLimits");
const authJsonOnly = (req, res, next) => {
  // Credential exchanges use JSON, never cross-site HTML form submissions.
  if (!req.is("application/json")) return res.status(415).json({ message: "JSON required" });
  next();
};
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

router.post("/register", authLimiter, controller.register);
router.post("/login", authLimiter, controller.login);
router.post("/recover", authLimiter, authJsonOnly, controller.recoverPassword);
router.post("/recovery-code", authenticate, authLimiter, authJsonOnly, controller.replaceRecoveryCode);
router.post("/logout", authenticate, controller.logout);
router.get("/me", authenticate, controller.getMe);
router.put("/resident-profile", authenticate, authLimiter, authJsonOnly, controller.completeResidentProfile);

module.exports = router;
