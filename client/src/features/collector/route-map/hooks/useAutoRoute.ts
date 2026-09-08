/**
 * useAutoRoute.ts
 *
 * Keeps the admin's scheduled stop order intact. The first unfinished
 * barangay is the active stop; the collector advances only by completing or
 * skipping that stop.
 */

import { useMemo } from "react";
import type { RouteStop } from "../types";

export const useScheduledRouteOrder = (stops: RouteStop[]): RouteStop[] => {
  return useMemo(() => {
    if (stops.length === 0) return stops;

    const firstUnfinishedIndex = stops.findIndex(
      (stop) => stop.status !== "done" && stop.status !== "skipped",
    );

    return stops.map((stop, index) => ({
      ...stop,
      status:
        stop.status === "done" || stop.status === "skipped"
          ? stop.status
          : index === firstUnfinishedIndex
            ? "in-progress"
            : "not-yet",
    }));
  }, [stops]);
};

/**
 * Kept for the admin tracking/replay map, which has its own proximity-based
 * preview. Collector navigation uses useScheduledRouteOrder above.
 */
export const useAutoRoute = (
  stops: RouteStop[],
  truckCoords: [number, number] | null,
): RouteStop[] => {
  return useMemo(() => {
    const distanceKm = (
      [latitude1, longitude1]: [number, number],
      [latitude2, longitude2]: [number, number],
    ) => {
      const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
      const latitudeDifference = toRadians(latitude2 - latitude1);
      const longitudeDifference = toRadians(longitude2 - longitude1);
      const haversine =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(toRadians(latitude1)) *
          Math.cos(toRadians(latitude2)) *
          Math.sin(longitudeDifference / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    };

    const settled = stops.filter(
      (stop) => stop.status === "done" || stop.status === "skipped",
    );
    const unfinished = stops.filter(
      (stop) => stop.status === "not-yet" || stop.status === "in-progress",
    );
    const queued = truckCoords
      ? [...unfinished].sort(
          (first, second) =>
            distanceKm(truckCoords, first.coords) - distanceKm(truckCoords, second.coords),
        )
      : unfinished;

    return [...queued, ...settled].map((stop, index) => ({
      ...stop,
      status:
        stop.status === "done" || stop.status === "skipped"
          ? stop.status
          : index === 0
            ? "in-progress"
            : "not-yet",
      distanceKm: truckCoords
        ? Math.round(distanceKm(truckCoords, stop.coords) * 10) / 10
        : stop.distanceKm,
      stopNumber: index + 1,
    }));
  }, [stops, truckCoords]);
};
