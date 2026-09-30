import api from '@/lib/api';
/**
 * roadRoutingService.ts
 *
 * Real-time road snapping and routing service using OpenStreetMap OSRM driving engine.
 * Computes road-following routes along actual streets and highways in Candelaria, Quezon.
 * Features in-memory caching and graceful fallback to straight-line navigation.
 */

export interface RoadRouteResult {
  coordinates: [number, number][]; // [lat, lng] pairs for Leaflet polylines
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  source: 'osrm' | 'haversine';
}

interface CacheEntry {
  result: RoadRouteResult;
  timestamp: number;
}

const ROUTE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds TTL for fast cache hits
const DEFAULT_SPEED_KMH = 22; // Typical collection vehicle speed in urban/barangay roads

/**
 * Calculates straight-line Haversine distance in kilometers.
 */
export const calculateHaversineDistanceKm = (
  from: [number, number],
  to: [number, number]
): number => {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

/**
 * Builds a fallback route when road routing is unavailable.
 */
const buildFallbackRoute = (
  from: [number, number],
  to: [number, number]
): RoadRouteResult => {
  const distanceKm = calculateHaversineDistanceKm(from, to);
  const distanceMeters = Math.round(distanceKm * 1000);
  const durationMinutes = Math.max(1, Math.round((distanceKm / DEFAULT_SPEED_KMH) * 60));
  const durationSeconds = durationMinutes * 60;

  return {
    coordinates: [from, to],
    distanceMeters,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationSeconds,
    durationMinutes,
    source: 'haversine',
  };
};


const IN_FLIGHT = new Map<string, Promise<RoadRouteResult>>();
const validPoint = (p: [number, number]) =>
  p.every(Number.isFinite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
const remember = (key: string, result: RoadRouteResult) => {
  for (const [oldKey, entry] of ROUTE_CACHE) {
    if (Date.now() - entry.timestamp >= CACHE_TTL_MS) ROUTE_CACHE.delete(oldKey);
  }
  if (ROUTE_CACHE.size >= 128) ROUTE_CACHE.delete(ROUTE_CACHE.keys().next().value!);
  ROUTE_CACHE.set(key, { result, timestamp: Date.now() });
  return result;
};
export const getRoadRoute = async (
  from: [number, number], to: [number, number],
): Promise<RoadRouteResult> => {
  if (!validPoint(from) || !validPoint(to)) throw new Error("Invalid route coordinates");
  const key = [from, to].map((point) => point.map((v) => v.toFixed(4)).join(",")).join(">");
  const cached = ROUTE_CACHE.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.result;
  const pending = IN_FLIGHT.get(key);
  if (pending) return pending;
  if (IN_FLIGHT.size >= 12) return buildFallbackRoute(from, to);
  const request = (async () => {
    try {
      const res = await api.get<{ data: RoadRouteResult }>("/tracking/road-route", {
        params: { fromLng: from[1], fromLat: from[0], toLng: to[1], toLat: to[0] },
        timeout: 8000,
      });
      const result = res.data.data;
      if (result?.coordinates?.length >= 2) return remember(key, result);
    } catch {
      // Keep a local estimate if the backend's configured provider is unavailable.
    }
    return remember(key, buildFallbackRoute(from, to));
  })();
  IN_FLIGHT.set(key, request);
  try { return await request; } finally { IN_FLIGHT.delete(key); }
};
export const getMultiStopRoadRoute = async (points: [number, number][]): Promise<RoadRouteResult> => {
  const waypoints = points.filter(validPoint);
  const legs: RoadRouteResult[] = [];
  for (let index = 1; index < waypoints.length; index++) {
    legs.push(await getRoadRoute(waypoints[index - 1], waypoints[index]));
  }
  const distanceMeters = legs.reduce((sum, leg) => sum + leg.distanceMeters, 0);
  const durationSeconds = legs.reduce((sum, leg) => sum + leg.durationSeconds, 0);
  return {
    coordinates: legs.length ? legs.flatMap((leg, index) => index ? leg.coordinates.slice(1) : leg.coordinates) : waypoints,
    distanceMeters, distanceKm: distanceMeters / 1000, durationSeconds,
    durationMinutes: Math.ceil(durationSeconds / 60),
    source: legs.length && legs.every((leg) => leg.source === "osrm") ? "osrm" : "haversine",
  };
};

export const getStreetCoverageRoadPath = async (points: [number, number][], signal: AbortSignal) => {
  const response = await api.post<{ data: {
    coordinates: [number, number][];
    snappedPoints: [number, number][];
    source: string;
  } }>("/tracking/street-coverage-route", { points }, { signal, timeout: 8000 });
  const result = response.data.data;
  if (result?.source !== "osrm" || !Array.isArray(result.coordinates) || result.coordinates.length < 2 ||
      !Array.isArray(result.snappedPoints) || result.snappedPoints.length !== points.length ||
      !result.coordinates.every(validPoint) || !result.snappedPoints.every(validPoint)) {
    throw new Error("Road matching is unavailable. Please try again.");
  }
  return result;
};
