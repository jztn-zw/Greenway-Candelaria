/**
 * useAutoRoute.ts
 *
 * Automatically reorders the unfinished queue based on proximity to the
 * truck's current GPS coordinates. The nearest unfinished barangay becomes
 * the active stop, and the rest of the pending queue follows by distance.
 * Settled stops (done / skipped) are kept after the live queue.
 */

import { useMemo } from "react";
import type { RouteStop } from "../types";

/** Haversine distance in km between two [lat, lng] points */
const haversineKm = (
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const useAutoRoute = (
  stops: RouteStop[],
  truckCoords: [number, number] | null,
): RouteStop[] => {
  return useMemo(() => {
    if (stops.length === 0) return stops;

    const settled = stops.filter(
      (s) => s.status === "done" || s.status === "skipped",
    );
    const unfinished = stops.filter(
      (s) => s.status === "not-yet" || s.status === "in-progress",
    );

    if (unfinished.length === 0) {
      return [...settled].map((stop, idx) => ({
        ...stop,
        stopNumber: idx + 1,
      }));
    }

    const sortedUnfinished = truckCoords
      ? [...unfinished].sort((a, b) => {
          const distA = haversineKm(truckCoords, a.coords);
          const distB = haversineKm(truckCoords, b.coords);
          return distA - distB;
        })
      : [...unfinished];

    const queued = sortedUnfinished.map((stop, idx) => ({
      ...stop,
      status: idx === 0 ? ("in-progress" as const) : ("not-yet" as const),
      distanceKm: truckCoords
        ? Math.round(haversineKm(truckCoords, stop.coords) * 10) / 10
        : stop.distanceKm,
    }));

    return [...queued, ...settled].map((stop, idx) => ({
      ...stop,
      stopNumber: idx + 1,
    }));
  }, [stops, truckCoords]);
};
