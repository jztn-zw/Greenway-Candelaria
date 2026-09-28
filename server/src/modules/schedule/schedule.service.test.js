const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./schedule.service");
const { updateReminderSchema } = require("./schedule.schema");

after(() => pool.end());

test("reminder timing is fixed and alternate values cannot be saved", async () => {
  assert.equal((await service.getReminder()).timing, 3);
  assert.equal((await service.updateReminder({ timing: 3 })).timing, 3);
  for (const timing of [1, 24]) {
    assert.equal(updateReminderSchema.safeParse({ timing }).success, false);
    await assert.rejects(service.updateReminder({ timing }), (error) => error.statusCode === 400);
  }
});

test("collection scheduler uses 3 hours and does not filter residents by old timing preferences", async () => {
  const originalQuery = pool.query;
  const originalConnection = pool.getConnection;
  let recipientsChecked = 0;
  pool.query = async () => [[{ id: "r1", day_of_week: "SATURDAY", start_time: "08:00:00" }]];
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, rollback: async () => {}, release: () => {},
    query: async (sql, params) => {
      assert.equal(sql.includes("s.reminder_timing"), false);
      assert.match(sql, /notif_collection_reminders/);
      assert.deepEqual(params, ["r1"]);
      recipientsChecked += 1;
      return [[]];
    },
  });
  try {
    await service.dispatchDueCollectionReminders(new Date("2026-09-25T20:59:00Z"));
    assert.equal(recipientsChecked, 0);
    await service.dispatchDueCollectionReminders(new Date("2026-09-25T21:00:00Z"));
    assert.equal(recipientsChecked, 1);
    await service.dispatchDueCollectionReminders(new Date("2026-09-26T00:00:00Z"));
    assert.equal(recipientsChecked, 1);
  } finally {
    pool.query = originalQuery;
    pool.getConnection = originalConnection;
  }
});
