const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const http = require("node:http");
const { Server } = require("socket.io");

// Real mobile transports and server rooms, with fixture identities and no DB.
test("mobile notification and data subscriptions use real authorized role channels", { timeout: 15000 }, async () => {
  const server = http.createServer();
  const io = new Server(server);
  const loadChannel = file => {
    const channel = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, file), "utf8"), {
    module: channel, console, setTimeout, clearTimeout,
    require: name => {
      if (name === "./socketAuth") return { authenticateSocketUser: async socket => ({
        id: socket.handshake.auth.token, role: socket.handshake.auth.token.startsWith("resident") ? "RESIDENT" : "DRIVER",
      }) };
      throw Error(name);
    },
    });
    return channel.exports;
  };
  const channel = loadChannel("notifications.socket.js");
  const residentChannel = loadChannel("residentChanges.socket.js");
  const collectorChannel = loadChannel("collectorChanges.socket.js");
  channel.registerNotificationsSocket(io);
  residentChannel.registerResidentChangesSocket(io);
  collectorChannel.registerCollectorChangesSocket(io);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const stops = [];
  try {
    for (const [app, role, userId] of [["residentapp", "RESIDENT", "resident-fixture"], ["driverapp", "DRIVER", "driver-fixture"]]) {
      const root = path.join(__dirname, "../../../", app);
      const ts = require(require.resolve("typescript", { paths: [root] }));
      const { io: connect } = require(require.resolve("socket.io-client", { paths: [root] }));
      const exported = {};
      let socket;
      vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, "src/services/socketService.ts"), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText, { exports: exported, require: name => {
        if (name === "socket.io-client") return { io: (url, options) => { socket = connect(url, options); return socket; } };
        if (name === "../config/env") return { SOCKET_URL: `http://127.0.0.1:${server.address().port}` };
        if (name === "./storage") return { tokenStorage: {} };
        if (name === "../store/authStore") return { useAuthStore: { getState: () => ({ token: userId, user: { id: userId, role } }) } };
        throw Error(name);
      } });
      const joined = new Promise(resolve => {
        const listener = room => {
          if (room === `user:${userId}`) { io.of("/").adapter.off("join-room", listener); resolve(); }
        };
        io.of("/").adapter.on("join-room", listener);
      });
      let changes = 0;
      const rows = [];
      let resolveArrival;
      const arrived = new Promise(resolve => { resolveArrival = resolve; });
      let resolveReady; const ready = new Promise(resolve => { resolveReady = resolve; });
      const dataChanges = [];
      const stop = exported.socketService.subscribeNotifications(userId, userId, () => changes++, row => {
        rows.push(row.id); resolveArrival();
      }, (payload, confirmed) => { if (confirmed) resolveReady(); else dataChanges.push(payload); });
      stops.push(stop);
      await joined;
      await ready;
      const once = event => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error(`Missing ${event} for ${role}`)), 5000);
        socket.once(event, value => { clearTimeout(timer); resolve(value); });
      });
      // Even a malformed foreign payload on this room cannot enter the app.
      io.to(`user:${userId}`).emit("notification:new", { id: "foreign", user_id: "other" });
      channel.emitNotificationToUser(userId, { id: "own", user_id: userId });
      await arrived;
      assert.deepEqual(rows, ["own"]);
      const updated = once("notification:update_ref");
      channel.emitNotificationReferenceUpdatedToUser(userId, "schedule", "fixture", { body: "Updated" });
      await updated;
      const removed = once("notification:remove_ref");
      channel.emitNotificationReferenceRemovedToUser(userId, "schedule", "fixture");
      await removed;
      assert.equal(changes, 4, "connect, own arrival, edit and removal reconcile the inbox");
      const dataEvent = once(role === "RESIDENT" ? "resident:data-changed" : "collector:data-changed");
      if (role === "RESIDENT") {
        residentChannel.emitResidentDataChanged(["reports"], userId);
        residentChannel.emitResidentDataChanged(["posts", "schedule", "routes"]);
      } else {
        collectorChannel.emitCollectorDataChanged(["schedule", "routes"]);
        collectorChannel.emitCollectorConversationChanged(userId);
      }
      await dataEvent;
      assert.equal(dataChanges.length, 1);
      assert.equal(dataChanges[0].ownerId, userId);
      assert.ok(dataChanges[0].domains.includes(role === "RESIDENT" ? "reports" : "messenger"));
      assert.ok(dataChanges[0].domains.includes("schedule"));
      assert.ok(dataChanges[0].domains.includes("routes"));
      const before = changes;
      stop();
      assert.equal(socket.connected, false);
      assert.equal(changes, before);
    }
  } finally {
    stops.forEach(stop => stop());
    server.closeAllConnections();
    await new Promise(resolve => io.close(resolve));
  }
});
