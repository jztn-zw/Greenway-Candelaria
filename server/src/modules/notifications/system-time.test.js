const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const app = require("../../app");
after(() => pool.end());

test("public time read uses database UTC and disables response caching", async () => {
  const original = pool.query;
  pool.query = async sql => {
    assert.equal(sql, "SELECT UTC_TIMESTAMP(3) AS server_time");
    return [[{ server_time: "2026-10-06 16:59:00.000" }]];
  };
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise(resolve => server.once("listening", resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/time`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.deepEqual((await response.json()).data, { server_time: "2026-10-06 16:59:00.000" });
  } finally { await new Promise(resolve => server.close(resolve)); pool.query = original; }
});
