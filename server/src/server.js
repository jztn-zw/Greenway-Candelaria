require("dotenv").config();
// GreenWay is a Philippines-only service. Use Manila time for all server-side
// calendar, schedule, and human-readable time calculations.
process.env.TZ = process.env.APP_TIME_ZONE || "Asia/Manila";
const validateEnv = require("./config/env");
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { testConnection } = require("./config/db");
const { initSockets } = require("./sockets");
const { startRouteScheduler } = require("./modules/routes/routeScheduler");
const { startTrackingMonitor } = require("./modules/tracking/trackingMonitor");
const { startPostScheduler } = require("./modules/posts/posts.scheduler");
const { startAnnouncementScheduler } = require("./modules/announcements/announcements.scheduler");
const { startScheduleReminderScheduler } = require("./modules/schedule/scheduleReminder.scheduler");

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const allowedOrigins = new Set(
  [
    process.env.CLIENT_URL,
    process.env.CLIENT_URL_DEV,
    process.env.CLIENT_URL_MOB,
  ].filter(Boolean),
);

const isLocalDevOrigin = (origin) => {
  if (!origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Socket.IO CORS blocked origin"));
    },
    credentials: true,
  },
});

server.keepAliveTimeout = 61000;
server.headersTimeout = 65000;

const start = async () => {
  try {
    validateEnv();
    await testConnection();

    // ✅ Make io accessible to all routes via req.app.get("io")
    app.set("io", io);

    initSockets(io);
    startRouteScheduler(io);
    startTrackingMonitor();
    startPostScheduler();
    startAnnouncementScheduler();
    startScheduleReminderScheduler();

    server.listen(PORT, () => {
      console.log(`🚀 GreenWay API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

start();
