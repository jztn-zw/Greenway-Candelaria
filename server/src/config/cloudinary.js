const cloudinary = require("cloudinary").v2;
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

// Multer only validates and holds the request files briefly in memory. The
// official Cloudinary v2 SDK below performs the actual upload, which removes
// the incompatible multer-storage-cloudinary adapter from this application.
const createImageUploader = (fileSize, files = 1) =>
  multer({
    storage: multer.memoryStorage(),
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

const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );

    uploadStream.end(buffer);
  });

// The existing routes and file-size limits remain unchanged.
const upload = createImageUploader(10 * 1024 * 1024);
const uploadReports = createImageUploader(10 * 1024 * 1024, 5);
const uploadAvatar = createImageUploader(5 * 1024 * 1024);

module.exports = {
  cloudinary,
  upload,
  uploadReports,
  uploadAvatar,
  uploadBufferToCloudinary,
};

