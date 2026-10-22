const timestamp = (value) => {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== "string" || !value.trim()) return NaN;
  const iso = value.replace(" ", "T");
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : `${iso}Z`);
};
const coordinate = (value, bound) => {
  if (!["number", "string"].includes(typeof value) || (typeof value === "string" && !value.trim())) return NaN;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= bound ? number : NaN;
};
const metersBetween = (a, b) => {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2
    + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
};

// A GPS-derived estimate, never an odometer. Keep state across database pages.
const createDistanceAccumulator = () => {
  let previous = null, anchor = null, meters = 0, sampleCount = 0, segments = 0, gaps = 0, rejected = 0;
  return {
    add(row) {
      const point = { lat: coordinate(row.latitude, 90), lng: coordinate(row.longitude, 180),
        time: timestamp(row.captured_at), run: row.route_run_id };
      if (![point.lat, point.lng, point.time].every(Number.isFinite) || !point.run) {
        previous = anchor = null; rejected++; return;
      }
      if (previous && point.time <= previous.time) return;
      sampleCount++;
      if (!previous) { previous = anchor = point; return; }
      const elapsed = point.time - previous.time;
      const resumed = timestamp(row.gps_expected_since);
      if (point.run !== previous.run || elapsed > 30000
          || (Number.isFinite(resumed) && previous.time < resumed && point.time >= resumed)) {
        gaps++; previous = anchor = point; return;
      }
      // Reject impossible jumps without joining either side of the bad fix.
      if (metersBetween(previous, point) / (elapsed / 1000) > 120 / 3.6) {
        rejected++; previous = anchor = null; return;
      }
      segments++;
      const moved = metersBetween(anchor, point);
      // Accumulate slow movement against an anchor instead of discarding every short step.
      // Movement within 15 m of that anchor remains uncertain GPS drift.
      if (moved >= 15) { meters += moved; anchor = point; }
      previous = point;
    },
    summary() {
      return { distance_km: segments ? Number((meters / 1000).toFixed(6)) : null,
        sample_count: sampleCount, segment_count: segments, gap_count: gaps, rejected_points: rejected };
    },
  };
};
module.exports = { createDistanceAccumulator };
