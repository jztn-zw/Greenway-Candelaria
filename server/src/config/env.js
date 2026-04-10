const required = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "CLIENT_URL",
];

const validateEnv = () => {
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    missing.forEach((key) => {
      console.error(`❌ Missing required env variable: ${key}`);
    });
    process.exit(1);
  }

  console.log("✅ Environment variables validated");
};

module.exports = validateEnv;
