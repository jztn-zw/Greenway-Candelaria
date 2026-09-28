const { authenticateSocketUser } = require("./socketAuth");

const ROOM = "collector:data";
const COLLECTOR_ROLES = new Set(["DRIVER"]);
const DOMAINS = new Set(["routes", "drivers", "trucks", "schedule", "barangays"]);
let broadcast = () => {};

// Events are invalidation hints, never records, credentials, locations or drafts.
// Authorization is checked again at delivery so revoked sessions lose access.
const createCollectorChangeChannel = (io, authenticate = authenticateSocketUser) => {
  const pending = new Set();
  let timer;
  const flush = async () => {
    const domains = [...pending];
    pending.clear();
    try {
      const sockets = await io.in(ROOM).fetchSockets();
      for (const socket of sockets) {
        const user = await authenticate(socket, COLLECTOR_ROLES);
        if (user?.role === "DRIVER") socket.emit("collector:data-changed", { domains });
        else await socket.leave(ROOM);
      }
    } catch (error) {
      // Reads and periodic reconciliation remain available if delivery fails.
      console.error("[CollectorChanges] Delivery failed:", error.message);
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
    socket.on("collector:subscribe", async () => {
      if (joining || Date.now() - lastJoin < 1000) return;
      joining = true;
      lastJoin = Date.now();
      try {
        const user = await authenticate(socket, COLLECTOR_ROLES);
        if (user?.role !== "DRIVER") { await socket.leave(ROOM); return; }
        await socket.join(ROOM);
        // Reconcile after joining, closing the gap between HTTP load and subscription.
        socket.emit("collector:ready");
      } catch (error) {
        console.error("[CollectorChanges] Subscription failed:", error.message);
      } finally { joining = false; }
    });
  });
  return (domains) => {
    for (const domain of domains) if (DOMAINS.has(domain)) pending.add(domain);
    if (pending.size) schedule();
  };
};

const registerCollectorChangesSocket = (io) => { broadcast = createCollectorChangeChannel(io); };
const emitCollectorDataChanged = (domains) => broadcast(domains);
module.exports = { registerCollectorChangesSocket, emitCollectorDataChanged, createCollectorChangeChannel };
