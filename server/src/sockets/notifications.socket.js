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

// Saved notifications remain available over HTTP if a socket delivery fails.
const emitAuthorized = async (room, event, payload, allowed) => {
  if (!ioInstance) return;
  try {
    const sockets = await ioInstance.in(room).fetchSockets();
    for (const socket of sockets) {
      const user = await authenticateSocketUser(socket);
      if (user && allowed(user)) socket.emit(event, payload);
      else await socket.leave(room);
    }
  } catch (error) { console.error("[Notifications] Delivery failed:", error.message); }
};
const emitNotificationToUser = (userId, notification) =>
  void emitAuthorized(`user:${userId}`, "notification:new", notification, (user) => user.id === userId);
const emitNotificationToBarangay = (barangayId, notification) =>
  void emitAuthorized(`barangay:${barangayId}`, "notification:new", notification, (user) =>
    user.barangay_id === barangayId && (!notification.metadata?.street_id || user.street_id === notification.metadata.street_id));
const emitNotificationToAdmins = (notification) =>
  void emitAuthorized("role:admins", "notification:new", notification, (user) => user.role === "ADMIN");

// Remove an in-memory notification immediately when its source is no longer
// available (for example, an archived or expired announcement).
const emitNotificationReferenceRemoved = (ref_module, ref_id) => {
  if (!ioInstance || !ref_module || !ref_id) return;
  if (ref_module === "tracking-stale-gps") {
    // Personal rooms are sufficient for persisted admin notifications.
    void (async () => {
      const sockets = await ioInstance.fetchSockets();
      for (const socket of sockets) {
        const user = await authenticateSocketUser(socket, new Set(["ADMIN"]));
        if (user) socket.emit("notification:remove_ref", { ref_module, ref_id });
      }
    })().catch((error) => console.error("[Notifications] Removal delivery failed:", error.message));
  } else {
    void (async () => {
      const { pool } = require("../config/db");
      const [recipients] = await pool.query(
        "SELECT DISTINCT user_id FROM notifications WHERE ref_module = ? AND ref_id = ?", [ref_module, ref_id]);
      for (const { user_id } of recipients) emitNotificationReferenceRemovedToUser(user_id, ref_module, ref_id);
    })().catch((error) => console.error("[Notifications] Removal delivery failed:", error.message));
  }
};

const emitNotificationReferenceRemovedToUser = (userId, ref_module, ref_id) => {
  if (!ioInstance || !userId || !ref_module || !ref_id) return;
  void emitAuthorized(`user:${userId}`, "notification:remove_ref", { ref_module, ref_id }, (user) => user.id === userId);
};

const emitNotificationReferenceUpdatedToUser = (userId, ref_module, ref_id, changes) => {
  if (!ioInstance || !userId || !ref_module || !ref_id) return;
  void emitAuthorized(`user:${userId}`, "notification:update_ref", {
    ref_module,
    ref_id,
    changes,
  }, (user) => user.id === userId);
};

module.exports = {
  registerNotificationsSocket,
  getIO,
  emitNotificationToUser,
  emitNotificationToBarangay,
  emitNotificationToAdmins,
  emitNotificationReferenceRemoved,
  emitNotificationReferenceRemovedToUser,
  emitNotificationReferenceUpdatedToUser,
};
