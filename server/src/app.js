const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middlewares
// Read the URLs from the .env file
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_DEV
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Health check
app.get("/health", (req, res) => {
  res.json({ status: "GreenWay API is running" });
});

// Routes
app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/barangays", require("./modules/barangays/barangays.routes"));
app.use("/api/users", require("./modules/users/users.routes"));
app.use("/api/trucks", require("./modules/trucks/trucks.routes"));
app.use("/api/drivers", require("./modules/drivers/drivers.routes"));
app.use("/api/routes", require("./modules/routes/routes.routes"));
app.use("/api/schedule", require("./modules/schedule/schedule.routes"));
app.use("/api/tracking", require("./modules/tracking/tracking.routes"));
app.use("/api/reports", require("./modules/reports/reports.routes"));
app.use("/api/posts", require("./modules/posts/posts.routes"));
app.use("/api/analytics", require("./modules/analytics/analytics.routes"));
app.use("/api/audit", require("./modules/audit/audit.routes"));
app.use("/api/sessions", require("./modules/sessions/sessions.routes"));
app.use(
  "/api/announcements",
  require("./modules/announcements/announcements.routes"),
);
app.use(
  "/api/notifications",
  require("./modules/notifications/notifications.routes"),
);

// Global error handler — always last
app.use(errorHandler);

module.exports = app;
