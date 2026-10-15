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

test("update cannot assign a removed calendar notice type to a new announcement", async () => {
  const originalGetConnection = pool.getConnection;
  const queries = [];
  const connection = {
    async beginTransaction() {},
    async rollback() {},
    release() {},
    async query(sql) {
      queries.push(sql);
      if (sql.includes("FROM announcements a")) {
        return [[{
          id: "notice-1", title: "Notice", body: "Body", type: "GENERAL_NOTICE", status: "DRAFT",
          target_all: 1, barangays: [], calendar_event_id: null, scheduled_at: null, expires_at: null,
        }]];
      }
      if (sql.includes("FROM announcement_barangays")) return [[]];
      return [{ affectedRows: 1 }];
    },
  };
  pool.getConnection = async () => connection;
  try {
    await assert.rejects(service.update("notice-1", { type: "COMMUNITY_EVENT" }, "admin-1"), (error) => error.statusCode === 400);
    assert.equal(queries.some((sql) => sql.startsWith("UPDATE announcements")), false);
    assert.equal(queries.some((sql) => sql.includes("INSERT INTO schedules")), false);
  } finally { pool.getConnection = originalGetConnection; }
});
