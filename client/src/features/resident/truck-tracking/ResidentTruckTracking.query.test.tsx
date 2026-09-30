import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { residentKey } from "@/lib/residentQuery";
import ResidentTruckTracking from "./ResidentTruckTracking";
import type TrackingMap from "./TrackingMap";
import { getManilaNow } from "@/utils/date";

type MapProps = Parameters<typeof TrackingMap>[0];
const mocks = vi.hoisted(() => ({ live: vi.fn(), trucks: vi.fn(), routes: vi.fn(), barangays: vi.fn(), templates: vi.fn(), map: vi.fn(), handlers: new Map<string, (rows?: unknown[]) => void>(), disconnect: vi.fn() }));
vi.mock("socket.io-client", () => ({ io: () => ({
  on: (name: string, fn: (rows?: unknown[]) => void) => mocks.handlers.set(name, fn),
  emit: vi.fn(), connect: vi.fn(), disconnect: mocks.disconnect,
}) }));
vi.mock("@/services/trackingService", () => ({ fetchAllTrucks: () => mocks.trucks(), fetchTodayRoutes: () => mocks.routes(), fetchLiveTrucks: () => mocks.live() }));
vi.mock("@/services/barangaysService", () => ({ fetchBarangays: () => mocks.barangays() }));
vi.mock("@/services/routesService", () => ({ fetchRoutes: () => mocks.templates() }));
vi.mock("./TrackingMap", () => ({ default: (props: MapProps) => { mocks.map(props); return <div>Tracking map</div>; } }));

describe("resident tracking queries and GPS", () => {
  let host: HTMLDivElement; let root: Root; let client: QueryClient;
  beforeEach(() => {
    notifyManager.setScheduler(queueMicrotask);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    useAuthStore.setState({ user: { id: "resident-a", role: "RESIDENT", barangay_id: "b1", street_id: "s1" } as never, token: "session-a" });
    client = new QueryClient(); host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
    mocks.handlers.clear(); mocks.disconnect.mockClear();
    mocks.map.mockClear(); mocks.live.mockReset().mockResolvedValue([]);
    mocks.trucks.mockReset().mockResolvedValue([]); mocks.routes.mockReset().mockResolvedValue([]);
    mocks.barangays.mockReset().mockResolvedValue([]); mocks.templates.mockReset().mockResolvedValue([]);
  });
  afterEach(() => {
    act(() => root.unmount()); client.clear(); host.remove();
    notifyManager.setScheduler((fn) => setTimeout(fn, 0));
    vi.useRealTimers();
  });
  const render = () => act(async () => root.render(<QueryClientProvider client={client}><ResidentTruckTracking /></QueryClientProvider>));
  const mapProps = (): MapProps => mocks.map.mock.lastCall![0];
  const setupCollection = (routeStatus = "ACTIVE", stopStatus = "IN_PROGRESS", started: string | null = new Date().toISOString()) => {
    mocks.trucks.mockResolvedValue([{ id: "truck-a", name: "Truck 1", status: "ON_THE_WAY" }]);
    mocks.barangays.mockResolvedValue([{ id: "b1", name: "Poblacion", latitude: 13.931, longitude: 121.422 }]);
    mocks.routes.mockResolvedValue([{ route_id: "run-a", truck_id: "truck-a", route_status: routeStatus,
      collection_started_at: started, total_stops: 1, completed_stops: stopStatus === "DONE" ? 1 : 0,
      stops: [{ id: "stop-a", barangay_id: "b1", street_id: "s1", barangay_name: "Poblacion", stop_name: "Argao St (Ilaya)", order_index: 1, status: stopStatus }],
    }]);
  };
  const ping = (lastPing = new Date().toISOString()) => ({ truck_id: "truck-a", truck_status: "ON_THE_WAY", latitude: 13.934, longitude: 121.421, last_ping: lastPing });

  it("keeps a socket snapshot when an older HTTP read finishes late", async () => {
    let finish!: (value: unknown[]) => void;
    mocks.live.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    await render();
    const fresh = [{ truck_id: "truck-a", last_ping: "2026-09-27T12:00:00Z" }];
    await act(async () => { mocks.handlers.get("live:update")!(fresh); });
    const key = residentKey("resident-a", "tracking", "b1:s1", "live");
    expect(client.getQueryData(key)).toEqual(fresh);
    await act(async () => { finish([{ truck_id: "truck-a", last_ping: "2026-09-27T11:59:00Z" }]); });
    expect(client.getQueryData(key)).toEqual(fresh);
    expect(host.textContent).toContain("Tracking map");
  });

  it("renders a failed live request without a repeated state-update loop", async () => {
    mocks.live.mockRejectedValue(new Error("offline"));
    await render();
    expect(host.textContent).toContain("Tracking could not be refreshed");
    expect(mocks.live).toHaveBeenCalled();
    expect(host.textContent).toContain("Tracking map");
  });

  it("keeps an ongoing collection when GPS ages out, and resumes on a fresh update", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-09-29T00:00:00Z"));
    setupCollection(); mocks.live.mockResolvedValue([ping()]);
    await render();
    expect(mapProps().collectionDayStatus).toBe("active");
    await act(async () => { vi.advanceTimersByTime(125_000); });
    expect(mapProps().collectionDayStatus).toBe("gps-unavailable");
    expect(mapProps().trucks[0]).toMatchObject({ status: "offline", coords: [13.934, 121.421], eta: null, arrivedAtResident: false, lastPing: "2026-09-29T00:00:00.000Z" });
    await act(async () => { mocks.handlers.get("live:update")!([ping()]); });
    expect(mapProps().collectionDayStatus).toBe("active");
    expect(mapProps().trucks[0].eta).not.toBeNull();
  });

  it("waits for the first GPS location after collection starts", async () => {
    setupCollection(); await render();
    expect(mapProps().collectionDayStatus).toBe("gps-unavailable");
    expect(mapProps().trucks[0]).toMatchObject({ coords: null, eta: null, collectionStarted: true });
    expect(mapProps().trucks[0].lastPing).toBeUndefined();
  });

  it("keeps today's recurring collection scheduled even without a live truck or run", async () => {
    mocks.templates.mockResolvedValue([{ id: "route-a", status: "ACTIVE", day_of_week: getManilaNow().weekday.toUpperCase(), start_time: "06:00:00", stops: [{ barangay_id: "b1", street_id: "s1" }] }]);
    await render();
    expect(mapProps().collectionDayStatus).toBe("scheduled-not-started");
    expect(host.textContent).toContain("Today");
  });

  it.each([
    ["SCHEDULED", "NOT_STARTED", null, "scheduled-not-started"],
    ["PAUSED", "IN_PROGRESS", "2026-09-29T00:00:00Z", "paused"],
    ["ACTIVE", "DONE", "2026-09-29T00:00:00Z", "completed"],
    ["ACTIVE", "MISSED", "2026-09-29T00:00:00Z", "completed"],
  ])("preserves %s / %s collection state when GPS is missing", async (routeStatus, stopStatus, started, expected) => {
    setupCollection(routeStatus, stopStatus, started); await render();
    expect(mapProps().collectionDayStatus).toBe(expected);
  });

  it("shows the last GPS timestamp without claiming no collection is scheduled", async () => {
    setupCollection(); mocks.live.mockResolvedValue([ping(new Date(Date.now() - 300_000).toISOString())]);
    await render();
    const { default: ActualMap } = await vi.importActual<typeof import("./TrackingMap")>("./TrackingMap");
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><ActualMap {...mapProps()} /></QueryClientProvider>);
    expect(html).toContain("GPS updates delayed");
    expect(html).toContain("Last GPS update:");
    expect(html).toContain("last known location");
    expect(html).not.toContain("No Collection Scheduled Today");
    expect(html).not.toContain("Travel estimate");
  });
});
