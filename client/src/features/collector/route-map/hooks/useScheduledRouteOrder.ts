/**
 * useScheduledRouteOrder.ts
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
