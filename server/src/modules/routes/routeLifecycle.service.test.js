const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const lifecycle = require("./routeLifecycle.service");
const tracking = require("../tracking/tracking.service");

// A transaction fixture exercises outcomes, rollback and serialized races.
const fixture = async (options, exercise) => {
  let state = {
    run: {
      id: "run", truck_id: "truck", driver_id: "driver", user_id: "collector",
      assigned_truck_id: "truck", truck_name: "Truck 1", availability_status: "ACTIVE",
      is_today: 1, is_due: 1, driver_status: "ACTIVE", status: "ACTIVE",
      collection_started_at: new Date(Date.now() - 300000).toISOString(),
      ...options.run,
    },
    stops: options.stops || [{ id: "first", status: "NOT_STARTED", barangay_id: "brgy", street_id: "street", location: "Main Street" }],
    notifications: [], logs: [], latest: null, truckStatus: "ON_THE_WAY",
  };
  const originalQuery = pool.query, originalConnection = pool.getConnection;
  let queue = Promise.resolve();
  let commits = 0, rollbacks = 0;
  pool.query = async (sql) => {
    if (sql.includes("SELECT rr.id FROM route_runs")) return [["ACTIVE"].includes(state.run.status) ? { id: "run" } : null].map((v) => v ? [v] : []);
    if (sql.startsWith("SELECT id FROM route_runs WHERE status = 'ACTIVE'")) return [state.run.status === "ACTIVE" && !state.run.gps_alert_at ? [{ id: "run" }] : []];
    throw new Error("Unexpected pool query: " + sql);
  };
  pool.getConnection = async () => {
    let local, unlock;
    return {
      beginTransaction: async () => {},
      commit: async () => { state = local; commits++; },
      rollback: async () => { rollbacks++; },
      release: () => unlock?.(),
      query: async (sql, params = []) => {
        if (sql === "SELECT truck_id FROM route_runs WHERE id = ?") return [[{ truck_id: "truck" }]];
        if (sql === "SELECT id FROM trucks WHERE id = ? FOR UPDATE") {
          const previous = queue;
          queue = new Promise((resolve) => { unlock = resolve; });
          await previous;
          local = structuredClone(state);
          return [[{ id: "truck" }]];
        }
        if (sql.includes("SELECT rr.*, d.user_id")) return [[local.run]];
        if (sql.includes("FROM route_run_stops rs")) {
          const remaining = local.stops.filter((stop) => !["DONE", "MISSED"].includes(stop.status));
          return [sql.includes("LIMIT 1") ? remaining.slice(0, 1) : sql.includes("NOT IN") ? remaining : local.stops];
        }
        if (sql.startsWith("UPDATE route_run_stops SET status = ?")) {
          Object.assign(local.stops.find((s) => s.id === params[3]), { status: params[0], skipped_reason: params[2], completed_at: "original-time" });
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith("UPDATE route_run_stops SET status = 'MISSED'")) {
          local.stops.filter((s) => !["DONE", "MISSED"].includes(s.status)).forEach((s) => { s.status = "MISSED"; });
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith("UPDATE route_run_stops SET")) {
          const field = sql.match(/SET (\w+)/)[1];
          local.stops.find((s) => s.id === params[0])[field] = "notified";
          return [{ affectedRows: 1 }];
        }
        if (sql.includes("COUNT(*) AS total")) return [[{ total: local.stops.length, completed: local.stops.filter((s) => s.status === "DONE").length }]];
        if (sql.includes("SELECT u.id FROM users")) {
          return [sql.includes("u.role = 'ADMIN'") ? [{ id: "admin" }] : Array.from({ length: options.residents || 1 }, (_, i) => ({ id: "resident-" + i }))];
        }
        if (sql.includes("INSERT INTO notifications")) {
          local.notifications.push(...params[0]);
          if (options.failDelivery && local.notifications.length > 500) throw new Error("notification insert failed");
          return [{ affectedRows: params[0].length }];
        }
        if (sql.startsWith("UPDATE route_runs SET status")) {
          local.run.status = params[0];
          if (sql.includes("ended_at")) local.run.ended_at = "ended";
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith("UPDATE trucks SET status")) { local.truckStatus = sql.includes("'DONE'") ? "DONE" : params[0]; return [{ affectedRows: 1 }]; }
        if (sql.startsWith("DELETE FROM tracking_latest")) { local.latest = null; return [{ affectedRows: 1 }]; }
        if (sql.startsWith("DELETE FROM notifications")) {
          local.notifications = local.notifications.filter((row) => row[6] !== "tracking-stale-gps");
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith("SELECT captured_at FROM tracking_latest")) return [local.latest ? [local.latest] : []];
        if (sql.startsWith("UPDATE route_runs SET gps_alert_at")) {
          local.run.gps_alert_at = sql.includes("= NULL") ? null : "alerted";
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith("SELECT * FROM tracking_latest")) return [local.latest ? [local.latest] : []];
        if (sql.startsWith("SELECT id FROM tracking_logs")) return [local.logs.filter((s) => s.sample_id === params[0])];
        if (sql.startsWith("INSERT INTO tracking_logs")) {
          local.logs.push({ id: params[0], sample_id: params[6], captured_at: params[7] });
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith("INSERT INTO tracking_latest")) {
          local.latest = { truck_id: params[0], route_run_id: params[1], sample_id: params[3], captured_at: params[6] };
          return [{ affectedRows: 1 }];
        }
        throw new Error("Unexpected transaction query: " + sql);
      },
    };
  };
  try { await exercise(() => state, () => ({ commits, rollbacks })); }
  finally { pool.query = originalQuery; pool.getConnection = originalConnection; }
};
const actor = { id: "collector", role: "DRIVER" };

test("the final done stop completes the run and persists resident/admin notices once", async () => {
  await fixture({}, async (state) => {
    await lifecycle.updateStopStatus("run", "first", "DONE", null, actor);
    assert.equal(state().run.status, "COMPLETED");
    assert.equal(state().truckStatus, "DONE");
    assert.deepEqual(state().notifications.map((row) => row[2]), ["COLLECTION_DONE", "SYSTEM"]);
    const completedAt = state().stops[0].completed_at;
    await lifecycle.updateStopStatus("run", "first", "DONE", null, actor);
    await lifecycle.endRoute("run", actor);
    assert.equal(state().notifications.length, 2);
    assert.equal(state().stops[0].completed_at, completedAt);
  });
});
test("ending early marks only unfinished stops missed and produces a partial summary", async () => {
  await fixture({ stops: [
    { id: "first", status: "DONE", location: "First", completed_at: "yesterday" },
    { id: "second", status: "NOT_STARTED", location: "Second", barangay_id: "brgy", street_id: "street" },
  ] }, async (state) => {
    await lifecycle.endRoute("run", actor);
    assert.equal(state().run.status, "PARTIAL");
    assert.equal(state().stops[0].completed_at, "yesterday");
    assert.equal(state().stops[1].status, "MISSED");
    assert.deepEqual(state().notifications.map((row) => row[2]), ["MISSED_COLLECTION", "SYSTEM"]);
  });
});
test("an out-of-order stop and a stop on another collector's run are rejected", async () => {
  await fixture({ stops: [{ id: "first", status: "NOT_STARTED" }, { id: "second", status: "NOT_STARTED" }] }, async (state) => {
    await assert.rejects(lifecycle.updateStopStatus("run", "second", "DONE", null, actor), { statusCode: 409 });
    await assert.rejects(lifecycle.updateStopStatus("run", "first", "DONE", null, { id: "other", role: "DRIVER" }), { statusCode: 404 });
    assert.equal(state().notifications.length, 0);
    assert.equal(state().stops[0].status, "NOT_STARTED");
  });
});
test("partial notification insertion rolls back the stop and every notification chunk", async () => {
  await fixture({ residents: 501, failDelivery: true }, async (state, counts) => {
    await assert.rejects(lifecycle.updateStopStatus("run", "first", "DONE", null, actor), /notification insert failed/);
    assert.equal(state().stops[0].status, "NOT_STARTED");
    assert.equal(state().notifications.length, 0);
    assert.equal(counts().commits, 0);
    assert.equal(counts().rollbacks, 1);
  });
});
test("a pause racing with route end cannot reopen the completed run", async () => {
  await fixture({}, async (state) => {
    const results = await Promise.allSettled([
      lifecycle.endRoute("run", actor), lifecycle.setRoutePaused("run", actor.id, true),
    ]);
    assert.equal(results[0].status, "fulfilled");
    assert.equal(results[1].status, "rejected");
    assert.equal(state().run.status, "PARTIAL");
  });
});
test("GPS rejects unstarted, paused, previous-day and reassigned routes", async () => {
  for (const run of [{ collection_started_at: null }, { status: "PAUSED" }, { is_today: 0 }, { assigned_truck_id: "another" }]) {
    await fixture({ run }, async (state) => {
      await assert.rejects(tracking.ping("collector", { truck_id: "truck", latitude: 14, longitude: 121 }), { statusCode: 409 });
      assert.equal(state().logs.length, 0);
    });
  }
});
test("GPS retries and older samples never move the accepted location backwards", async () => {
  await fixture({}, async (state) => {
    const captured = new Date().toISOString();
    const sample = { truck_id: "truck", latitude: 14, longitude: 121, sample_id: "sample", captured_at: captured };
    assert.equal((await tracking.ping("collector", sample)).accepted, true);
    assert.equal((await tracking.ping("collector", sample)).accepted, false);
    assert.equal((await tracking.ping("collector", { ...sample, sample_id: "older", captured_at: new Date(Date.now() - 10000).toISOString() })).accepted, false);
    assert.equal(state().logs.length, 1);
  });
});
test("an expired GPS sample is rejected and cannot change truck status", async () => {
  await fixture({}, async (state) => {
    await assert.rejects(tracking.ping("collector", {
      truck_id: "truck", latitude: 14, longitude: 121, captured_at: new Date(Date.now() - 180000).toISOString(),
    }), { statusCode: 422 });
    assert.equal(state().logs.length, 0);
    assert.equal(state().truckStatus, "ON_THE_WAY");
  });
});

test("GPS outage notices deduplicate, clear on recovery, and can alert on a second outage", async () => {
  await fixture({}, async (state) => {
    assert.equal(await tracking.notifyStaleGpsRoutes(), 1);
    assert.equal(await tracking.notifyStaleGpsRoutes(), 0);
    assert.equal(state().notifications.length, 1);
    await tracking.ping("collector", {
      truck_id: "truck", latitude: 14, longitude: 121, sample_id: "recovery", captured_at: new Date().toISOString(),
    });
    assert.equal(state().run.gps_alert_at, null);
    assert.equal(state().notifications.length, 0);
    state().latest.captured_at = new Date(Date.now() - 130000).toISOString();
    assert.equal(await tracking.notifyStaleGpsRoutes(), 1);
    assert.equal(state().notifications.length, 1);
  });
});

// Release the idle database-pool timer after mocked database tests.
after(() => pool.end());
