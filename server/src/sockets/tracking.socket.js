const service = require("../modules/tracking/tracking.service");
const TRACKING_ROOM = "tracking:live";

const registerTrackingSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("tracking:join", async () => {
      try {
        socket.join(TRACKING_ROOM);
        const snapshot = await service.getLive();
        socket.emit("live:snapshot", snapshot);
      } catch (err) {
        console.error(
          `[Socket] ❌ Snapshot error for ${socket.id}:`,
          err.message,
        );
        socket.emit("live:error", { message: "Failed to load live data" });
      }
    });

    socket.on("tracking:leave", () => socket.leave(TRACKING_ROOM));
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] ⚠️ Client ${socket.id} disconnected: ${reason}`);
    });
  });
};

const broadcastLiveUpdate = async (io) => {
  try {
    const live = await service.getLive();
    io.to(TRACKING_ROOM).emit("live:update", live);
  } catch (err) {
    console.error("[Socket] ❌ Broadcast failed:", err.message);
  }
};

const broadcastRouteUpdate = (io, payload = {}) => {
  try {
    io.to(TRACKING_ROOM).emit("routes:update", payload);
  } catch (err) {
    console.error("[Socket] ❌ Route broadcast failed:", err.message);
  }
};

module.exports = {
  registerTrackingSocket,
  broadcastLiveUpdate,
  broadcastRouteUpdate,
};
