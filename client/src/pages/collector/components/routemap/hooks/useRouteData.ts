/**
 * useRouteData.ts
 *
 * Fetches the authenticated driver's route for today.
 * Maps backend RouteStopRow → frontend RouteStop shape.
 * Re-fetches after mutations (mark done, skip) via the `refresh` callback.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchMyRoute } from "@/services/trackingService";
import type { TruckRouteRow } from "@/services/trackingService";
import { fetchBarangays, type BarangayLocationRow } from "@/services/barangaysService";
import type { RouteStop, RouteInfo } from "../types";

const CANDELARIA_CENTER: [number, number] = [14.0388, 121.4285];
const ROUTE_REFRESH_MS = 10_000;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const normalizeBarangayName = (value: string) =>
  value
    .toLowerCase()
    .replace(/^brgy\.?\s*/i, "")
    .replace(/^barangay\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
const parseRouteStartedAt = (value: string | null | undefined): Date => {
  if (!value) return new Date();

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

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

  const timeOnlyMatch = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (timeOnlyMatch) {
    const [, hour, minute, second = "0"] = timeOnlyMatch;
    const scheduled = new Date();
    scheduled.setHours(Number(hour), Number(minute), Number(second), 0);
    return scheduled;
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

// Map backend stops → frontend RouteStop[]
const mapStops = (
  raw: TruckRouteRow["stops"],
  barangays: BarangayLocationRow[],
): RouteStop[] => {
  const barangayById = new Map(barangays.map((barangay) => [barangay.id, barangay]));
  const barangayByName = new Map(
    barangays.map((barangay) => [normalizeBarangayName(barangay.name), barangay]),
  );

  return raw
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((s, idx) => {
      const stopLat = toNumber(s.latitude);
      const stopLng = toNumber(s.longitude);

      const matchedBarangay =
        barangayById.get(s.barangay_id) ??
        barangayByName.get(normalizeBarangayName(s.barangay_name));

      const barangayLat = toNumber(matchedBarangay?.latitude);
      const barangayLng = toNumber(matchedBarangay?.longitude);

      const coords =
        stopLat !== null && stopLng !== null
          ? ([stopLat, stopLng] as [number, number])
          : barangayLat !== null && barangayLng !== null
            ? ([barangayLat, barangayLng] as [number, number])
            : CANDELARIA_CENTER;

      const distanceKm = toNumber(s.distance_km);

      return {
        id: s.id,
        barangayId: s.barangay_id,
        stopNumber: s.order_index ?? idx + 1,
        barangay: s.barangay_name,
        status: mapStatus(s.status),
        completedAt: s.completed_at
          ? new Date(s.completed_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : undefined,
        skippedReason: s.skipped_reason ?? undefined,
        coords,
        distanceKm: distanceKm ?? 0,
      };
    });
};

// Map backend route → frontend RouteInfo
const mapRouteInfo = (raw: TruckRouteRow): RouteInfo => ({
  routeId: raw.route_id,
  truckId: raw.truck_id,
  routeName: raw.route_name ?? `${raw.truck_name} Route`,
  wasteType: (raw.waste_type as RouteInfo["wasteType"]) ?? "Biodegradable",
  totalStops: raw.total_stops,
  startedAt: parseRouteStartedAt(raw.started_at),
});

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseRouteDataReturn {
  stops: RouteStop[];
  routeInfo: RouteInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  /** Optimistically update a stop's status locally (before API confirms) */
  updateStopLocally: (stopId: string, patch: Partial<RouteStop>) => void;
}

export const useRouteData = (): UseRouteDataReturn => {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // bump to re-fetch
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!hasLoadedOnceRef.current) {
        setIsLoading(true);
      }

      try {
        const [route, barangays] = await Promise.all([
          fetchMyRoute(),
          fetchBarangays().catch(() => []),
        ]);
        if (cancelled) return;

        const isActiveRoute =
          String(route?.route_status ?? "ACTIVE").toUpperCase() === "ACTIVE";
        const routeStartAt = route ? parseRouteStartedAt(route.started_at) : null;
        const isScheduleUnlocked = routeStartAt ? routeStartAt.getTime() <= Date.now() : true;

        if (!route || !isActiveRoute) {
          setError("No active route assigned for today.");
          setStops([]);
          setRouteInfo(null);
          return;
        }

        if (!isScheduleUnlocked) {
          setError(
            `Route tracking will be available at ${routeStartAt.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}.`,
          );
          setStops([]);
          setRouteInfo(null);
          return;
        }

        setError(null);
        setRouteInfo(mapRouteInfo(route));
        setStops(mapStops(route.stops, barangays));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load route data.",
          );
        }
      } finally {
        if (!cancelled) {
          hasLoadedOnceRef.current = true;
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [tick]);


  // Keep collector route data fresh so new admin assignments appear without relogin.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, ROUTE_REFRESH_MS);

    return () => clearInterval(id);
  }, []);

  // Refresh immediately when user returns to this tab/window.
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        setTick((t) => t + 1);
      }
    };

    const handleFocus = () => {
      setTick((t) => t + 1);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  /**
   * Optimistic update — immediately reflect changes in the UI before the
   * API responds. If the API fails, call `refresh()` to re-sync from server.
   */
  const updateStopLocally = useCallback(
    (stopId: string, patch: Partial<RouteStop>) => {
      setStops((prev) => {
        const updated = prev.map((s) =>
          s.id === stopId ? { ...s, ...patch } : s,
        );

        // Auto-advance: set the next "not-yet" stop to "in-progress"
        const wasActive =
          prev.find((s) => s.id === stopId)?.status === "in-progress";
        if (wasActive) {
          const nextIdx = updated.findIndex((s) => s.status === "not-yet");
          if (nextIdx !== -1) {
            updated[nextIdx] = { ...updated[nextIdx], status: "in-progress" };
          }
        }

        return updated;
      });
    },
    [],
  );

  return { stops, routeInfo, isLoading, error, refresh, updateStopLocally };
};


