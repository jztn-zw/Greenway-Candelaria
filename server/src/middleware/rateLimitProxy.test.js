const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../config/db");
const controller = require("../modules/auth/auth.controller");
// No login lookup, hashing or real database access is needed for proxy fixtures.
controller.login = (req, res) => res.status(401).json({ message: "Fixture credentials rejected" });
after(() => pool.end());

const withApp = async (proxy, run) => {
  const previous = process.env.TRUST_PROXY;
  if (proxy) process.env.TRUST_PROXY = proxy;
  else delete process.env.TRUST_PROXY;
  delete require.cache[require.resolve("../app")];
  const app = require("../app");
  app.get("/fixture/ip", (req, res) => res.json({ ip: req.ip }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try { await run(app, `http://127.0.0.1:${server.address().port}`); }
  finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.TRUST_PROXY; else process.env.TRUST_PROXY = previous;
  }
};

test("unconfigured/untrusted proxies cannot choose the visitor IP with forwarded headers", async () => {
  for (const proxy of [undefined, "192.0.2.0/24"]) await withApp(proxy, async (app, base) => {
    const response = await fetch(base + "/fixture/ip", { headers: { "X-Forwarded-For": "203.0.113.5" } });
    assert.equal((await response.json()).ip, "127.0.0.1");
  });
});

test("configured proxy CIDRs expose individual IPs and rate-limit headers to web clients", async () => {
  await withApp("127.0.0.1/32", async (app, base) => {
    const response = await fetch(base + "/fixture/ip", { headers: { "X-Forwarded-For": "203.0.113.5", Origin: "http://localhost:8080" } });
    assert.equal((await response.json()).ip, "203.0.113.5");
    assert.ok(response.headers.get("access-control-expose-headers").includes("Retry-After"));
    assert.equal(app.get("trust proxy fn")("203.0.113.5", 1), false);
  });
});

test("rotating IPv6 addresses in one /56 cannot bypass the credential failure quota", async () => {
  await withApp("127.0.0.1/32", async (_, base) => {
    const login = async ip => {
      const res = await fetch(base + "/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
        body: JSON.stringify({ identifier: "ipv6-fixture", password: "fixture" }),
      });
      await res.text(); return res.status;
    };
    for (let i = 0; i < 10; i++) assert.equal(await login("2001:db8:1234:aa00::1"), 401);
    assert.equal(await login("2001:db8:1234:aa01::2"), 429);
    assert.equal(await login("2001:db8:1234:bb00::1"), 401);
  });
});
