import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CollectorDashboard from "./CollectorDashboard";
import { fetchCollectorDashboardProfile, fetchDriverMyHistory } from "@/services/driverManagerService";
import { fetchMyRouteToday } from "@/services/routesService";

vi.mock("@/services/driverManagerService", () => ({
  fetchCollectorDashboardProfile: vi.fn(), fetchDriverMyHistory: vi.fn(), reportTruckBreakdown: vi.fn(),
}));
vi.mock("@/services/routesService", () => ({ fetchMyRouteToday: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("./components/RouteCalendarCard", () => ({ default: () => <div>Schedule</div> }));

let root: Root;
let client: QueryClient;
let host: HTMLDivElement;
beforeEach(() => {
  client = new QueryClient(); notifyManager.setScheduler(queueMicrotask);
  useAuthStore.setState({ user: { id: "collector", role: "DRIVER" } as never, token: "session" });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-27T02:00:00Z"));
  vi.clearAllMocks();
  vi.mocked(fetchCollectorDashboardProfile).mockResolvedValue({
    full_name: "Collector", truck_id: "t1", truck_name: "Truck 1", truck_plate: "ABC-123",
    truck_availability: "ACTIVE", truck_model: "Model A",
  });
  vi.mocked(fetchDriverMyHistory).mockResolvedValue([]);
  vi.mocked(fetchMyRouteToday).mockResolvedValue({
    route_id: "r1", truck_id: "t1", truck_name: "Truck 1", route_name: "Morning collection",
    route_status: "ACTIVE", started_at: "09:00:00", collection_started_at: "2026-09-27 01:00:00",
    stops: [{ id: "s1", barangay_id: "b1", barangay_name: "Poblacion", stop_name: "Argao Street", order_index: 1, status: "NOT_STARTED" }],
  });
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); client.clear(); notifyManager.setScheduler((callback) => setTimeout(callback, 0)); vi.useRealTimers(); });
const render = async () => {
  await act(async () => { root.render(<QueryClientProvider client={client}><MemoryRouter><CollectorDashboard /></MemoryRouter></QueryClientProvider>); });
};

it("keeps the assignment available if history fails, without presenting false empty history", async () => {
  vi.mocked(fetchDriverMyHistory).mockRejectedValue(new Error("Temporary failure"));
  await render();
  expect(host.textContent).toContain("Morning collection");
  expect(host.textContent).toContain("Route history unavailable");
  expect(host.textContent).not.toContain("No finished collection routes yet");
});

it("does not invent a ready truck or an unassigned state when the profile request fails", async () => {
  vi.mocked(fetchCollectorDashboardProfile).mockRejectedValue(new Error("Temporary failure"));
  await render();
  expect(host.textContent).toContain("Vehicle information unavailable");
  expect(host.textContent).not.toContain("Road ready");
  expect(host.textContent).not.toContain("No truck assigned");
});

it("advances the clock and refreshes dashboard data in the background", async () => {
  await render();
  expect(host.textContent).toContain("1h 0m");
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(host.textContent).toContain("1h 1m");
  expect(fetchMyRouteToday).toHaveBeenCalledTimes(2);
  expect(fetchCollectorDashboardProfile).toHaveBeenCalledTimes(2);
  expect(fetchDriverMyHistory).toHaveBeenCalledTimes(2);
  expect(fetchDriverMyHistory).toHaveBeenCalledWith(3, true);
});

it("renders recent history as a keyboard-accessible link", async () => {
  vi.mocked(fetchDriverMyHistory).mockResolvedValue([{
    id: "past-run", date: "Sep 26, 2026", dayOfWeek: "Saturday", routeName: "Yesterday's collection",
    wasteType: "BIODEGRADABLE", truckName: "Truck 1", truckPlate: "ABC-123", totalStops: 1,
    completedStops: 1, skippedStops: 0, completionPct: 100, timeOnRoute: "30m", status: "completed",
    stops: [], adminMessages: [],
  }]);
  await render();
  const link = host.querySelector('a[href*="past-run"]');
  expect(link?.textContent).toContain("Yesterday's collection");
});
