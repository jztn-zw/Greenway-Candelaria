import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { adminKey } from "@/lib/adminQuery";
import useAuthStore from "@/store/authStore";
import { deleteRoute, updateRoute } from "@/services/routesService";
import { useRoutes, type RouteData } from "./useRoutes";

vi.mock("@/lib/adminQuery", async (original) => ({
  ...await original<typeof import("@/lib/adminQuery")>(),
  useAdminMutation: (action: unknown) => action,
}));
vi.mock("@/services/routesService", () => ({ fetchRoutes: vi.fn(), createRoute: vi.fn(), deleteRoute: vi.fn(), updateRoute: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
let host: HTMLDivElement; let root: Root; let client: QueryClient;
let actions: ReturnType<typeof useRoutes>;
const key = adminKey("admin", "routes", "list");
const route: RouteData = { id: "route", day: "Monday", truckId: "truck", truckName: "Truck 1", truckPlate: "ABC-123", driverId: null, driverName: "Unassigned", startTime: "06:00", stops: [], barangays: [], active: true, status: "ACTIVE" };
const Harness = () => { actions = useRoutes(); return <output>{JSON.stringify(actions.routes)}</output>; };
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetAllMocks();
  useAuthStore.setState({ user: { id: "admin", role: "ADMIN" } as never });
  client = new QueryClient(); client.setQueryData(key, [route]);
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>));
});
afterEach(() => { act(() => root.unmount()); client.clear(); host.remove(); });

it.each(["success", "failure"])("keeps route status until the real update settles (%s)", async (result) => {
  let resolve!: () => void; let reject!: (error: Error) => void;
  vi.mocked(updateRoute).mockImplementationOnce(() => new Promise((yes, no) => { resolve = () => yes({} as never); reject = no; }));
  let operation!: Promise<boolean>;
  act(() => { operation = actions.toggleActive(route); });
  expect(client.getQueryData<RouteData[]>(key)?.[0]).toEqual(route);
  await act(async () => { if (result === "success") resolve(); else reject(new Error("Unavailable")); await operation; });
  expect(await operation).toBe(result === "success");
  expect(client.getQueryData<RouteData[]>(key)?.[0].active).toBe(result !== "success");
  expect(client.getQueryData<RouteData[]>(key)?.[0].status).toBe(result === "success" ? "INACTIVE" : "ACTIVE");
});

it.each(["success", "failure"])("keeps the route visible until deletion settles (%s)", async (result) => {
  let resolve!: () => void; let reject!: (error: Error) => void;
  vi.mocked(deleteRoute).mockImplementationOnce(() => new Promise((yes, no) => { resolve = () => yes({ message: "Deleted" }); reject = no; }));
  let operation!: Promise<boolean>;
  act(() => { operation = actions.remove(route.id); });
  expect(client.getQueryData<RouteData[]>(key)).toEqual([route]);
  await act(async () => { if (result === "success") resolve(); else reject(new Error("Unavailable")); await operation; });
  expect(await operation).toBe(result === "success");
  expect(client.getQueryData<RouteData[]>(key)).toEqual(result === "success" ? [] : [route]);
});
