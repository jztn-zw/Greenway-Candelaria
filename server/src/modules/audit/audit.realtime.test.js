const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const changes = require("../../sockets/adminChanges.socket");
const entry = { user_id: "fixture-admin", action: "UPDATE_FIXTURE", module: "fixture" };
after(() => pool.end());

test("audit events follow successful standalone writes, including asynchronous logging", async (t) => {
  const sent = [];
  t.mock.method(changes, "emitAdminDataChanged", (...args) => sent.push(args));
  delete require.cache[require.resolve("./audit.service")];
  const audit = require("./audit.service");
  let finish;
  t.mock.method(pool, "query", () => new Promise(resolve => { finish = resolve; }));
  for (const method of ["log", "logRequired"]) {
    const count = sent.length;
    const write = audit[method](entry);
    assert.equal(sent.length, count);
    finish([{}]);
    assert.ok(await write);
    assert.deepEqual(sent.at(-1), [["audit"], { residents: false, collectors: false }]);
    assert.equal(sent.length, count + 1);
  }
});

test("failed or uncommitted audit writes never publish a refresh", async (t) => {
  const sent = [];
  t.mock.method(changes, "emitAdminDataChanged", (...args) => sent.push(args));
  delete require.cache[require.resolve("./audit.service")];
  const audit = require("./audit.service");
  t.mock.method(pool, "query", async () => { throw new Error("fixture database failure"); });
  t.mock.method(console, "error", () => {});
  assert.equal(await audit.log(entry), null);
  await assert.rejects(audit.logRequired(entry), /fixture database failure/);
  await audit.logInTransaction({ query: async () => [{}] }, entry);
  assert.deepEqual(sent, []);
});
