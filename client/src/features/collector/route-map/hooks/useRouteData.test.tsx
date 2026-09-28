import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { collectorKey } from "@/lib/collectorQuery";
import { fetchMyRoute, type TruckRouteRow } from "@/services/trackingService";
import { useRouteData } from "./useRouteData";

vi.mock("@/services/trackingService", () => ({ fetchMyRoute: vi.fn() }));
let client: QueryClient; let root: Root; let host: HTMLDivElement;
let state: ReturnType<typeof useRouteData>;
const route: TruckRouteRow = {
  route_id: "run-1", truck_id: "truck-1", truck_name: "Truck 1", route_name: "Morning collection",
  route_status: "ACTIVE", started_at: "2026-09-28 01:00:00", collection_started_at: "2026-09-28 01:15:00",
  completed_stops: 0, total_stops: 2,
  stops: [
    { id: "next", barangay_id: "b2", barangay_name: "Next barangay", stop_name: "Next street", order_index: 2, status: "NOT_STARTED", coverage_path: "[[14.1,121.4],[14.2,121.5]]" },
    { id: "first", barangay_id: "b1", barangay_name: "Poblacion", order_index: 1, status: "IN_PROGRESS", latitude: 14.0388, longitude: 121.4285 },
  ],
};
const View = () => { state = useRouteData(); return <p>{state.isLoading ? "loading" : state.routeInfo?.routeName ?? "no-route"}</p>; };
const mount = async (twice = false) => {
  await act(async () => root.render(<QueryClientProvider client={client}><View />{twice && <View />}</QueryClientProvider>));
};
beforeEach(() => {
  vi.resetAllMocks(); notifyManager.setScheduler(queueMicrotask);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useAuthStore.setState({ user: { id: "collector", role: "DRIVER" } as never, token: "session" });
  vi.mocked(fetchMyRoute).mockResolvedValue(route);
  client = new QueryClient(); host = document.createElement("div"); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); client.clear(); notifyManager.setScheduler((callback) => setTimeout(callback, 0)); });

it("deduplicates route readers while preserving scheduled stop order, coverage paths and UTC start times", async () => {
  await mount(true);
  expect(fetchMyRoute).toHaveBeenCalledTimes(1);
  expect(state.stops.map((stop) => stop.id)).toEqual(["first", "next"]);
  expect(state.stops[0].status).toBe("in-progress");
  expect(state.stops[1].coords).toEqual([14.1, 121.4]);
  expect(state.stops[1].barangay).toBe("Next street");
  expect(state.routeInfo?.collectionStartedAt?.toISOString()).toBe("2026-09-28T01:15:00.000Z");
});

it("reuses the current route on navigation and responds to live-sync invalidation without a loading flash", async () => {
  await mount();
  await act(async () => root.render(<QueryClientProvider client={client}>Other page</QueryClientProvider>));
  await mount(); expect(fetchMyRoute).toHaveBeenCalledTimes(1);
  vi.mocked(fetchMyRoute).mockResolvedValue({ ...route, route_status: "PAUSED", paused_at: "2026-09-28 02:00:00", total_paused_seconds: 120 });
  await act(async () => { await client.invalidateQueries({ queryKey: collectorKey("collector", "routes") }); });
  expect(state.routeInfo?.routeStatus).toBe("PAUSED");
  expect(state.routeInfo?.totalPausedSeconds).toBe(120);
  expect(state.isLoading).toBe(false);
});

it("retains the route on a failed refresh and recovers through the existing retry callback", async () => {
  await mount();
  vi.mocked(fetchMyRoute).mockRejectedValue(new Error("offline"));
  await act(async () => { await client.invalidateQueries({ queryKey: collectorKey("collector", "routes") }); });
  expect(state.error).toBe("offline"); expect(state.routeInfo?.routeId).toBe("run-1");
  vi.mocked(fetchMyRoute).mockResolvedValue(route);
  await act(async () => state.refresh());
  expect(state.error).toBeNull(); expect(state.isLoading).toBe(false);
});

it("keeps no-route and fully finished route behavior", async () => {
  vi.mocked(fetchMyRoute).mockResolvedValue(null); await mount();
  expect(state.routeInfo).toBeNull(); expect(state.stops).toEqual([]);
  vi.mocked(fetchMyRoute).mockResolvedValue({ ...route, stops: route.stops.map((stop) => ({ ...stop, status: "DONE" })) });
  await act(async () => state.refresh());
  expect(state.routeInfo).toBeNull(); expect(state.stops).toEqual([]);
});

it("preserves the route-load error fallback for failures without an Error object", async () => {
  vi.mocked(fetchMyRoute).mockRejectedValue("unavailable"); await mount();
  expect(state.error).toBe("Failed to load route data.");
  expect(state.isLoading).toBe(false);
});

it("does not expose the previous collector's route after an account switch", async () => {
  await mount(); vi.mocked(fetchMyRoute).mockReturnValue(new Promise(() => {}));
  await act(async () => useAuthStore.setState({ user: { id: "other", role: "DRIVER" } as never, token: "other-session" }));
  expect(state.routeInfo).toBeNull(); expect(state.stops).toEqual([]);
  expect(state.isLoading).toBe(true);
});
