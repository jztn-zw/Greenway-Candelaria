const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { pool } = require("../../config/db");
const router = require("./auth.routes");

test("retired OAuth endpoints cannot issue challenges, link identities or create accounts", async () => {
  const originalQuery = pool.query;
  pool.query = async () => { throw new Error("No database access expected for retired endpoints"); };
  const app = express();
  app.use(express.json());
  app.use("/auth", router);
  app.use(require("../../middleware/errorHandler"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    for (const endpoint of ["/google/challenge", "/google", "/google/register", "/deactivate"]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/auth${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      assert.equal(response.status, 404, endpoint);
    }
    const routes = router.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
    for (const endpoint of ["/login", "/register", "/recover", "/recovery-code", "/logout", "/me", "/resident-profile", "/delete-account"]) {
      assert.ok(routes.includes(endpoint), `${endpoint} remains supported`);
    }
  } finally {
    pool.query = originalQuery;
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
