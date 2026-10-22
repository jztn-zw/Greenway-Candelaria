const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { createDistanceAccumulator } = require("./trackingDistance");
const { getTodayDistanceSummaries, getRunDistanceSummary, getRunDistanceSummaries } = require("./trackingDistance.service");
const { pool } = require("../../config/db");
after(() => pool.end());

const row = (lat, seconds, extra = {}) => ({ latitude: lat, longitude: 0,
  captured_at: new Date(Date.UTC(2026, 9, 21, 1, 0, seconds)).toISOString(), route_run_id: "run-1", ...extra });
const summarize = rows => { const state = createDistanceAccumulator(); rows.forEach(p => state.add(p)); return state.summary(); };

test("measures recorded travel with the known great-circle distance, without early rounding", () => {
  const result = summarize([row(0, 0), row(0.001, 5), row(0.002, 10)]);
  assert.ok(Math.abs(result.distance_km - 0.222389853) < 0.000001);
  assert.equal(result.sample_count, 3);
});
test("accumulates slow short steps while filtering stationary drift", () => {
  const slow = summarize(Array.from({ length: 11 }, (_, i) => row(i * 0.00003, i * 5)));
  assert.ok(slow.distance_km > 0.03);
  assert.equal(summarize([row(0, 0), row(0.00003, 5), row(-0.00003, 10), row(0, 15)]).distance_km, 0);
});
test("keeps missing data distinct from recorded stationary travel", () => {
  assert.equal(summarize([]).distance_km, null);
  assert.equal(summarize([row(0, 0)]).distance_km, null);
  assert.equal(summarize([row(0, 0), row(0, 5)]).distance_km, 0);
});
test("does not bridge gaps, route changes, or the saved resume boundary", () => {
  for (const rows of [
    [row(0, 0), row(0.001, 31)],
    [row(0, 0), row(0.001, 5, { route_run_id: "run-2" })],
    [row(0, 0), row(0.001, 5, { gps_expected_since: "2026-10-21 01:00:03" })],
  ]) {
    const result = summarize(rows);
    assert.equal(result.distance_km, null);
    assert.equal(result.gap_count, 1);
  }
});
test("rejects invalid fixes and impossible jumps without adding their return leg", () => {
  const result = summarize([row(0, 0), row(0.001, 5), row(45, 10), row(0.002, 15), row(0.003, 20)]);
  assert.ok(Math.abs(result.distance_km - 0.22239) < 0.000001);
  assert.equal(result.rejected_points, 1);
  const invalid = summarize([row(0, 0), row(null, 5), row(0.002, 10)]);
  assert.equal(invalid.distance_km, null);
  assert.equal(invalid.rejected_points, 1);
});
test("duplicate and out-of-order captures cannot increase the total", () => {
  const result = summarize([row(0, 0), row(0.001, 5), row(0.002, 5), row(0.004, 3), row(0.002, 10)]);
  assert.ok(Math.abs(result.distance_km - 0.22239) < 0.000001);
  assert.equal(result.sample_count, 3);
});
test("keeps a truck's distance state across pages and uses Philippine day boundaries", async () => {
  const points = Array.from({ length: 5002 }, (_, index) => ({
    id: `ping-${index}`, truck_id: "truck-1", route_run_id: "run-1", latitude: index * 0.0001, longitude: 0,
    captured_at: new Date(Date.UTC(2026, 9, 20, 16) + index * 3000).toISOString().slice(0, 23).replace("T", " "),
  }));
  const calls = [];
  const db = { query: async (sql, params) => {
    calls.push({ sql, params }); return [calls.length === 1 ? points.slice(0, 5000) : points.slice(5000)];
  } };
  const result = await getTodayDistanceSummaries(["truck-1", "offline-truck"], { now: new Date("2026-10-21T13:00:00Z"), db });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].params.slice(1), ["2026-10-21", "2026-10-20 16:00:00.000", "2026-10-21 16:00:00.000", "2026-10-21 13:00:00.000"]);
  assert.match(calls[0].sql, /rr\.run_date = \?/);
  assert.match(calls[0].sql, /rr\.ended_at/);
  // Run end times have second precision; GPS fixes have millisecond precision.
  assert.match(calls[0].sql, /tl\.captured_at < DATE_ADD\(rr\.ended_at, INTERVAL 1 SECOND\)/);
  assert.match(calls[1].sql, /tl\.truck_id > \?/);
  const expected = summarize(points);
  assert.equal(result.get("truck-1").distance_km, expected.distance_km);
  assert.equal(result.get("truck-1").sample_count, 5002);
  assert.equal(result.get("offline-truck").distance_km, null);
});
test("empty fleets do not query GPS history", async () => {
  const result = await getTodayDistanceSummaries([], { db: { query: () => { throw Error("Unexpected query"); } } });
  assert.equal(result.size, 0);
});

test("historical run distance keeps its accumulator across pages without a daily cutoff", async () => {
  const points = Array.from({ length: 5002 }, (_, index) => ({ ...row(index * 0.0001, 0), id: String(index),
    captured_at: new Date(Date.UTC(2026, 9, 21, 15) + index * 3000).toISOString() }));
  const calls = [];
  const result = await getRunDistanceSummary("run-1", { db: { query: async (sql, params) => {
    calls.push({ sql, params }); return [calls.length === 1 ? points.slice(0, 5000) : points.slice(5000)];
  } } });
  assert.equal(calls.length, 2);
  assert.equal(result.distance_km, summarize(points).distance_km);
  assert.equal(result.sample_count, 5002);
  assert.deepEqual(calls[0].params, ["run-1"]);
  assert.match(calls[0].sql, /tl.truck_id = rr.truck_id/);
  assert.match(calls[0].sql, /tl.captured_at >= rr.collection_started_at/);
  assert.match(calls[0].sql, /DATE_ADD\(rr.ended_at, INTERVAL 1 SECOND\)/);
  assert.doesNotMatch(calls[0].sql, /run_date =/);
  assert.deepEqual(calls[1].params, ["run-1", points[4999].captured_at, points[4999].captured_at, points[4999].id]);
});

test("historical run distance reports unavailable rather than zero without usable GPS", async () => {
  const result = await getRunDistanceSummary("no-gps", { db: { query: async () => [[]] } });
  assert.equal(result.distance_km, null);
  assert.equal(result.sample_count, 0);
});

test("batched historical distances keep runs separate and distinguish missing GPS from zero", async () => {
  const calls = [];
  const result = await getRunDistanceSummaries(["run-1", "run-2", "no-gps"], { db: { query: async (sql, params) => {
    calls.push({ sql, params });
    return [[row(0, 0), row(0.001, 5), row(1, 0, { route_run_id: "run-2" }), row(1, 5, { route_run_id: "run-2" })]];
  } } });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [["run-1", "run-2", "no-gps"]]);
  assert.match(calls[0].sql, /tl.truck_id = rr.truck_id/);
  assert.match(calls[0].sql, /rr.status IN \('COMPLETED', 'PARTIAL'\)/);
  assert.match(calls[0].sql, /tl.captured_at >= rr.collection_started_at/);
  assert.match(calls[0].sql, /DATE_ADD\(rr.ended_at, INTERVAL 1 SECOND\)/);
  assert.ok(Math.abs(result.get("run-1").distance_km - 0.111195) < 0.000001);
  assert.equal(result.get("run-2").distance_km, 0);
  assert.equal(result.get("no-gps").distance_km, null);
});

test("batched run distances retain accumulator state and cursor order across 5000-row pages", async () => {
  const points = Array.from({ length: 5002 }, (_, i) => ({ ...row(i * 0.0001, 0), id: `ping-${i}`,
    captured_at: new Date(Date.UTC(2026, 9, 21, 15) + i * 3000).toISOString() }));
  const calls = [];
  const result = await getRunDistanceSummaries(["run-1"], { db: { query: async (sql, params) => {
    calls.push({ sql, params }); return [calls.length === 1 ? points.slice(0, 5000) : points.slice(5000)];
  } } });
  assert.equal(calls.length, 2);
  assert.equal(result.get("run-1").distance_km, summarize(points).distance_km);
  assert.equal(result.get("run-1").sample_count, 5002);
  assert.match(calls[1].sql, /tl.route_run_id > \?/);
  assert.deepEqual(calls[1].params, [["run-1"], "run-1", "run-1", points[4999].captured_at, points[4999].captured_at, points[4999].id]);
});

test("analytics GPS reads use bounded run-ID batches and skip empty selections", async () => {
  let calls = 0;
  const db = { query: async (sql, params) => { calls++; assert.ok(params[0].length <= 200); return [[]]; } };
  assert.equal((await getRunDistanceSummaries([], { db })).size, 0);
  assert.equal(calls, 0);
  const ids = Array.from({ length: 201 }, (_, i) => `run-${i}`);
  assert.equal((await getRunDistanceSummaries([...ids, ids[0]], { db })).size, 201);
  assert.equal(calls, 2);
});
