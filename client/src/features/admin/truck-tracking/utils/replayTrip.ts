import type { HistoryRow, RouteStopHistoryItem } from "@/services/trackingService";
import { formatManilaDateTime, parseApiTimestamp } from "@/utils/date";

interface ReplayStop {
  id: string;
  targetName: string;
  order: number;
  status: string;
  startedAt: number | null;
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
    const startedAt = parseApiTimestamp(stop.route_started_at)?.getTime() ?? NaN;
    const routeStops = routes.get(routeId) ?? [];
    const coords = targetCoordinates(stop);
    const status = String(stop.stop_status ?? "").toUpperCase();
    routeStops.push({
      id: JSON.stringify([routeId, stop.stop_id ?? stop.stop_order]),
      targetName,
      location: coords ? { name: targetName, coords, ...((status === "MISSED" || status === "SKIPPED") && stop.skipped_reason ? { skippedReason: stop.skipped_reason } : {}) } : null,
      order: stop.stop_order, status,
      startedAt: Number.isFinite(startedAt) ? startedAt : null,
      endedAt: Number.isFinite(endedAt) ? endedAt : null,
    });
    routes.set(routeId, routeStops);
  }
  const replayStops = [...routes.values()]
    .map((routeStops) => {
      routeStops.sort((a, b) => a.order - b.order);
      // A target begins at collection start, or when the preceding target is
      // completed/skipped. Never carry a boundary across separate route runs.
      const routeStart = routeStops[0].startedAt;
      for (let index = 1; index < routeStops.length; index++) {
        const previous = routeStops[index - 1];
        const boundary = previous.endedAt;
        routeStops[index].startedAt = isTerminal(previous) && boundary !== null
          && (routeStart === null || boundary >= routeStart)
          && (previous.startedAt === null || boundary >= previous.startedAt) ? boundary : null;
      }
      return routeStops;
    })
    .sort((a, b) => (a[0].startedAt ?? Infinity) - (b[0].startedAt ?? Infinity))
    .flat();
  return { path, timestamps: points.map((point) => point.timestamp), times: points.map((point) => point.time), distanceKm: total, stops: replayStops };
};

const isTerminal = (stop: ReplayStop) => ["DONE", "MISSED", "SKIPPED"].includes(stop.status);

export const getReplayTargetState = (stop: ReplayStop, time: number) => {
  if (isTerminal(stop) && stop.endedAt !== null && stop.endedAt <= time) return stop.status === "DONE" ? "completed" : "skipped";
  if (stop.startedAt !== null && stop.startedAt > time) return "upcoming";
  if (stop.startedAt === null || (isTerminal(stop) && stop.endedAt === null)) return "unknown";
  return "current";
};

const currentTargetAt = (trip: ReplayTrip, time: number) =>
  (trip.stops ?? []).find((stop) => getReplayTargetState(stop, time) === "current");

// Follow individual street targets and their recorded completion times as the
// full-trip timeline plays or seeks, without introducing stop transitions.
export const getReplayTargetProgress = (trip: ReplayTrip, pointIndex: number, time = trip.times[pointIndex]) => {
  const stops = trip.stops ?? [];
  const completed = [...new Set(stops
    .filter((stop) => stop.status === "DONE" && stop.endedAt !== null && stop.endedAt <= time)
    .map((stop) => stop.targetName))];
  const current = currentTargetAt(trip, time);
  return { currentTarget: current?.targetName ?? null, targetUnknown: !current && (stops.length === 0 || stops.some((stop) => getReplayTargetState(stop, time) === "unknown")), completed };
};

export const getReplayTargetLocation = (trip: ReplayTrip, pointIndex: number, time = trip.times[pointIndex]): ReplayTargetLocation | null => {
  return currentTargetAt(trip, time)?.location ?? null;
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

// Seek to this exact stop's target interval, including repeated street names.
// When recording begins partway through a target, use its first available GPS
// time. Targets with no playable interval remain listed but cannot be selected.
export const getReplayTargetStartElapsed = (trip: ReplayTrip, stop: ReplayStop) => {
  if (stop.startedAt === null || (isTerminal(stop) && stop.endedAt === null)) return null;
  const start = Math.max(stop.startedAt, trip.times[0]);
  const end = Math.min(isTerminal(stop) ? stop.endedAt! : Infinity, trip.times[trip.times.length - 1]);
  return start < end ? start - trip.times[0] : null;
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
