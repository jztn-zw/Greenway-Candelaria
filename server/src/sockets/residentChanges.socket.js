const { authenticateSocketUser } = require("./socketAuth");
const ROLES = new Set(["RESIDENT"]);
const PUBLIC_DOMAINS = new Set(["posts", "announcements", "schedule", "routes", "barangays"]);
const PRIVATE_DOMAINS = new Set(["reports", "profile", "settings", "notifications"]);
let broadcast = () => {};

// Only invalidation hints travel here. HTTP reads still enforce record access.
// Private domains always require an owner, determined by server-side code.
const createResidentChangeChannel = (io, authenticate = authenticateSocketUser) => {
  const pending = new Map();
  let timer;
  const flush = async () => {
    const changes = [...pending.entries()];
    pending.clear();
    try {
      const sockets = await io.in("resident:data").fetchSockets();
      for (const socket of sockets) {
        const user = await authenticate(socket, ROLES);
        if (user?.role !== "RESIDENT") { await socket.leave("resident:data"); continue; }
        const domains = new Set(changes.flatMap(([owner, values]) =>
          owner === "public" || owner === String(user.id) ? [...values] : []));
        if (domains.size) socket.emit("resident:data-changed", { domains: [...domains] });
      }
    } catch (error) {
      console.error("[ResidentChanges] Delivery failed:", error.message);
    } finally {
      timer = undefined;
      if (pending.size) schedule();
    }
  };
  const schedule = () => {
    if (!timer) { timer = setTimeout(() => void flush(), 150); timer.unref?.(); }
  };
  io.on("connection", (socket) => {
    let joining = false;
    let lastJoin = 0;
    socket.on("resident:subscribe", async () => {
      if (joining || Date.now() - lastJoin < 1000) return;
      joining = true;
      lastJoin = Date.now();
      try {
        const user = await authenticate(socket, ROLES);
        if (user?.role !== "RESIDENT") { await socket.leave("resident:data"); return; }
        await socket.join("resident:data");
        socket.emit("resident:ready");
      } catch (error) {
        console.error("[ResidentChanges] Subscription failed:", error.message);
      } finally { joining = false; }
    });
  });
  return (domains, ownerId) => {
    const allowed = domains.filter((domain) => ownerId ? PRIVATE_DOMAINS.has(domain) : PUBLIC_DOMAINS.has(domain));
    if (!allowed.length) return;
    const owner = ownerId ? String(ownerId) : "public";
    const values = pending.get(owner) || new Set();
    allowed.forEach((domain) => values.add(domain));
    pending.set(owner, values);
    schedule();
  };
};
const registerResidentChangesSocket = (io) => { broadcast = createResidentChangeChannel(io); };
const emitResidentDataChanged = (domains, ownerId) => broadcast(domains, ownerId);
module.exports = { createResidentChangeChannel, registerResidentChangesSocket, emitResidentDataChanged };
