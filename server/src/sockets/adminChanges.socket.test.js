const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { pool } = require("../config/db");
const { createAdminChangeChannel } = require("./adminChanges.socket");
const { changedDomains, createAdminChangesMiddleware } = require("../middleware/adminChanges");

test("successful writes publish affected domains, never reads, errors, uploads or GPS pings", () => {
  const sent = [];
  const middleware = createAdminChangesMiddleware((domains) => sent.push(domains));
  for (const [method, originalUrl, statusCode] of [
    ["POST", "/api/reports", 201],
    ["GET", "/api/reports", 200],
    ["POST", "/api/reports", 400],
    ["POST", "/api/reports", 500],
    ["POST", "/api/reports/upload-photos", 201],
    ["POST", "/api/tracking/ping", 200],
    ["PUT", "/api/users/admin-settings", 200],
  ]) {
    const res = new EventEmitter();
    res.statusCode = statusCode;
    middleware({ method, originalUrl }, res, () => {});
    res.emit("finish");
  }
  assert.deepEqual(sent, [["reports", "residents", "dashboard", "analytics"]]);
  assert.ok(changedDomains({ method: "POST", originalUrl: "/api/auth/register" }).includes("residents"));
  assert.ok(changedDomains({ method: "PUT", originalUrl: "/api/routes/run/end" }).includes("tracking"));
  assert.ok(changedDomains({ method: "POST", originalUrl: "/api/drivers/messages" }).includes("tracking"));
  assert.ok(changedDomains({ method: "POST", originalUrl: "/api/announcements/id/read" }).includes("announcements"));
});

test("admin subscriptions and each delivery require current authorization; bursts contain domain names only", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let connect;
  const sockets = [];
  const io = { on: (_, handler) => { connect = handler; }, in: () => ({ fetchSockets: async () => sockets.filter((socket) => socket.joined) }) };
  const makeSocket = (role) => {
    const handlers = {};
    return {
      role, handlers, events: [], joined: false,
      on(name, handler) { handlers[name] = handler; },
      async join() { this.joined = true; },
      async leave() { this.joined = false; },
      emit(name, payload) { this.events.push({ name, payload }); },
    };
  };
  const emit = createAdminChangeChannel(io, async (socket) => socket.role ? { role: socket.role } : null);
  const admin = makeSocket("ADMIN"), resident = makeSocket("RESIDENT"), revoked = makeSocket("ADMIN");
  for (const socket of [admin, resident, revoked]) {
    sockets.push(socket); connect(socket); await socket.handlers["admin:subscribe"]();
  }
  assert.equal(admin.joined, true);
  assert.equal(resident.joined, false);
  assert.equal(admin.events[0].name, "admin:ready");
  revoked.role = null;
  emit(["reports", "resident email", "password"]);
  emit(["reports", "dashboard"]);
  t.mock.timers.tick(150);
  await new Promise(setImmediate);
  const updates = admin.events.filter((event) => event.name === "admin:data-changed");
  assert.deepEqual(updates, [{ name: "admin:data-changed", payload: { domains: ["reports", "dashboard"] } }]);
  assert.equal(revoked.joined, false);
  assert.equal(revoked.events.some((event) => event.name === "admin:data-changed"), false);
  assert.equal(resident.events.length, 0);
});

// Release the idle database-pool timer after mocked database tests.
after(() => pool.end());

test("a saved report reaches a connected admin over Socket.IO without notification delivery", async () => {
  const express = require("express");
  const http = require("node:http");
  const { Server } = require("socket.io");
  const { io: connectClient } = require(require.resolve("socket.io-client", {
    paths: [require("node:path").join(__dirname, "../../../client")],
  }));
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer);
  const publish = createAdminChangeChannel(io, async () => ({ role: "ADMIN" }));
  app.use(createAdminChangesMiddleware(publish));
  let total = 28;
  app.get("/api/reports", (_, res) => res.json({ total }));
  app.post("/api/reports", (_, res) => { total++; res.status(201).json({ saved: true }); });
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${httpServer.address().port}`;
  const socket = connectClient(url, { autoConnect: false, transports: ["websocket"] });
  const once = (event) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Missing ${event}`)), 5000);
    socket.once(event, (payload) => { clearTimeout(timeout); resolve(payload); });
  });
  try {
    socket.on("connect", () => socket.emit("admin:subscribe"));
    const ready = once("admin:ready"); socket.connect(); await ready;
    assert.equal((await (await fetch(`${url}/api/reports`)).json()).total, 28);
    const changed = once("admin:data-changed");
    assert.equal((await fetch(`${url}/api/reports`, { method: "POST" })).status, 201);
    assert.deepEqual(await changed, { domains: ["reports", "residents", "dashboard", "analytics"] });
    assert.equal((await (await fetch(`${url}/api/reports`)).json()).total, 29);
  } finally {
    socket.disconnect();
    httpServer.closeAllConnections();
    await new Promise((resolve) => io.close(resolve));
  }
});
