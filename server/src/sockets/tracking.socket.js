const service = require("../modules/tracking/tracking.service");
const { authenticateSocketUser } = require("./socketAuth");
const { emitAdminDataChanged } = require("./adminChanges.socket");
const TRACKING_ROOM = "tracking:live";
const ROLES = new Set(["ADMIN", "RESIDENT", "DRIVER"]);
const pending = new WeakMap();
const deliver = async (socket, event, snapshots) => {
  const user = await authenticateSocketUser(socket, ROLES);
  if (!user) {
    await socket.leave(TRACKING_ROOM);
    socket.emit("live:error", { code: "UNAUTHORIZED", message: "Please sign in again." });
    return;
  }
  if (event === "routes:update") { socket.emit(event, {}); return; }
  const key = user.role === "ADMIN" ? "ADMIN"
    : user.role === "RESIDENT" ? ["RESIDENT", user.barangay_id, user.street_id].join(":")
    : ["DRIVER", user.id, user.assigned_truck_id].join(":");
  if (!snapshots.has(key)) snapshots.set(key, service.getLive(user));
  const snapshot = await snapshots.get(key);
  if (socket.rooms.has(TRACKING_ROOM)) socket.emit(event, snapshot);
};
const registerTrackingSocket = (io) => {
  io.on("connection", (socket) => {
    let joining = false;
    let lastJoin = 0;
    socket.on("tracking:join", async () => {
      if (joining || Date.now() - lastJoin < 1000) return;
      joining = true;
      lastJoin = Date.now();
      try {
        await socket.join(TRACKING_ROOM);
        await deliver(socket, "live:snapshot", new Map());
      } catch {
        socket.emit("live:error", { message: "Tracking data is temporarily unavailable." });
      } finally { joining = false; }
    });
    socket.on("tracking:leave", () => socket.leave(TRACKING_ROOM));
  });
};
// Coalesce ping bursts and share snapshots only between equal authorization scopes.
const schedule = (io, event) => {
  if (!io) return;
  let state = pending.get(io);
  if (state) { state.events.add(event); return; }
  state = { events: new Set([event]) };
  pending.set(io, state);
  const flush = async () => {
    const events = [...state.events];
    state.events.clear();
    try {
      const sockets = await io.in(TRACKING_ROOM).fetchSockets();
      const snapshots = new Map();
      for (const socket of sockets) {
        for (const next of events) {
          try { await deliver(socket, next, snapshots); }
          catch { socket.emit("live:error", { message: "Tracking data is temporarily unavailable." }); }
        }
      }
    } catch (error) {
      console.error("[Tracking] Broadcast failed:", error.message);
    } finally {
      if (state.events.size) setTimeout(flush, 1000);
      else pending.delete(io);
    }
  };
  setTimeout(flush, 250);
};
const broadcastLiveUpdate = (io) => schedule(io, "live:update");
const broadcastRouteUpdate = (io) => {
  schedule(io, "routes:update");
  emitAdminDataChanged(["routes", "tracking", "drivers", "trucks", "schedule", "dashboard", "analytics"]);
};
module.exports = { registerTrackingSocket, broadcastLiveUpdate, broadcastRouteUpdate };
