const service = require("../modules/tracking/tracking.service");
const { authenticateSocketUser } = require("./socketAuth");

const TRACKING_ROOM = "tracking:live";
const ALLOWED_TRACKING_ROLES = new Set(["ADMIN", "RESIDENT", "DRIVER"]);

// Reasons that are normal browser/client behavior — no need to log
const SILENT_DISCONNECT_REASONS = new Set([
  "transport close",        // Browser closed the tab or reloaded
  "client namespace disconnect", // Client called socket.disconnect()
  "ping timeout",           // Temporary network drop, client will reconnect
]);

const registerTrackingSocket = (io) => {
  io.on("connection", (socket) => {
    // ── Join live tracking room ──────────────────────────────────────────────
    socket.on("tracking:join", async () => {
      try {
        const user = await authenticateSocketUser(socket, ALLOWED_TRACKING_ROLES);
        if (!user) {
          socket.emit("live:error", {
            code: "UNAUTHORIZED",
            message: "Authentication is required for live tracking.",
          });
          return;
        }

        socket.join(TRACKING_ROOM);
        const snapshot = await service.getLive();
        socket.emit("live:snapshot", snapshot);
      } catch (err) {
        console.error(
          `[Socket:Tracking] ❌ Failed to send snapshot to ${socket.id}:`,
          err.message,
        );
        socket.emit("live:error", {
          message: "Failed to load live tracking data. Please try again.",
        });
      }
    });

    // ── Leave live tracking room ─────────────────────────────────────────────
    socket.on("tracking:leave", () => {
      try {
        socket.leave(TRACKING_ROOM);
      } catch (err) {
        console.error(
          `[Socket:Tracking] ❌ Failed to leave room for ${socket.id}:`,
          err.message,
        );
      }
    });

    // ── Disconnect — only log unexpected reasons ─────────────────────────────
    socket.on("disconnect", (reason) => {
      if (!SILENT_DISCONNECT_REASONS.has(reason)) {
        console.warn(
          `[Socket:Tracking] ⚠️ Unexpected disconnect (${socket.id}): ${reason}`,
        );
      }
    });

    // ── Catch-all for uncaught socket errors ─────────────────────────────────
    socket.on("error", (err) => {
      console.error(
        `[Socket:Tracking] ❌ Socket error on ${socket.id}:`,
        err.message,
      );
    });
  });

  // ── Global IO error handler ──────────────────────────────────────────────
  io.on("error", (err) => {
    console.error("[Socket:Tracking] ❌ IO server error:", err.message);
  });
};

// ── Broadcast live truck positions to all tracking room subscribers ──────────
const broadcastLiveUpdate = async (io) => {
  try {
    if (!io) return;
    const live = await service.getLive();
    io.to(TRACKING_ROOM).emit("live:update", live);
  } catch (err) {
    console.error(
      "[Socket:Tracking] ❌ Failed to broadcast live update:",
      err.message,
    );
  }
};

// ── Broadcast a route change event (driver login/logout, route update) ───────
const broadcastRouteUpdate = (io, payload = {}) => {
  try {
    if (!io) return;
    io.to(TRACKING_ROOM).emit("routes:update", payload);
  } catch (err) {
    console.error(
      "[Socket:Tracking] ❌ Failed to broadcast route update:",
      err.message,
    );
  }
};

module.exports = {
  registerTrackingSocket,
  broadcastLiveUpdate,
  broadcastRouteUpdate,
};
