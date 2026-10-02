/**
 * useRouteData.ts
 *
 * Fetches the authenticated driver's route for today.
 * Maps backend RouteStopRow → frontend RouteStop shape.
 * Re-fetches after mutations (mark done, skip) via the `refresh` callback.
 */

import { useMemo, useCallback } from "react";
import { useCollectorQuery } from "@/lib/collectorQuery";
import { getManilaNow } from "@/utils/date";
import { fetchMyRoute } from "@/services/trackingService";
import type { TruckRouteRow } from "@/services/trackingService";
import type { RouteStop, RouteInfo } from "../types";
import { toFiniteNumber } from "../routeMap.utils";

const CANDELARIA_CENTER: [number, number] = [14.0388, 121.4285];
const ROUTE_REFRESH_MS = 30_000;

const parseRouteStartedAt = (value: string | null | undefined): Date => {
  if (!value) return new Date();

  // MySQL DATETIME values from the API are UTC. Parse this format before the
  // browser's Date parser, which otherwise treats it as local time and can
  // make a new route appear several hours old in the Philippines.
  const dateTimeMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/,
  );

  if (dateTimeMatch) {
    const [, year, month, day, hour, minute, second, ms = "0"] = dateTimeMatch;
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        Number(ms.padEnd(3, "0")),
      ),
    );
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const timeOnlyMatch = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (timeOnlyMatch) {
    const [, hour, minute, second = "0"] = timeOnlyMatch;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return new Date(`${today}T${hour}:${minute}:${second}+08:00`);
  }

  return new Date();
};

// Backend status → frontend StopStatus
const mapStatus = (backendStatus: string): RouteStop["status"] => {
  switch (backendStatus.toUpperCase()) {
    case "DONE":
      return "done";
    case "IN_PROGRESS":
      return "in-progress";
    case "SKIPPED":
    case "MISSED":
      return "skipped";
    default:
      return "not-yet";
  }
};

const isTerminalStopStatus = (raw?: string) => {
  const key = String(raw || "").toUpperCase();
  return key === "DONE" || key === "MISSED" || key === "SKIPPED";
};

const isRouteFinished = (route: TruckRouteRow) => {
  if (!route?.stops?.length) return false;
  return route.stops.every((stop) => isTerminalStopStatus(stop.status));
};

const normalizeCoveragePath = (
  value: TruckRouteRow["stops"][number]["coverage_path"],
): [number, number][] | null => {
  if (!value) return null;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return null;
    const points = parsed.flatMap((point): [number, number][] => {
      if (!Array.isArray(point) || point.length < 2) return [];
      const latitude = Number(point[0]);
      const longitude = Number(point[1]);
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? [[latitude, longitude]]
        : [];
    });
    return points.length >= 2 ? points : null;
  } catch {
    return null;
  }
};

// Map backend stops → frontend RouteStop[]
const mapStops = (
  raw: TruckRouteRow["stops"],
): RouteStop[] => {
  return raw
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((s, idx) => {
      const coveragePath = normalizeCoveragePath(s.coverage_path);
      const stopLat = toFiniteNumber(s.latitude);
      const stopLng = toFiniteNumber(s.longitude);

      const coords = coveragePath?.[0] ??
        (stopLat !== null && stopLng !== null
          ? ([stopLat, stopLng] as [number, number])
          : CANDELARIA_CENTER);

      const distanceKm = toFiniteNumber(s.distance_km);

      return {
        id: s.id,
        barangayId: s.barangay_id,
        stopNumber: s.order_index ?? idx + 1,
        barangay: s.stop_name ?? s.barangay_name,
        status: mapStatus(s.status),
        completedAt: s.completed_at
          ? parseRouteStartedAt(s.completed_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : undefined,
        skippedReason: s.skipped_reason ?? undefined,
        coords,
        hasCoordinates: Boolean(coveragePath?.length || (stopLat !== null && stopLng !== null)),
        coveragePath,
        distanceKm: distanceKm ?? 0,
      };
    });
};

// Map backend route → frontend RouteInfo
const mapRouteInfo = (raw: TruckRouteRow): RouteInfo => ({
  pausedAt: raw.paused_at ? parseRouteStartedAt(raw.paused_at) : null,
  totalPausedSeconds: Number(raw.total_paused_seconds) || 0,
  routeId: raw.route_id,
  templateRouteId: raw.template_route_id,
  truckId: raw.truck_id,
  routeName: raw.route_name ?? `${raw.truck_name} Route`,
  wasteType: (raw.waste_type as RouteInfo["wasteType"]) ?? "Biodegradable",
  totalStops: raw.total_stops,
  startedAt: parseRouteStartedAt(raw.started_at),
  collectionStartedAt: raw.collection_started_at
    ? parseRouteStartedAt(raw.collection_started_at)
    : null,
  routeStatus: String(raw.route_status || "ACTIVE").toUpperCase() as RouteInfo["routeStatus"],
});

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseRouteDataReturn {
  stops: RouteStop[];
  routeInfo: RouteInfo | null;
  isLoading: boolean;
  isRefreshing: boolean;
  hasLoadedData: boolean;
  error: string | null;
  refresh: () => void;
}

export const useRouteData = (): UseRouteDataReturn => {
  const route = useCollectorQuery("routes", ["current", getManilaNow().dateKey], fetchMyRoute, { refetchInterval: ROUTE_REFRESH_MS });
  const { refetch } = route;
  const refresh = useCallback(() => { void refetch(); }, [refetch]);
  const mapped = useMemo(() => {
    if (!route.data || isRouteFinished(route.data)) return { stops: [], routeInfo: null };
    return { stops: mapStops(route.data.stops), routeInfo: mapRouteInfo(route.data) };
  }, [route.data]);

  const error = route.error ? route.error instanceof Error ? route.error.message : "Failed to load route data." : null;
  return { ...mapped, isLoading: route.isLoading, isRefreshing: route.isFetching, hasLoadedData: route.dataUpdatedAt > 0, error, refresh };
};


