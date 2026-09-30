const { after, test } = require("node:test");
const assert = require("node:assert/strict");

// Use an explicit fixture endpoint; every request below is intercepted.
const originalEndpoint = process.env.ROUTING_BASE_URL;
process.env.ROUTING_BASE_URL = "https://routing.example.test/route/v1/driving";
const { fetchRoadRoute, fetchStreetCoverageRoute } = require("./tracking.service");
const { pool } = require("../../config/db");
if (originalEndpoint === undefined) delete process.env.ROUTING_BASE_URL;
else process.env.ROUTING_BASE_URL = originalEndpoint;
after(() => pool.end());

const withFetch = async (handler, run) => {
  const original = global.fetch;
  global.fetch = handler;
  try { await run(); } finally { global.fetch = original; }
};

test("configured routing preserves road bends, converts axes and shares duplicate requests", async () => {
  let calls = 0;
  await withFetch(async (url, options) => {
    calls++;
    assert.equal(url, "https://routing.example.test/route/v1/driving/121,14;121.01,14.01?overview=full&geometries=geojson");
    assert.deepEqual(options.headers, { "User-Agent": "GreenWay-Fleet/1.0" });
    return { ok: true, json: async () => ({ code: "Ok", routes: [{
      geometry: { coordinates: [[121, 14], [121.002, 14.008], [121.01, 14.01]] },
      distance: 2100, duration: 300,
    }] }) };
  }, async () => {
    const [route, duplicate] = await Promise.all([
      fetchRoadRoute(121, 14, 121.01, 14.01),
      fetchRoadRoute(121, 14, 121.01, 14.01),
    ]);
    assert.equal(route.source, "osrm");
    assert.deepEqual(route.coordinates, [[14, 121], [14.008, 121.002], [14.01, 121.01]]);
    assert.equal(route.distanceMeters, 2100);
    assert.equal(route.durationSeconds, 300);
    assert.deepEqual(duplicate, route);
    assert.deepEqual(await fetchRoadRoute(121, 14, 121.01, 14.01), route);
    assert.equal(calls, 1);
  });
});

test("a provider outage returns an explicitly marked straight-line estimate", async () => {
  await withFetch(async () => { throw new Error("Provider unavailable"); }, async () => {
    const route = await fetchRoadRoute(121, 14, 121.02, 14.02);
    assert.equal(route.source, "haversine");
    assert.deepEqual(route.coordinates, [[14, 121], [14.02, 121.02]]);
  });
});

test("malformed provider geometry cannot become a road-following route", async () => {
  await withFetch(async () => ({ ok: true, json: async () => ({
    code: "Ok", routes: [{ geometry: { coordinates: [[121, 14], [999, 14]] } }],
  }) }), async () => {
    const route = await fetchRoadRoute(121, 14, 121.03, 14.03);
    assert.equal(route.source, "haversine");
    assert.deepEqual(route.coordinates, [[14, 121], [14.03, 121.03]]);
  });
});

test("street coverage routes marked points together and preserves road bends", async () => {
  const points = [[14, 121], [14.001, 121.002], [14.002, 121.004]];
  const geometry = [[121, 14], [121.001, 14.0005], [121.002, 14.001], [121.003, 14.0012], [121.004, 14.002]];
  let calls = 0;
  await withFetch(async (url) => {
    calls++;
    assert.equal(url, "https://routing.example.test/route/v1/driving/121,14;121.002,14.001;121.004,14.002?overview=full&geometries=geojson&radiuses=50;50;50");
    return { ok: true, json: async () => ({ code: "Ok", routes: [{ geometry: { coordinates: geometry } }], waypoints: points.map(([lat, lng]) => ({ location: [lng, lat] })) }) };
  }, async () => {
    const [route, duplicate] = await Promise.all([fetchStreetCoverageRoute(points), fetchStreetCoverageRoute(points)]);
    assert.deepEqual(route.coordinates, geometry.map(([lng, lat]) => [lat, lng]));
    assert.deepEqual(route.snappedPoints, points);
    assert.equal(route.source, "osrm");
    assert.deepEqual(duplicate, route);
    assert.equal(calls, 1);
  });
});

test("street coverage cannot silently fall back to a straight line during a provider outage", async () => {
  await withFetch(async () => { throw new Error("offline"); }, async () => {
    await assert.rejects(fetchStreetCoverageRoute([[14, 121], [14.004, 121.005]]), { statusCode: 503 });
  });
});

test("street coverage refuses points snapped far away from the chosen street", async () => {
  await withFetch(async () => ({ ok: true, json: async () => ({ code: "Ok",
    routes: [{ geometry: { coordinates: [[121, 14], [121.01, 14.01]] } }],
    waypoints: [{ location: [121, 14] }, { location: [121.01, 14.01] }],
  }) }), async () => {
    await assert.rejects(fetchStreetCoverageRoute([[14, 121], [14.2, 121.2]]), { statusCode: 422 });
  });
});
