const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const runs = require("./routeRuns.service");
const { startRoute } = require("./routeLifecycle.service");
after(() => pool.end());

const schedule = async (history, exercise) => {
  const original = { query: pool.query, connection: pool.getConnection };
  const statements = []; const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const template = { id: "replacement", truck_id: "truck", driver_id: "driver", start_time: "06:00" };
  pool.query = async () => [[template]];
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    query: async (sql, params = []) => {
      statements.push({ sql, params });
      if (sql.includes("SELECT id FROM route_runs")) {
        if (sql.includes("driver_id = ?")) {
          assert.match(sql, /LIMIT 1 FOR UPDATE/);
          assert.deepEqual(params, [today, template.id, template.truck_id, template.driver_id]);
        }
        // Evaluate the old template-only lookup or the proposed daily assignment lookup.
        const matches = history.filter((run) => run.date === today && (run.route_id === template.id
          || (sql.includes("driver_id = ?") && (run.truck_id === template.truck_id || run.driver_id === template.driver_id)
            && (["SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED", "PARTIAL"].includes(run.status) || run.started))));
        return [matches];
      }
      if (sql.includes("FROM route_stops rs")) return [[]];
      return [{ affectedRows: 1 }];
    },
  });
  try { await exercise({ statements, today }); }
  finally { pool.query = original.query; pool.getConnection = original.connection; }
};

for (const status of ["COMPLETED", "PARTIAL", "ACTIVE", "PAUSED", "SCHEDULED"]) {
  test(`replacement schedules do not create a second daily run after ${status}`, async () => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    await schedule([{ id: "old", route_id: null, date, truck_id: "truck", driver_id: "driver", status }], async ({ statements }) => {
      assert.deepEqual(await runs.autoActivateScheduledRoutes(), []);
      assert.equal(statements.some(({ sql }) => sql.includes("INSERT INTO route_runs")), false);
    });
  });
}
test("a collector who finished on another truck cannot receive another trip today", async () => {
  await schedule([{ id: "old", date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()), truck_id: "other", driver_id: "driver", status: "COMPLETED" }], async () => {
    assert.deepEqual(await runs.autoActivateScheduledRoutes(), []);
  });
});
test("an unstarted cancelled assignment can be replaced", async () => {
  await schedule([{ id: "old", date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()), truck_id: "truck", driver_id: "driver", status: "CANCELLED" }], async () => {
    assert.equal((await runs.autoActivateScheduledRoutes()).length, 1);
  });
});
test("a cancelled trip that had already started cannot be replaced with a second trip today", async () => {
  await schedule([{ id: "old", date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date()), truck_id: "truck", driver_id: "driver", status: "CANCELLED", started: true }], async () => {
    assert.deepEqual(await runs.autoActivateScheduledRoutes(), []);
  });
});
test("yesterday's completed run does not block the next scheduled occurrence", async () => {
  await schedule([{ id: "old", date: "2000-01-01", truck_id: "truck", driver_id: "driver", status: "COMPLETED" }], async () => {
    assert.equal((await runs.autoActivateScheduledRoutes()).length, 1);
  });
});
test("a pending replacement cannot start after a different run has finished today", async () => {
  const original = pool.getConnection; let wrote = false;
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    query: async (sql) => {
      if (sql === "SELECT truck_id FROM route_runs WHERE id = ?") return [[{ truck_id: "truck" }]];
      if (sql.includes("SELECT rr.*, d.user_id")) return [[{ id: "pending", truck_id: "truck", driver_id: "driver", user_id: "collector", assigned_truck_id: "truck", is_today: 1, is_due: 1, driver_status: "ACTIVE", availability_status: "ACTIVE", status: "SCHEDULED" }]];
      if (sql.includes("SELECT id FROM route_runs")) return [sql.includes("COMPLETED") ? [{ id: "finished" }] : []];
      if (sql.startsWith("UPDATE")) { wrote = true; throw new Error("Unexpected run start"); }
      return [[]];
    },
  });
  try {
    await assert.rejects(startRoute("pending", "collector"), (error) => error.statusCode === 409);
    assert.equal(wrote, false);
  } finally { pool.getConnection = original; }
});
