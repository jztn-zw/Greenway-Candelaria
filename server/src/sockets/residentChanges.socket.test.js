const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../config/db");
const { createResidentChangeChannel } = require("./residentChanges.socket");
after(() => pool.end());

test("private report changes reach only the owner; public hints contain no records; revoked sessions lose access", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let connect;
  const sockets = [];
  const io = { on: (_, fn) => { connect = fn; }, in: () => ({ fetchSockets: async () => sockets.filter((socket) => socket.joined) }) };
  const publish = createResidentChangeChannel(io, async (socket) => socket.user);
  const makeSocket = (id, role) => ({
    user: { id, role }, events: [], handlers: {}, joined: false,
    on(name, fn) { this.handlers[name] = fn; },
    emit(name, payload) { this.events.push({ name, payload }); },
    async join() { this.joined = true; }, async leave() { this.joined = false; },
  });
  const owner = makeSocket("owner", "RESIDENT"), other = makeSocket("other", "RESIDENT"), admin = makeSocket("admin", "ADMIN"), revoked = makeSocket("revoked", "RESIDENT");
  for (const socket of [owner, other, admin, revoked]) {
    sockets.push(socket); connect(socket); await socket.handlers["resident:subscribe"]();
  }
  assert.equal(admin.joined, false);
  revoked.user = null;
  publish(["reports", "profile", "email", "password"], "owner");
  publish(["reports", "settings"]); // Private changes without an owner must be discarded.
  publish(["posts", "schedule"]);
  t.mock.timers.tick(150); await new Promise(setImmediate);
  const updates = (socket) => socket.events.filter((event) => event.name === "resident:data-changed");
  assert.deepEqual(updates(owner), [{ name: "resident:data-changed", payload: { domains: ["reports", "profile", "posts", "schedule"] } }]);
  assert.deepEqual(updates(other), [{ name: "resident:data-changed", payload: { domains: ["posts", "schedule"] } }]);
  assert.deepEqual(updates(admin), []); assert.deepEqual(updates(revoked), []);
  assert.equal(revoked.joined, false);
});

test("a real resident socket receives report changes without relying on notification preferences", async () => {
  const http = require("node:http");
  const { Server } = require("socket.io");
  const { io: connectClient } = require(require.resolve("socket.io-client", { paths: [require("node:path").join(__dirname, "../../../client")] }));
  const server = http.createServer();
  const io = new Server(server);
  const publish = createResidentChangeChannel(io, async () => ({ id: "owner", role: "RESIDENT" }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const socket = connectClient(`http://127.0.0.1:${server.address().port}`, { autoConnect: false, transports: ["websocket"] });
  const once = (event) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Missing ${event}`)), 5000);
    socket.once(event, (value) => { clearTimeout(timeout); resolve(value); });
  });
  try {
    socket.on("connect", () => socket.emit("resident:subscribe"));
    const ready = once("resident:ready"); socket.connect(); await ready;
    const changed = once("resident:data-changed");
    publish(["reports"], "owner");
    assert.deepEqual(await changed, { domains: ["reports"] });
  } finally {
    socket.disconnect(); server.closeAllConnections(); await new Promise((resolve) => io.close(resolve));
  }
});
