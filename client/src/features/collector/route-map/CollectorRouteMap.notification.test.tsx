import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import CollectorRouteMap from "./CollectorRouteMap";
import CollectorTopBar from "@/app/layouts/collector/CollectorTopbar";
import type { RouteInfo, RouteStop } from "./types";
import { getManilaNow } from "@/utils/date";
import useAuthStore from "@/store/authStore";
import { collectorKey } from "@/lib/collectorQuery";
import { startMyRoute, setMyRoutePaused, completeStop, skipStop, endRoute } from "@/services/trackingService";

const state = vi.hoisted(() => ({ routeInfo: null as RouteInfo | null, stops: [] as RouteStop[], isLoading: false, refresh: vi.fn() }));
vi.mock("./useCollectorTracking", () => ({ useCollectorTracking: () => ({ ...state, error: null, truckCoords: null, isOffline: false, pendingSync: false, gpsError: null }) }));
vi.mock("./components/RouteMapView", () => ({ default: () => <div>Live map</div> }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ toggleSidebar: vi.fn() }) }));
vi.mock("@/hooks/useNotifications", () => ({ default: () => ({ recentNotifications: [], unreadCount: 0, markAsRead: vi.fn(), markAllAsRead: vi.fn(), isMutating: false, error: null, fetchNotifications: vi.fn() }) }));
vi.mock("@/services/trackingService", () => ({ completeStop: vi.fn(), skipStop: vi.fn(), endRoute: vi.fn(), startMyRoute: vi.fn(), setMyRoutePaused: vi.fn() }));
const Location = () => { const location = useLocation(); return <output data-location>{location.pathname}</output>; };
let host: HTMLDivElement; let root: Root;
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient();
  vi.clearAllMocks();
  useAuthStore.setState({ user: { id: "collector", role: "DRIVER" } as never, token: "session" });
  state.stops = [];
  state.isLoading = false;
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  state.routeInfo = { routeId: "current-run", templateRouteId: "current-template", truckId: "truck", routeName: "Current assignment", wasteType: "Biodegradable", totalStops: 0, startedAt: new Date(), collectionStartedAt: null, routeStatus: "SCHEDULED", pausedAt: null, totalPausedSeconds: 0 };
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); client.clear(); host.remove(); });
const mount = async (search: string) => {
  await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter key={search} initialEntries={[`/collector/route-map${search}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Location /><CollectorTopBar /><CollectorRouteMap /></MemoryRouter></QueryClientProvider>));
};

it("uses the shared route page skeleton while the assignment loads", async () => {
  state.isLoading = true;
  await mount("");
  expect(host.querySelector('[role="status"][aria-busy="true"]')).toHaveTextContent("Loading collection route");
  expect(host.querySelector('[aria-label="Loading planned route map"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Loading assigned stop order"]')).not.toBeNull();
  expect(host.textContent).not.toContain("Start collection route");
  state.isLoading = false;
  await mount("");
  expect(host.querySelector('[role="status"][aria-busy="true"]')).toBeNull();
  expect(host.textContent).toContain("Current assignment");
});

it("renders the matching assignment from a notification and keeps ordinary map access working", async () => {
  await mount(`?date=${getManilaNow().dateKey}&template=current-template`);
  expect(host.textContent).toContain("Current assignment");
  expect(host.textContent).not.toContain("Route alert unavailable");
  await mount("");
  expect(host.textContent).toContain("Current assignment");
  expect(host.querySelector('nav[aria-label="Breadcrumb"] button')?.textContent).toBe("Driver Dashboard");
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Back to Driver Dashboard"]')!.click());
  expect(host.querySelector("[data-location]")?.textContent).toBe("/collector");
});

it("never renders another route when the notification refers to a replaced assignment", async () => {
  await mount(`?date=${getManilaNow().dateKey}&template=previous-template`);
  expect(host.querySelector('[role="alert"]')).toHaveTextContent("no longer your current assignment");
  expect(host.textContent).not.toContain("Current assignment");
  expect(host.textContent).not.toContain("Live map");
  await act(async () => [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Try again"))!.click());
  expect(state.refresh).toHaveBeenCalledOnce();
  expect(host.querySelector('button[aria-label="Back to Notifications"]')?.textContent).toBe("Notifications");
  expect(host.textContent).not.toContain("Back to notifications");
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Back to Notifications"]')!.click());
  expect(host.querySelector("[data-location]")?.textContent).toBe("/collector/notifications");
});

it("keeps an old or finished route alert from opening today's map", async () => {
  await mount("?date=2020-01-01&template=current-template");
  expect(host.textContent).toContain("Route alert unavailable");
  state.routeInfo = null;
  await mount(`?date=${getManilaNow().dateKey}&template=current-template`);
  expect(host.textContent).toContain("Route alert unavailable");
  expect(host.textContent).not.toContain("No collection scheduled today");
});

it.each(["start", "pause", "resume", "done", "skip", "end"] as const)("%s preserves the route request and refreshes only this collector's related caches", async (action) => {
  state.routeInfo = { ...state.routeInfo!, totalStops: 2, startedAt: new Date(Date.now() - 60_000), collectionStartedAt: action === "start" ? null : new Date(Date.now() - 60_000), routeStatus: action === "resume" ? "PAUSED" : "ACTIVE" };
  state.stops = [
    { id: "first", barangay: "Poblacion", stopNumber: 1, status: "in-progress", coords: [14.0388, 121.4285], coveragePath: null, distanceKm: 0 },
    { id: "next", barangay: "Next barangay", stopNumber: 2, status: "not-yet", coords: [14.04, 121.43], coveragePath: null, distanceKm: 0 },
  ];
  const own = ["routes", "history", "profile"].map((domain) => collectorKey("collector", domain, "cached"));
  const other = [collectorKey("another-collector", "routes", "cached"), ["admin", "admin", "tracking", "overview"], ["resident", "resident", "routes", "cached"]];
  [...own, ...other].forEach((key) => client.setQueryData<string>(key, "saved"));
  await mount("");
  const click = async (label: string) => { await act(async () => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === label);
    if (!button) throw new Error(`Missing ${label}`);
    button.click();
  }); };
  if (action === "start") { await click("Start collection route"); expect(startMyRoute).toHaveBeenCalledWith("current-run"); }
  if (action === "pause" || action === "resume") {
    await click(action === "pause" ? "Pause route" : "Resume route");
    expect(setMyRoutePaused).toHaveBeenCalledWith("current-run", action === "pause");
  }
  if (action === "done") { await click("Mark stop as cleared"); expect(completeStop).toHaveBeenCalledWith("current-run", "first"); }
  if (action === "skip") {
    await click("Skip"); await click("Truck Issue"); await click("Confirm skip");
    expect(skipStop).toHaveBeenCalledWith("current-run", "first", "Truck Issue");
  }
  if (action === "end") {
    await click("End route"); expect(endRoute).not.toHaveBeenCalled();
    await click("Conclude route"); expect(endRoute).toHaveBeenCalledWith("current-run");
    expect(host.querySelector("[data-location]")?.textContent).toBe("/collector");
  }
  expect(own.map((key) => client.getQueryState(key)?.isInvalidated)).toEqual([true, true, true]);
  expect(other.map((key) => client.getQueryState(key)?.isInvalidated)).toEqual([false, false, false]);
});
