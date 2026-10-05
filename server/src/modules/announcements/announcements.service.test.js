const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const audit = require("../audit/audit.service");
const service = require("./announcements.service");
after(() => pool.end());

for (const expired of [0, 1]) {
  test(`resend uses the database expiry result (${expired}) for UTC dates`, async () => {
    const original = { query: pool.query, log: audit.log };
    pool.query = async (sql) => {
      if (sql.includes("FROM announcements a")) return [[{ id: "notice", title: "Notice", body: "Fixture", status: "ACTIVE", expires_at: "2000-01-01 00:00:00", is_expired: expired }]];
      if (sql.includes("FROM announcement_barangays") || sql.includes("FROM notifications")) return [[]];
      throw new Error(`Unexpected query: ${sql}`);
    };
    audit.log = async () => {};
    try {
      if (expired) await assert.rejects(service.resendToUnread("notice", "admin"), (error) => error.statusCode === 409);
      else assert.deepEqual(await service.resendToUnread("notice", "admin"), { sent: 0 });
    } finally { pool.query = original.query; audit.log = original.log; }
  });
}
