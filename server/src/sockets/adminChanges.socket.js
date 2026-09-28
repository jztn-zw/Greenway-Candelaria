const { emitCollectorDataChanged } = require("./collectorChanges.socket");
const { emitResidentDataChanged } = require("./residentChanges.socket");
const { authenticateSocketUser } = require("./socketAuth");

const ROOM = "admin:data";
const ADMIN_ROLES = new Set(["ADMIN"]);
const DOMAINS = new Set([
  "reports", "residents", "drivers", "trucks", "routes", "tracking",
  "barangays", "schedule", "posts", "announcements", "dashboard", "analytics",
]);
let broadcast = () => {};

// Events are invalidation hints, never records, credentials, locations or drafts.
// Authorization is checked again at delivery so revoked sessions lose access.
const createAdminChangeChannel = (io, authenticate = authenticateSocketUser) => {
  const pending = new Set();
  let timer;
  const flush = async () => {
    const domains = [...pending];
    pending.clear();
    try {
      const sockets = await io.in(ROOM).fetchSockets();
      for (const socket of sockets) {
        const user = await authenticate(socket, ADMIN_ROLES);
        if (user?.role === "ADMIN") socket.emit("admin:data-changed", { domains });
        else await socket.leave(ROOM);
      }
    } catch (error) {
      // Reads and periodic reconciliation remain available if delivery fails.
      console.error("[AdminChanges] Delivery failed:", error.message);
    } finally {
      timer = undefined;
      if (pending.size) schedule();
    }
  };
  const schedule = () => {
    if (!timer) {
      timer = setTimeout(() => void flush(), 150);
      timer.unref?.();
    }
  };
  io.on("connection", (socket) => {
    let joining = false;
    let lastJoin = 0;
    socket.on("admin:subscribe", async () => {
      if (joining || Date.now() - lastJoin < 1000) return;
      joining = true;
      lastJoin = Date.now();
      try {
        const user = await authenticate(socket, ADMIN_ROLES);
        if (user?.role !== "ADMIN") { await socket.leave(ROOM); return; }
        await socket.join(ROOM);
        // Reconcile after joining, closing the gap between HTTP load and subscription.
        socket.emit("admin:ready");
      } catch (error) {
        console.error("[AdminChanges] Subscription failed:", error.message);
      } finally { joining = false; }
    });
  });
  return (domains) => {
    for (const domain of domains) if (DOMAINS.has(domain)) pending.add(domain);
    if (pending.size) schedule();
  };
};

const registerAdminChangesSocket = (io) => { broadcast = createAdminChangeChannel(io); };
const emitAdminDataChanged = (domains, { residents = true, collectors = true } = {}) => {
  broadcast(domains);
  if (collectors) emitCollectorDataChanged(domains);
  if (residents) emitResidentDataChanged(domains);
};
module.exports = { registerAdminChangesSocket, emitAdminDataChanged, createAdminChangeChannel };
