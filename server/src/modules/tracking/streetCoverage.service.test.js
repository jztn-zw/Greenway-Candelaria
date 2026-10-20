const { test } = require("node:test");
const assert = require("node:assert/strict");
const { matchStreetCoverage, fetchStreetCoverageRoute } = require("./streetCoverage.service");

const way = (id, nodes, geometry, extra = {}) => ({ type: "way", id, nodes,
  geometry: geometry.map(([lat, lon]) => ({ lat, lon })), tags: { highway: "residential", ...extra } });

test("coverage follows a one-way road in either direction without a block detour", () => {
  const a = [14, 121], bend = [14.0001, 121.001], b = [14, 121.002];
  const data = { elements: [way(1, [1, 2, 3], [a, bend, b], { oneway: "yes" }),
    way(2, [1, 4, 5, 3], [a, [13.998, 121], [13.998, 121.002], b])] };
  assert.deepEqual(matchStreetCoverage([a, b], data).coordinates, [a, bend, b]);
  assert.deepEqual(matchStreetCoverage([b, a], data).coordinates, [b, bend, a]);
});

test("pins snap onto road segments, keep their order and preserve bends", () => {
  const data = { elements: [way(1, [1, 2, 3], [[14, 121], [14, 121.001], [14.001, 121.001]])] };
  const result = matchStreetCoverage([[14.00001, 121.0002], [14.0008, 121.00101]], data);
  assert.ok(Math.abs(result.snappedPoints[0][0] - 14) < 1e-9);
  assert.ok(Math.abs(result.snappedPoints[1][1] - 121.001) < 1e-9);
  assert.equal(result.coordinates.length, 3);
  assert.deepEqual(result.coordinates[1], [14, 121.001]);
  assert.equal(result.source, "osm-coverage");
});

test("OSM map JSON node references preserve road shape and ignore one-way direction", () => {
  const data = { elements: [
    { type: "node", id: 1, lat: 14, lon: 121 },
    { type: "node", id: 2, lat: 14.0001, lon: 121.001 },
    { type: "node", id: 3, lat: 14, lon: 121.002 },
    { type: "way", id: 1, nodes: [1, 2, 3], tags: { highway: "residential", oneway: "yes" } },
  ] };
  assert.deepEqual(matchStreetCoverage([[14, 121.002], [14, 121]], data).coordinates,
    [[14, 121.002], [14.0001, 121.001], [14, 121]]);
  assert.throws(() => matchStreetCoverage([[14, 121.002], [14, 121]], { ...data, error: "Partial result" }), { statusCode: 503 });
});

test("two pins on the same segment use only that part of the road", () => {
  const data = { elements: [way(1, [1, 2], [[14, 121], [14, 121.002]])] };
  const pins = [[14, 121.0015], [14, 121.0005]];
  const result = matchStreetCoverage(pins, data);
  assert.equal(result.coordinates.length, 2);
  assert.ok(Math.abs(result.coordinates[0][1] - pins[0][1]) < 1e-9);
  assert.ok(Math.abs(result.coordinates[1][1] - pins[1][1]) < 1e-9);
});

test("crossing lines with different OSM nodes never create a false junction", () => {
  const data = { elements: [
    way(1, [1, 2], [[14, 121], [14, 121.002]]),
    way(2, [3, 4], [[13.999, 121.001], [14.001, 121.001]]),
  ] };
  assert.throws(() => matchStreetCoverage([[14, 121], [14.001, 121.001]], data), { statusCode: 422 });
});

test("off-road points and non-road polygons cannot become coverage", () => {
  const data = { elements: [way(1, [1, 2], [[14, 121], [14, 121.002]]),
    way(2, [3, 4, 3], [[15, 122], [15, 122.001], [15, 122]], { area: "yes" })] };
  assert.throws(() => matchStreetCoverage([[15, 122], [15, 122.001]], data), { statusCode: 422 });
});

test("ordered intermediate pins guide the path even when that repeats a road section", () => {
  const data = { elements: [way(1, [1, 2, 3], [[14, 121], [14, 121.001], [14, 121.002]])] };
  const pins = [[14, 121], [14, 121.002], [14, 121.001]];
  assert.deepEqual(matchStreetCoverage(pins, data).coordinates, [...pins.slice(0, 1), [14, 121.001], ...pins.slice(1)]);
});

test("coverage requests mapped ways, shares concurrent loads and reuses map data in reverse", async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    const request = new URL(url);
    assert.ok(request.toString().startsWith(process.env.COVERAGE_MAP_URL || "https://api.openstreetmap.org/api/0.6/map.json"));
    assert.equal(request.searchParams.get("bbox"), "120.995,13.995,121.005,14.005");
    assert.equal(options.headers["User-Agent"], "GreenWay-StreetCoverage/1.0");
    assert.doesNotMatch(url, /route\/v1/);
    return { ok: true, text: async () => JSON.stringify({ elements: [way(1, [1, 2], [[14, 121], [14, 121.002]], { oneway: "yes" })] }) };
  };
  try {
    const pins = [[14, 121], [14, 121.002]];
    const results = await Promise.all([fetchStreetCoverageRoute(pins), fetchStreetCoverageRoute(pins)]);
    assert.deepEqual(results[0], results[1]);
    assert.deepEqual((await fetchStreetCoverageRoute(pins.slice().reverse())).coordinates, pins.slice().reverse());
    assert.equal(calls, 1);
  } finally { global.fetch = original; }
});

test("coverage map outages and partial responses never fall back to driving or straight lines", async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => { throw new Error("offline"); };
    await assert.rejects(fetchStreetCoverageRoute([[14.01, 121.01], [14.011, 121.011]]), { statusCode: 503 });
    global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ elements: [], remark: "runtime timeout" }) });
    await assert.rejects(fetchStreetCoverageRoute([[14.01, 121.01], [14.011, 121.011]]), { statusCode: 503 });
    global.fetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(fetchStreetCoverageRoute([[14.01, 121.01], [14.011, 121.011]]), { statusCode: 429 });
  } finally { global.fetch = original; }
});

test("large coverage areas are rejected before contacting a provider", async () => {
  await assert.rejects(fetchStreetCoverageRoute([[14, 121], [15, 122]]), { statusCode: 422 });
});
