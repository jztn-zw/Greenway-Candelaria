const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Posts storage (greenway/posts) ────────────────────────
const postStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "greenway/posts",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({
  storage: postStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ─── Reports storage (greenway/reports) ────────────────────
const reportStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "greenway/reports",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const uploadReports = multer({
  storage: reportStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// ─── Avatar storage (greenway/avatars) ─────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "greenway/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = { cloudinary, upload, uploadReports, uploadAvatar };

