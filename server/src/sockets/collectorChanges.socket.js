const { authenticateSocketUser } = require("./socketAuth");

const ROOM = "collector:data";
const COLLECTOR_ROLES = new Set(["DRIVER"]);
const DOMAINS = new Set(["routes", "drivers", "trucks", "schedule", "barangays"]);
const PRIVATE_DOMAINS = new Set(["messenger"]);
let broadcast = () => {};

// Events are invalidation hints, never records, credentials, locations or drafts.
// Authorization is checked again at delivery so revoked sessions lose access.
const createCollectorChangeChannel = (io, authenticate = authenticateSocketUser) => {
  const pending = new Set();
  const privatePending = new Map();
  let timer;
  const flush = async () => {
    const domains = [...pending];
    pending.clear();
    const privateChanges = new Map(privatePending);
    privatePending.clear();
    try {
      const sockets = await io.in(ROOM).fetchSockets();
      for (const socket of sockets) {
        const user = await authenticate(socket, COLLECTOR_ROLES);
        if (user?.role !== "DRIVER") { await socket.leave(ROOM); continue; }
        const ownDomains = privateChanges.get(String(user.id)) || [];
        const visible = [...new Set([...domains, ...ownDomains])];
        if (visible.length) socket.emit("collector:data-changed", {
          domains: visible, ...(ownDomains.length ? { ownerId: user.id } : {}),
        });
      }
    } catch (error) {
      // Reads and periodic reconciliation remain available if delivery fails.
      console.error("[CollectorChanges] Delivery failed:", error.message);
    } finally {
      timer = undefined;
      if (pending.size || privatePending.size) schedule();
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
  return (domains, ownerId) => {
    if (ownerId) {
      const key = String(ownerId);
      const own = privatePending.get(key) || [];
      for (const domain of domains) if (PRIVATE_DOMAINS.has(domain) && !own.includes(domain)) own.push(domain);
      if (own.length) privatePending.set(key, own);
    } else {
      for (const domain of domains) if (DOMAINS.has(domain)) pending.add(domain);
    }
    if (pending.size || privatePending.size) schedule();
  };
};

const registerCollectorChangesSocket = (io) => { broadcast = createCollectorChangeChannel(io); };
const emitCollectorDataChanged = (domains) => broadcast(domains);
const emitCollectorConversationChanged = (userId) => { if (userId) broadcast(["messenger"], userId); };
module.exports = { registerCollectorChangesSocket, emitCollectorDataChanged, emitCollectorConversationChanged, createCollectorChangeChannel };
