let ioInstance = null;
const { authenticateSocketUser } = require("./socketAuth");

// Reasons that are normal browser/client behavior — no need to log
const SILENT_DISCONNECT_REASONS = new Set([
  "transport close",             // Browser closed the tab or reloaded
  "client namespace disconnect", // Client called socket.disconnect()
  "ping timeout",                // Temporary network drop, client will reconnect
]);

const registerNotificationsSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    // ── Join personal user room (for targeted notifications) ─────────────────
    socket.on("notifications:join_user", async () => {
      try {
        const user = await authenticateSocketUser(socket);
        if (!user) return;
        socket.join(`user:${user.id}`);
      } catch (err) {
        console.error(
          `[Socket:Notifications] ❌ Failed to join user room for ${socket.id}:`,
          err.message,
        );
      }
    });

    // ── Join barangay room (for localized collection/proximity alerts) ────────
    socket.on("notifications:join_barangay", async (barangayId) => {
      try {
        const user = await authenticateSocketUser(socket);
        if (!user || !user.barangay_id || user.barangay_id !== barangayId) return;
        socket.join(`barangay:${user.barangay_id}`);
      } catch (err) {
        console.error(
          `[Socket:Notifications] ❌ Failed to join barangay room for ${socket.id}:`,
          err.message,
        );
      }
    });

    // ── Join admin room (for admin-specific report alerts) ────────────────────
    socket.on("notifications:join_admins", async () => {
      try {
        const user = await authenticateSocketUser(socket, new Set(["ADMIN"]));
        if (!user) return;
        socket.join("role:admins");
      } catch (err) {
        console.error(
          `[Socket:Notifications] ❌ Failed to join admins room for ${socket.id}:`,
          err.message,
        );
      }
    });

    // ── Disconnect — only log unexpected reasons ──────────────────────────────
    socket.on("disconnect", (reason) => {
      if (!SILENT_DISCONNECT_REASONS.has(reason)) {
        console.warn(
          `[Socket:Notifications] ⚠️ Unexpected disconnect (${socket.id}): ${reason}`,
        );
      }
    });

    // ── Catch-all for uncaught socket errors ──────────────────────────────────
    socket.on("error", (err) => {
      console.error(
        `[Socket:Notifications] ❌ Socket error on ${socket.id}:`,
        err.message,
      );
    });
  });

  // ── Global IO error handler ───────────────────────────────────────────────
  io.on("error", (err) => {
    console.error(
      "[Socket:Notifications] ❌ IO server error:",
      err.message,
    );
  });
};

// ── Get the Socket.IO instance (for use in other modules) ───────────────────
const getIO = () => ioInstance;

// ── Emit a notification to a specific user ───────────────────────────────────
const emitNotificationToUser = (userId, notification) => {
  try {
    if (!ioInstance) {
      console.warn("[Socket:Notifications] ⚠️ IO not initialized — cannot emit to user:", userId);
      return;
    }
    if (!userId) {
      console.warn("[Socket:Notifications] ⚠️ emitNotificationToUser called with no userId");
      return;
    }
    ioInstance.to(`user:${userId}`).emit("notification:new", notification);
  } catch (err) {
    console.error(
      `[Socket:Notifications] ❌ Failed to emit notification to user ${userId}:`,
      err.message,
    );
  }
};

// ── Emit a notification to all users in a barangay ───────────────────────────
const emitNotificationToBarangay = (barangayId, notification) => {
  try {
    if (!ioInstance) {
      console.warn("[Socket:Notifications] ⚠️ IO not initialized — cannot emit to barangay:", barangayId);
      return;
    }
    if (!barangayId) {
      console.warn("[Socket:Notifications] ⚠️ emitNotificationToBarangay called with no barangayId");
      return;
    }
    ioInstance.to(`barangay:${barangayId}`).emit("notification:new", notification);
  } catch (err) {
    console.error(
      `[Socket:Notifications] ❌ Failed to emit notification to barangay ${barangayId}:`,
      err.message,
    );
  }
};

// ── Emit a notification to all admins ────────────────────────────────────────
const emitNotificationToAdmins = (notification) => {
  try {
    if (!ioInstance) {
      console.warn("[Socket:Notifications] ⚠️ IO not initialized — cannot emit to admins");
      return;
    }
    ioInstance.to("role:admins").emit("notification:new", notification);
  } catch (err) {
    console.error(
      "[Socket:Notifications] ❌ Failed to emit notification to admins:",
      err.message,
    );
  }
};

module.exports = {
  registerNotificationsSocket,
  getIO,
  emitNotificationToUser,
  emitNotificationToBarangay,
  emitNotificationToAdmins,
};
