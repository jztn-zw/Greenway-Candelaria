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
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';
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

/**
 * Generates a stable cache key rounded to 4 decimal places (~11 meters).
 */
const normalizePoint = (pt: any): [number, number] => {
  if (!pt) return [0, 0];
  let lat = NaN;
  let lng = NaN;
  if (Array.isArray(pt)) {
    lat = Number(pt[0]);
    lng = Number(pt[1]);
  } else if (typeof pt === 'object' && pt !== null) {
    lat = Number(pt.lat ?? pt.latitude);
    lng = Number(pt.lng ?? pt.longitude);
  }
  const safeLat = Number.isFinite(lat) ? lat : 0;
  const safeLng = Number.isFinite(lng) ? lng : 0;
  return [safeLat, safeLng];
};

const makeCacheKey = (points: [number, number][]): string => {
  return points
    .map((pt) => {
      const [lat, lng] = normalizePoint(pt);
      return `${lat.toFixed(4)},${lng.toFixed(4)}`;
    })
    .join('->');
};

/**
 * Fetches a road-snapped driving route between two points.
 * Returns an exact street polyline, road distance in km, and duration in minutes.
 */
const ROUTING_PROVIDERS = [
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  'https://router.project-osrm.org/route/v1/driving',
];

export const getRoadRoute = async (
  rawFromCoords: [number, number],
  rawToCoords: [number, number]
): Promise<RoadRouteResult> => {
  const fromCoords = normalizePoint(rawFromCoords);
  const toCoords = normalizePoint(rawToCoords);

  if (!rawFromCoords || !rawToCoords || (fromCoords[0] === 0 && fromCoords[1] === 0 && toCoords[0] === 0 && toCoords[1] === 0)) {
    return buildFallbackRoute(fromCoords, toCoords);
  }

  const cacheKey = makeCacheKey([fromCoords, toCoords]);
  const cached = ROUTE_CACHE.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // Tier 1: Try first-party backend proxy
  try {
    const res = await api.get<{ data: RoadRouteResult }>('/tracking/road-route', {
      params: {
        fromLng: fromCoords[1],
        fromLat: fromCoords[0],
        toLng: toCoords[1],
        toLat: toCoords[0],
      },
      timeout: 5000,
    });
    const payload = res.data?.data || (res.data as unknown as RoadRouteResult);
    if (payload?.coordinates && payload.coordinates.length > 2) {
      ROUTE_CACHE.set(cacheKey, { result: payload, timestamp: now });
      return payload;
    }
  } catch {
    // Proceed to direct browser fetch against OSM routing mirrors
  }

  // Tier 2: Try direct routing provider endpoints
  for (const baseUrl of ROUTING_PROVIDERS) {
    const coordinatesParam = `${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}`;
    const url = `${baseUrl}/${coordinatesParam}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) continue;

      const primaryRoute = data.routes[0];
      const geoJsonCoords: [number, number][] = primaryRoute.geometry.coordinates;
      const leafletCoords: [number, number][] = geoJsonCoords.map(([lng, lat]) => [lat, lng]);

      const distanceMeters = Number(primaryRoute.distance) || 0;
      const distanceKm = Number((distanceMeters / 1000).toFixed(2));
      const durationSeconds = Number(primaryRoute.duration) || 0;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

      const result: RoadRouteResult = {
        coordinates: leafletCoords,
        distanceMeters,
        distanceKm,
        durationSeconds,
        durationMinutes,
        source: 'osrm',
      };

      ROUTE_CACHE.set(cacheKey, { result, timestamp: now });
      return result;
    } catch {
      clearTimeout(timeoutId);
    }
  }

  return buildFallbackRoute(fromCoords, toCoords);
};

/**
 * Fetches a multi-stop road-snapped route connecting multiple consecutive waypoints.
 */
export const getMultiStopRoadRoute = async (
  waypoints: [number, number][]
): Promise<RoadRouteResult> => {
  const validWaypoints = waypoints.filter(
    (pt) => pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1])
  );

  if (validWaypoints.length < 2) {
    return {
      coordinates: validWaypoints,
      distanceMeters: 0,
      distanceKm: 0,
      durationSeconds: 0,
      durationMinutes: 0,
      source: 'haversine',
    };
  }

  const cacheKey = makeCacheKey(validWaypoints);
  const cached = ROUTE_CACHE.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // OSRM coordinates: lon,lat;lon,lat;...
  const coordinatesParam = validWaypoints
    .map(([lat, lng]) => `${lng},${lat}`)
    .join(';');

  const url = `${OSRM_BASE_URL}/${coordinatesParam}?overview=full&geometries=geojson`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP error ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('OSRM route not found');
    }

    const primaryRoute = data.routes[0];
    const geoJsonCoords: [number, number][] = primaryRoute.geometry.coordinates;
    const leafletCoords: [number, number][] = geoJsonCoords.map(([lng, lat]) => [lat, lng]);

    const distanceMeters = Number(primaryRoute.distance) || 0;
    const distanceKm = Number((distanceMeters / 1000).toFixed(2));
    const durationSeconds = Number(primaryRoute.duration) || 0;
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    const result: RoadRouteResult = {
      coordinates: leafletCoords,
      distanceMeters,
      distanceKm,
      durationSeconds,
      durationMinutes,
      source: 'osrm',
    };

    ROUTE_CACHE.set(cacheKey, { result, timestamp: now });
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    // Build straight segments fallback
    let totalDistKm = 0;
    for (let i = 0; i < validWaypoints.length - 1; i++) {
      totalDistKm += calculateHaversineDistanceKm(validWaypoints[i], validWaypoints[i + 1]);
    }
    const distanceMeters = Math.round(totalDistKm * 1000);
    const durationMinutes = Math.max(1, Math.round((totalDistKm / DEFAULT_SPEED_KMH) * 60));

    return {
      coordinates: validWaypoints,
      distanceMeters,
      distanceKm: Number(totalDistKm.toFixed(2)),
      durationSeconds: durationMinutes * 60,
      durationMinutes,
      source: 'haversine',
    };
  }
};
