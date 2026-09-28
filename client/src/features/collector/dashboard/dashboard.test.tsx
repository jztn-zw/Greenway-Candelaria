import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RouteRunToday } from "@/services/routesService";
import { buildAssignment, getAssignmentDestination, getWasteBadgeClass } from "./dashboard.utils";
import TruckStatusCard from "./components/TruckStatusCard";
import AssignmentCard from "./components/AssignmentCard";
import TodayStatsCards from "./components/TodayStatsCards";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";

const now = Date.parse("2026-09-27T02:00:00Z");
const route = (changes: Partial<RouteRunToday> = {}): RouteRunToday => ({
  route_id: "run-1", truck_id: "truck-1", truck_name: "Truck 1", route_status: "ACTIVE",
  started_at: "09:00:00", collection_started_at: "2026-09-27 01:00:00",
  stops: [
    { id: "stop-2", barangay_id: "b1", barangay_name: "Poblacion", stop_name: "Second Street", order_index: 2, status: "NOT_STARTED" },
    { id: "stop-1", barangay_id: "b1", barangay_name: "Poblacion", stop_name: "First Street", order_index: 1, status: "NOT_STARTED" },
  ], ...changes,
});

afterEach(() => vi.useRealTimers());

describe("collector dashboard route facts", () => {
  it("recognizes a started route before any stop is completed", () => {
    const data = buildAssignment(route(), true, "ABC-123", now);
    expect(data.routeState).toBe("in-progress");
    expect(data.estimatedStart).toBe("9:00 AM");
    expect(data.durationLabel).toBe("1h 0m");
    expect(data.nextStopName).toBe("First Street");
    expect(data.upcomingStops.map((stop) => stop.name)).toEqual(["First Street", "Second Street"]);
  });

  it("keeps an unstarted scheduled route unstarted", () => {
    const data = buildAssignment(route({ route_status: "SCHEDULED", collection_started_at: null }), true, null, now);
    expect(data.routeState).toBe("not-started");
    expect(data.durationLabel).toBe("Not started");
    expect(buildAssignment(route({ started_at: undefined }), true).estimatedStart).toBe("Unavailable");
  });

  it("freezes paused duration and subtracts earlier pauses", () => {
    const paused = route({ route_status: "PAUSED", paused_at: "2026-09-27 01:40:00", total_paused_seconds: 600 });
    expect(buildAssignment(paused, true, null, now).durationLabel).toBe("30m");
    expect(buildAssignment(paused, true, null, now + 3600000).durationLabel).toBe("30m");
    const html = renderToStaticMarkup(<TodayStatsCards data={buildAssignment(paused, true, null, now)} />);
    expect(html).toContain("Paused");
    expect(html).not.toContain("Active route");
  });

  it("freezes a completed route at its saved end, even after truck reassignment", () => {
    const completed = route({ route_status: "COMPLETED", ended_at: "2026-09-27 01:50:00", total_paused_seconds: 600 });
    const data = buildAssignment(completed, false, null, now + 3600000);
    expect(data.routeState).toBe("completed");
    expect(data.durationLabel).toBe("40m");
    expect(getAssignmentDestination(data.routeState)).toBe("/collector/route-history");
  });

  it("does not label a run with every stop missed as successfully completed", () => {
    const missed = route({ route_status: "PARTIAL", ended_at: "2026-09-27 01:50:00" });
    missed.stops = missed.stops.map((stop) => ({ ...stop, status: "MISSED" }));
    const data = buildAssignment(missed, true, null, now);
    expect(data.routeState).toBe("no-collection");
    const html = renderToStaticMarkup(<AssignmentCard data={data} onAction={() => {}} />);
    expect(html).toContain("No collection");
    expect(html).not.toContain("Route completed");
  });

  it("distinguishes partial and cancelled runs and does not infer completion from stop counts", () => {
    const partial = route({ route_status: "PARTIAL" });
    partial.stops[0].status = "DONE";
    expect(buildAssignment(partial, true).routeState).toBe("partial");
    expect(buildAssignment(route({ route_status: "CANCELLED" }), true).routeState).toBe("cancelled");
    const active = route();
    active.stops = active.stops.map((stop) => ({ ...stop, status: "DONE" }));
    expect(buildAssignment(active, true).routeState).toBe("in-progress");
  });

  it("uses history for the unassigned history button and maps waste colors consistently", () => {
    expect(getAssignmentDestination(buildAssignment(null, false).routeState)).toBe("/collector/route-history");
    expect(getAssignmentDestination("paused")).toBe("/collector/route-map");
    expect(getWasteBadgeClass("NON_BIODEGRADABLE")).not.toBe(getWasteBadgeClass("BIODEGRADABLE"));
    expect(getWasteBadgeClass("Non-Biodegradable")).toBe(getWasteBadgeClass("NON_BIODEGRADABLE"));
  });
});

describe("vehicle truthfulness", () => {
  it("never invents road readiness for maintenance, unknown availability, or no assignment", () => {
    const maintenance = renderToStaticMarkup(<TruckStatusCard data={{ availabilityStatus: "UNDER_MAINTENANCE", plateNumber: "ABC-123" }} />);
    expect(maintenance).toContain("Under maintenance");
    expect(maintenance).not.toContain("Road ready");
    const unknown = renderToStaticMarkup(<TruckStatusCard data={{ plateNumber: "ABC-123" }} />);
    expect(unknown).toContain("Readiness unavailable");
    expect(unknown).not.toContain("Compactor");
    const unassigned = renderToStaticMarkup(<TruckStatusCard data={null} />);
    expect(unassigned).toContain("No truck assigned");
    expect(unassigned).not.toContain("Road ready");
  });
});

it("highlights the Manila date before 8 AM instead of the previous UTC date", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-26T17:00:00Z")); // September 27, 1 AM Manila.
  const html = renderToStaticMarkup(<CalendarGrid currentDate={new Date(2026, 8, 1)}
    selectedDateStr="2026-09-27" events={[]} scheduleColorById={new Map()}
    onSelectDate={() => {}} onPrevMonth={() => {}} onNextMonth={() => {}} onGoToday={() => {}}
    hideTodayButtonWhenOtherDateSelected />);
  expect(html).toContain("Today");
});
