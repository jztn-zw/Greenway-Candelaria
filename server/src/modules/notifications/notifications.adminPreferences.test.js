const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const { notifyAdmins } = require("./notifications.service");

after(() => pool.end());

test("admin notification categories use their matching saved preferences", async () => {
  const original = pool.query;
  const queries = [];
  pool.query = async (sql) => {
    queries.push(sql);
    return [[]];
  };
  try {
    for (const category of ["reports", "route_issues", "driver_messages"]) {
      await notifyAdmins({ category, type: "SYSTEM", title: "Test", body: "Test" });
    }
    assert.match(queries[0], /s\.notif_admin_reports/);
    assert.match(queries[1], /s\.notif_admin_route_issues/);
    assert.match(queries[2], /s\.notif_admin_driver_messages/);
    assert.equal(queries.length, 3);
  } finally {
    pool.query = original;
  }
});
