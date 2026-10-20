// Street coverage describes a place, not driving instructions. Use the mapped
// road topology in both directions; truck navigation keeps its OSRM profile.
const ROAD_TYPES = "motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|service|road|pedestrian|track";
const roadTypes = new Set(ROAD_TYPES.split("|"));
const fail = (message, statusCode = 422) => { throw { statusCode, message }; };
const valid = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
const cache = new Map();
const requests = new Map();

// Distances are local metres; the query is bounded to a small street area.
const projection = (latitude) => {
  const scale = Math.cos(latitude * Math.PI / 180);
  return ([lat, lng]) => [lng * scale * 111195, lat * 111195];
};

const shortestPath = (graph, start, end) => {
  const distances = new Map([[start, 0]]), previous = new Map();
  const queue = [];
  const push = (item) => {
    queue.push(item);
    let index = queue.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (queue[parent][0] <= item[0]) break;
      queue[index] = queue[parent]; index = parent;
    }
    queue[index] = item;
  };
  const pop = () => {
    const first = queue[0], last = queue.pop();
    if (queue.length) {
      let index = 0;
      while (index * 2 + 1 < queue.length) {
        let child = index * 2 + 1;
        if (child + 1 < queue.length && queue[child + 1][0] < queue[child][0]) child++;
        if (queue[child][0] >= last[0]) break;
        queue[index] = queue[child]; index = child;
      }
      queue[index] = last;
    }
    return first;
  };
  push([0, start]);
  while (queue.length) {
    const [distance, id] = pop();
    if (distance !== distances.get(id)) continue;
    if (id === end) {
      const path = [end];
      while (path.at(-1) !== start) path.push(previous.get(path.at(-1)));
      return path.reverse();
    }
    for (const [next, weight] of graph.get(id) ?? []) {
      const total = distance + weight;
      if (total >= (distances.get(next) ?? Infinity)) continue;
      distances.set(next, total); previous.set(next, id); push([total, next]);
    }
  }
  fail("These points are on disconnected mapped roads. Add a pin at the connecting street or choose a shorter section.");
};

const matchStreetCoverage = (points, data) => {
  if (!Array.isArray(points) || points.length < 2 || points.length > 100 || !points.every(valid)) fail("Choose 2 to 100 valid street points.", 400);
  if (!Array.isArray(data?.elements) || data.remark || data.error || data.elements.some(e => e.type === "error" || e.error)) fail("Street map data is unavailable. Please try again.", 503);
  const project = projection(points[0][0]);
  const length = (a, b) => { const x = project(a), y = project(b); return Math.hypot(x[0] - y[0], x[1] - y[1]); };
  const coordinates = new Map(), segments = new Map();
  const nodeLocations = new Map(data.elements.filter(e => e.type === "node").map(e => [e.id, e]));
  for (const way of data.elements) {
    if (way.type !== "way" || !roadTypes.has(way.tags?.highway) || way.tags?.area === "yes" ||
        !Array.isArray(way.nodes)) continue;
    const geometry = way.geometry ?? way.nodes.map(id => nodeLocations.get(id));
    if (!Array.isArray(geometry) || way.nodes.length !== geometry.length) continue;
    for (let index = 1; index < way.nodes.length; index++) {
      const a = geometry[index - 1], b = geometry[index];
      const from = [a?.lat, a?.lon], to = [b?.lat, b?.lon];
      if (!valid(from) || !valid(to) || !Number.isSafeInteger(way.nodes[index - 1]) || !Number.isSafeInteger(way.nodes[index])) continue;
      const aId = `n${way.nodes[index - 1]}`, bId = `n${way.nodes[index]}`;
      if (aId === bId || length(from, to) === 0) continue;
      coordinates.set(aId, from); coordinates.set(bId, to);
      const key = [aId, bId].sort().join(":");
      if (!segments.has(key)) segments.set(key, { aId, bId, from, to, pins: [] });
      if (segments.size > 20000) fail("This street area is too large. Draw a shorter section.");
    }
  }
  const snapped = points.map((point, index) => {
    const p = project(point);
    let best = null, gap = 50;
    for (const segment of segments.values()) {
      const a = project(segment.from), b = project(segment.to);
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
      const distance = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
      if (distance <= gap) { gap = distance; best = { segment, t }; }
    }
    if (!best) fail("Move the numbered points closer to a mapped street and try again.");
    const { segment, t } = best;
    const id = t <= 1e-9 ? segment.aId : t >= 1 - 1e-9 ? segment.bId : `p${index}`;
    const pointOnRoad = id.startsWith("n") ? coordinates.get(id) : [
      segment.from[0] + t * (segment.to[0] - segment.from[0]),
      segment.from[1] + t * (segment.to[1] - segment.from[1]),
    ];
    coordinates.set(id, pointOnRoad); segment.pins.push({ id, t });
    return id;
  });
  const graph = new Map();
  const connect = (a, b) => {
    if (a === b) return;
    const weight = length(coordinates.get(a), coordinates.get(b));
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);
    graph.get(a).push([b, weight]); graph.get(b).push([a, weight]);
  };
  for (const segment of segments.values()) {
    const vertices = [{ id: segment.aId, t: 0 }, ...segment.pins, { id: segment.bId, t: 1 }].sort((a, b) => a.t - b.t);
    for (let index = 1; index < vertices.length; index++) connect(vertices[index - 1].id, vertices[index].id);
  }
  const path = [];
  for (let index = 1; index < snapped.length; index++) {
    const leg = shortestPath(graph, snapped[index - 1], snapped[index]);
    path.push(...(index === 1 ? leg : leg.slice(1)));
  }
  const result = path.map(id => coordinates.get(id)).filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]);
  if (result.length < 2) fail("Choose at least two different points along the street.");
  return { coordinates: result, snappedPoints: snapped.map(id => coordinates.get(id)), source: "osm-coverage" };
};

const fetchStreetCoverageRoute = async (points) => {
  if (!Array.isArray(points) || points.length < 2 || points.length > 100 || !points.every(valid)) fail("Choose 2 to 100 valid street points.", 400);
  const latitudes = points.map(p => p[0]), longitudes = points.map(p => p[1]);
  // Quantized, padded bounds let nearby clicks share the same cached road data.
  const bounds = [Math.floor((Math.min(...latitudes) - 0.002) * 200) / 200,
    Math.floor((Math.min(...longitudes) - 0.002) * 200) / 200,
    Math.ceil((Math.max(...latitudes) + 0.002) * 200) / 200,
    Math.ceil((Math.max(...longitudes) + 0.002) * 200) / 200];
  if (bounds[2] - bounds[0] > 0.05 || bounds[3] - bounds[1] > 0.05) fail("This street area is too large. Draw a shorter section.");
  const key = bounds.join(",");
  let data = cache.get(key);
  if (!data || data.expires <= Date.now()) {
    if (!requests.has(key)) {
      if (requests.size >= 4) fail("Street matching is busy. Please retry shortly.", 429);
      const request = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const endpoint = new URL(process.env.COVERAGE_MAP_URL || "https://api.openstreetmap.org/api/0.6/map.json");
          endpoint.searchParams.set("bbox", [bounds[1], bounds[0], bounds[3], bounds[2]].join(","));
          const response = await fetch(endpoint.toString(), {
            headers: { "User-Agent": "GreenWay-StreetCoverage/1.0" }, signal: controller.signal,
          });
          if (response.status === 400) fail("This street area has too much map data. Draw a shorter section.");
          if (!response.ok) fail("Street map data is unavailable. Please try again.", response.status === 429 ? 429 : 503);
          const text = await response.text();
          if (Buffer.byteLength(text) > 8 * 1024 * 1024) fail("Street map data is too large. Draw a shorter section.");
          const value = JSON.parse(text);
          if (!Array.isArray(value.elements) || value.remark || value.error || value.elements.some(e => e.type === "error" || e.error)) fail("Street map data is unavailable. Please try again.", 503);
          for (const [old, entry] of cache) if (entry.expires <= Date.now()) cache.delete(old);
          if (cache.size >= 16) cache.delete(cache.keys().next().value);
          const entry = { value, expires: Date.now() + 10 * 60 * 1000 };
          cache.set(key, entry);
          return entry;
        } catch (error) {
          if (error.statusCode) throw error;
          fail("Street map data is unavailable. Please try again.", 503);
        } finally { clearTimeout(timeout); }
      })();
      requests.set(key, request);
    }
    try { data = await requests.get(key); }
    finally { requests.delete(key); }
  }
  return matchStreetCoverage(points, data.value);
};

module.exports = { fetchStreetCoverageRoute, matchStreetCoverage };
