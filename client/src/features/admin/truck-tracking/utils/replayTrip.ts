import type { HistoryRow, RouteStopHistoryItem } from "@/services/trackingService";
import { formatManilaDateTime, parseApiTimestamp } from "@/utils/date";

interface ReplayStop {
  targetName: string;
  order: number;
  status: string;
  endedAt: number | null;
  location: ReplayTargetLocation | null;
}

export interface ReplayTargetLocation {
  name: string;
  coords: [number, number];
  skippedReason?: string;
}

export interface ReplayTrip {
  path: [number, number][];
  timestamps: string[];
  times: number[];
  distanceKm: number;
  stops?: ReplayStop[];
}

const coordinate = (value: unknown): number | null => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const targetCoordinates = (stop: RouteStopHistoryItem): [number, number] | null => {
  const pair = (value: unknown): [number, number] | null => {
    if (!Array.isArray(value) || value.length < 2) return null;
    const lat = coordinate(value[0]), lng = coordinate(value[1]);
    return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
  };
  let path: unknown = stop.coverage_path;
  if (typeof path === "string") {
    try { path = JSON.parse(path); } catch { path = null; }
  }
  if (Array.isArray(path)) {
    for (const point of path) {
      const coords = pair(point);
      if (coords) return coords;
    }
  }
  // History latitude/longitude are barangay centers. Use them only for a
  // barangay target; a street target needs its saved street geometry.
  const streetTarget = Boolean(stop.street_id) || (Boolean(stop.stop_name) && stop.stop_name !== stop.barangay_name);
  return streetTarget ? null : pair([stop.latitude, stop.longitude]);
};

const distanceKm = (from: [number, number], to: [number, number]) => {
  const radians = Math.PI / 180;
  const lat = (to[0] - from[0]) * radians;
  const lng = (to[1] - from[1]) * radians;
  const a = Math.sin(lat / 2) ** 2 + Math.cos(from[0] * radians) * Math.cos(to[0] * radians) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
};

// Preserve the recorded trail independently of street boundaries or stop outcomes.
export const buildReplayTrip = (logs: HistoryRow[], stops: RouteStopHistoryItem[] = []): ReplayTrip | null => {
  const points = logs.flatMap((log) => {
    const lat = coordinate(log.latitude);
    const lng = coordinate(log.longitude);
    const time = parseApiTimestamp(log.created_at)?.getTime() ?? NaN;
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !Number.isFinite(time)) return [];
    return [{ coords: [lat, lng] as [number, number], timestamp: log.created_at, time }];
  }).sort((a, b) => a.time - b.time);
  if (!points.length) return null;

  const path = points.map((point) => point.coords);
  let total = 0;
  let anchor = path[0];
  for (const point of path.slice(1)) {
    const step = distanceKm(anchor, point);
    if (step >= 0.015) {
      total += step;
      anchor = point;
    }
  }
  const remainder = distanceKm(anchor, path[path.length - 1]);
  if (remainder >= 0.005) total += remainder;

  const routes = new Map<string, ReplayStop[]>();
  for (const stop of stops) {
    const barangayName = String(stop.barangay_name ?? "").trim();
    if (!barangayName) continue;
    const routeId = String(stop.route_id ?? "");
    const streetName = String(stop.stop_name ?? "").trim();
    const targetName = streetName && streetName !== barangayName ? streetName + " (" + barangayName + ")" : barangayName;
    const endedAt = parseApiTimestamp(stop.completed_at)?.getTime() ?? NaN;
    const routeStops = routes.get(routeId) ?? [];
    const coords = targetCoordinates(stop);
    const status = String(stop.stop_status ?? "").toUpperCase();
    routeStops.push({
      targetName,
      location: coords ? { name: targetName, coords, ...((status === "MISSED" || status === "SKIPPED") && stop.skipped_reason ? { skippedReason: stop.skipped_reason } : {}) } : null,
      order: stop.stop_order, status,
      endedAt: Number.isFinite(endedAt) ? endedAt : null,
    });
    routes.set(routeId, routeStops);
  }
  const replayStops = [...routes.values()].flatMap((routeStops) => routeStops.sort((a, b) => a.order - b.order));
  return { path, timestamps: points.map((point) => point.timestamp), times: points.map((point) => point.time), distanceKm: total, stops: replayStops };
};

// Follow individual street targets and their recorded completion times as the
// full-trip timeline plays or seeks, without introducing stop transitions.
export const getReplayTargetProgress = (trip: ReplayTrip, pointIndex: number, time = trip.times[pointIndex]) => {
  const stops = trip.stops ?? [];
  const completed = [...new Set(stops
    .filter((stop) => stop.status === "DONE" && stop.endedAt !== null && stop.endedAt <= time)
    .map((stop) => stop.targetName))];
  for (const stop of stops) {
    const terminal = ["DONE", "MISSED", "SKIPPED"].includes(stop.status);
    if (terminal && stop.endedAt === null) return { currentTarget: null, targetUnknown: true, completed };
    if (terminal && stop.endedAt! <= time) continue;
    return { currentTarget: stop.targetName, targetUnknown: false, completed };
  }
  return { currentTarget: null, targetUnknown: stops.length === 0, completed };
};

export const getReplayTargetLocation = (trip: ReplayTrip, pointIndex: number, time = trip.times[pointIndex]): ReplayTargetLocation | null => {
  for (const stop of trip.stops ?? []) {
    const terminal = ["DONE", "MISSED", "SKIPPED"].includes(stop.status);
    if (terminal && stop.endedAt === null) return null;
    if (terminal && stop.endedAt! <= time) continue;
    return stop.location;
  }
  return null;
};

// Completion pins follow recorded outcomes, independently of the current
// target. Keep each saved location so same-named streets are not conflated.
export const getReplayCompletedTargetLocations = (trip: ReplayTrip, pointIndex: number, time = trip.times[pointIndex]): ReplayTargetLocation[] =>
  (trip.stops ?? []).flatMap((stop) =>
    stop.status === "DONE" && stop.endedAt !== null && stop.endedAt <= time && stop.location ? [stop.location] : []);

export const getReplaySkippedTargetLocations = (trip: ReplayTrip, pointIndex: number, time = trip.times[pointIndex]): ReplayTargetLocation[] =>
  (trip.stops ?? []).flatMap((stop) =>
    (stop.status === "MISSED" || stop.status === "SKIPPED") && stop.endedAt !== null && stop.endedAt <= time && stop.location ? [stop.location] : []);

export const formatReplayTime = (timestamp?: string) => formatManilaDateTime(timestamp, {
  hour: "2-digit", minute: "2-digit", hour12: true,
}, "—");

export const getReplayDuration = (trip: ReplayTrip) => trip.times[trip.times.length - 1] - trip.times[0];

export const formatReplayDuration = (milliseconds: number) => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "0 min";
  if (milliseconds < 60000) return "< 1 min";
  const minutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? hours + " h" + (minutes % 60 ? " " + minutes % 60 + " min" : "") : minutes + " min";
};

export const getReplayGaps = (trip: ReplayTrip) => trip.times.flatMap((end, index) => {
  if (index === 0) return [];
  const start = trip.times[index - 1];
  return end - start > 60000 ? [{ start, end, durationMs: end - start }] : [];
});

// A named street may recur in several runs. Jump to its latest completion at
// the current replay time, only when that event lies inside the GPS timeline.
export const getReplayCompletionElapsed = (trip: ReplayTrip, targetName: string, time: number) => {
  const completion = (trip.stops ?? [])
    .filter((stop) => stop.targetName === targetName && stop.status === "DONE" && stop.endedAt !== null && stop.endedAt <= time)
    .reduce<number | null>((latest, stop) => latest === null ? stop.endedAt : Math.max(latest, stop.endedAt!), null);
  if (completion === null || completion < trip.times[0] || completion > trip.times[trip.times.length - 1]) return null;
  return completion - trip.times[0];
};

export const sampleReplayTrip = (trip: ReplayTrip, progress: number) => {
  const time = trip.times[0] + Math.max(0, Math.min(1, progress)) * getReplayDuration(trip);
  // Find the latest GPS record at this instant. Repeated timestamps represent
  // the same instant, so use the last such record without inventing a delay.
  let low = 0;
  let high = trip.times.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (trip.times[middle] <= time) low = middle;
    else high = middle - 1;
  }
  const index = low;
  const next = Math.min(index + 1, trip.path.length - 1);
  const gap = trip.times[next] - trip.times[index];
  const fraction = gap > 0 ? (time - trip.times[index]) / gap : 0;
  const from = trip.path[index];
  const to = trip.path[next];
  return {
    index,
    position: index + fraction,
    coords: [from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction] as [number, number],
    timestamp: new Date(time).toISOString(),
  };
};
