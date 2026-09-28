import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { residentKey } from "@/lib/residentQuery";
import ResidentTruckTracking from "./ResidentTruckTracking";

const mocks = vi.hoisted(() => ({ live: vi.fn(), handlers: new Map<string, (rows?: unknown[]) => void>(), disconnect: vi.fn() }));
vi.mock("socket.io-client", () => ({ io: () => ({
  on: (name: string, fn: (rows?: unknown[]) => void) => mocks.handlers.set(name, fn),
  emit: vi.fn(), connect: vi.fn(), disconnect: mocks.disconnect,
}) }));
vi.mock("@/services/trackingService", () => ({ fetchAllTrucks: async () => [], fetchTodayRoutes: async () => [], fetchLiveTrucks: () => mocks.live() }));
vi.mock("@/services/barangaysService", () => ({ fetchBarangays: async () => [] }));
vi.mock("@/services/routesService", () => ({ fetchRoutes: async () => [] }));
vi.mock("./TrackingMap", () => ({ default: () => <div>Tracking map</div> }));

describe("resident tracking queries and GPS", () => {
  let host: HTMLDivElement; let root: Root; let client: QueryClient;
  beforeEach(() => {
    notifyManager.setScheduler(queueMicrotask);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    useAuthStore.setState({ user: { id: "resident-a", role: "RESIDENT", barangay_id: "b1", street_id: "s1" } as never, token: "session-a" });
    client = new QueryClient(); host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
    mocks.handlers.clear(); mocks.disconnect.mockClear();
  });
  afterEach(() => {
    act(() => root.unmount()); client.clear(); host.remove();
    notifyManager.setScheduler((fn) => setTimeout(fn, 0));
  });
  const render = () => act(async () => root.render(<QueryClientProvider client={client}><ResidentTruckTracking /></QueryClientProvider>));

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
});
