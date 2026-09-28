const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../config/db");
const { createCollectorChangeChannel } = require("./collectorChanges.socket");
test("collector subscriptions and each delivery require current authorization; bursts contain domain names only", async (t) => {
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
  const emit = createCollectorChangeChannel(io, async (socket) => socket.role ? { role: socket.role } : null);
  const admin = makeSocket("DRIVER"), resident = makeSocket("RESIDENT"), revoked = makeSocket("DRIVER");
  for (const socket of [admin, resident, revoked]) {
    sockets.push(socket); connect(socket); await socket.handlers["collector:subscribe"]();
  }
  assert.equal(admin.joined, true);
  assert.equal(resident.joined, false);
  assert.equal(admin.events[0].name, "collector:ready");
  revoked.role = null;
  emit(["schedule", "resident email", "password"]);
  emit(["schedule", "routes"]);
  t.mock.timers.tick(150);
  await new Promise(setImmediate);
  const updates = admin.events.filter((event) => event.name === "collector:data-changed");
  assert.deepEqual(updates, [{ name: "collector:data-changed", payload: { domains: ["schedule", "routes"] } }]);
  assert.equal(revoked.joined, false);
  assert.equal(revoked.events.some((event) => event.name === "collector:data-changed"), false);
  assert.equal(resident.events.length, 0);
});


after(() => pool.end());
