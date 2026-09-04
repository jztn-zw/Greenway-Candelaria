const router = require("express").Router();
const controller = require("./posts.controller");
const authenticate = require("../../middleware/auth");
const authorize = require("../../middleware/role");
const optionalAuth = require("../../middleware/optionalAuth");
const { upload } = require("../../config/cloudinary");

// ─── Image Upload ──────────────────────────────────────────
router.post(
  "/upload-image",
  authenticate,
  authorize("ADMIN"),
  upload.single("file"),
  controller.uploadImage,
);

// ─── Bookmarks (must be before /:id) ──────────────────────
router.get("/bookmarks", authenticate, controller.getBookmarks);

// ─── Public ───────────────────────────────────────────────
router.get("/", optionalAuth, controller.getAll);
router.get("/:id", optionalAuth, controller.getById);

// ─── Admin CRUD ───────────────────────────────────────────
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

// ─── Likes ────────────────────────────────────────────────
router.post("/:id/like", authenticate, controller.likePost);
router.delete("/:id/like", authenticate, controller.unlikePost);

// ─── Bookmarks ────────────────────────────────────────────
router.post("/:id/bookmark", authenticate, controller.bookmarkPost);
router.delete("/:id/bookmark", authenticate, controller.unbookmarkPost);

module.exports = router;
