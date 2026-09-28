import type { RouteRunToday } from "@/services/routesService";
import { parseApiTimestamp } from "@/utils/date";
import type { AssignmentData, RouteState } from "./components/types";

export const routeStatusLabels: Record<RouteState, string> = {
  unassigned: "Unassigned", "no-schedule": "No route scheduled", "not-started": "Not started",
  "in-progress": "On route", paused: "Paused", completed: "Route completed",
  partial: "Partially completed", "no-collection": "No collection", cancelled: "Cancelled",
};

export const isFinishedRoute = (state: RouteState) =>
  ["completed", "partial", "no-collection", "cancelled"].includes(state);

export const getAssignmentDestination = (state: RouteState) =>
  isFinishedRoute(state) || state === "unassigned" || state === "no-schedule"
    ? "/collector/route-history" : "/collector/route-map";

export const getWasteBadgeClass = (value: string) => {
  switch (value.trim().toUpperCase().replace(/[\s-]+/g, "_")) {
    case "BIODEGRADABLE": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
    case "NON_BIODEGRADABLE": return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25";
    default: return "bg-muted text-muted-foreground border-border/60";
  }
};

export const buildAssignment = (
  route: RouteRunToday | null, hasTruck: boolean, plateNumber?: string | null, now = Date.now(),
): AssignmentData => {
  const stops = [...(route?.stops ?? [])].sort((a, b) => a.order_index - b.order_index);
  const totalStops = stops.length;
  const completedStops = stops.filter((stop) => stop.status === "DONE").length;
  const skippedStops = stops.filter((stop) => stop.status === "MISSED").length;
  let routeState: RouteState = hasTruck ? "no-schedule" : "unassigned";
  if (route) {
    switch (route.route_status) {
      case "COMPLETED": routeState = "completed"; break;
      case "PARTIAL": routeState = completedStops ? "partial" : "no-collection"; break;
      case "CANCELLED": routeState = "cancelled"; break;
      case "PAUSED": routeState = "paused"; break;
      case "ACTIVE": routeState = route.collection_started_at ? "in-progress" : "not-started"; break;
      default: routeState = "not-started";
    }
  }

  const start = parseApiTimestamp(route?.collection_started_at);
  const end = parseApiTimestamp(route?.ended_at);
  const pause = parseApiTimestamp(route?.paused_at);
  let durationLabel = "Not started";
  if (start) {
    const boundary = isFinishedRoute(routeState) ? end : routeState === "paused" ? pause : new Date(now);
    if (boundary) {
      const elapsed = boundary.getTime() - start.getTime() - Math.max(0, Number(route?.total_paused_seconds) || 0) * 1000;
      const minutes = Math.max(0, Math.floor(elapsed / 60_000));
      durationLabel = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
    } else durationLabel = "Unavailable";
  } else if (!route) durationLabel = "—";

  const scheduled = route?.started_at?.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  const estimatedStart = scheduled
    ? `${Number(scheduled[1]) % 12 || 12}:${scheduled[2]} ${Number(scheduled[1]) >= 12 ? "PM" : "AM"}`
    : "Unavailable";
  const upcomingStops = stops.filter((stop) => stop.status !== "DONE" && stop.status !== "MISSED")
    .map((stop) => ({ id: stop.id, name: stop.stop_name || stop.barangay_name, order: stop.order_index }));
  const currentStop = stops.find((stop) => stop.status === "IN_PROGRESS") ?? stops.find((stop) => stop.status === "NOT_STARTED");
  return {
    routeState, statusLabel: routeStatusLabels[routeState], routeName: route?.route_name || "Today's collection route",
    wasteType: route?.waste_type || "Unspecified", plateNumber, totalStops, completedStops, skippedStops,
    remainingStops: Math.max(0, totalStops - completedStops - skippedStops),
    completionPct: totalStops ? Math.round(completedStops / totalStops * 100) : 0,
    durationLabel, estimatedStart, upcomingStops,
    nextStopName: currentStop?.stop_name || currentStop?.barangay_name, nextStopOrder: currentStop?.order_index,
  };
};
