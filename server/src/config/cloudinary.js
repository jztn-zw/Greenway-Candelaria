const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Cloudinary validates the final format too, but reject non-image uploads
// before they leave this server. These are the formats the application
// already supports, so this does not change valid upload behaviour.
const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const imageFileFilter = (req, file, callback) => {
  if (!allowedImageMimeTypes.has(file.mimetype)) {
    const error = new Error("Only JPG, PNG, and WebP images are allowed");
    error.statusCode = 400;
    return callback(error);
  }
  return callback(null, true);
};

const createImageUploader = (storage, fileSize, files = 1) =>
  multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize,
      files,
      fields: 10,
      fieldSize: 64 * 1024,
    },
  });

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

const upload = createImageUploader(postStorage, 10 * 1024 * 1024);

// ─── Reports storage (greenway/reports) ────────────────────
const reportStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "greenway/reports",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const uploadReports = createImageUploader(reportStorage, 10 * 1024 * 1024, 5);

// ─── Avatar storage (greenway/avatars) ─────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "greenway/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  },
});

const uploadAvatar = createImageUploader(avatarStorage, 5 * 1024 * 1024);

module.exports = { cloudinary, upload, uploadReports, uploadAvatar };

