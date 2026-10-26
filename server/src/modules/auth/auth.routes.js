const router = require("express").Router();
const controller = require("./auth.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");
const { loginBurstLimiter, loginLimiter, registrationLimiter, recoveryIpLimiter,
  recoveryLimiter, recoveryCodeLimiter, profileWriteLimiter, accountDeletionLimiter } = require("../../middleware/rateLimits");
const authJsonOnly = (req, res, next) => {
  // Credential exchanges use JSON, never cross-site HTML form submissions.
  if (!req.is("application/json")) return res.status(415).json({ message: "JSON required" });
  next();
};
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

router.post("/register", registrationLimiter, controller.register);
router.post("/login", loginBurstLimiter, loginLimiter, controller.login);
router.post("/recover", recoveryIpLimiter, recoveryLimiter, authJsonOnly, controller.recoverPassword);
router.post("/recovery-code", authenticate, recoveryCodeLimiter, authJsonOnly, controller.replaceRecoveryCode);
router.post("/logout", authenticate, controller.logout);
router.post("/delete-account", authenticate, authorize("RESIDENT"), accountDeletionLimiter, authJsonOnly, controller.deleteResident);
router.get("/me", authenticate, controller.getMe);
router.get("/session", authenticate, (req, res) => res.json({ success: true, data: { active: true } }));
router.put("/resident-profile", authenticate, profileWriteLimiter, authJsonOnly, controller.completeResidentProfile);

module.exports = router;
