import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import CollectorRouteHistory from "./CollectorRouteHistory";
import { fetchCollectorHistoryPage, fetchCollectorHistoryRun, type RouteHistoryItem } from "@/services/driverManagerService";
vi.mock("@/services/driverManagerService", () => ({ fetchCollectorHistoryPage: vi.fn(), fetchCollectorHistoryRun: vi.fn() }));
const run = (id = "run-A"): RouteHistoryItem => ({ id, routeName: `Route ${id}`, date: "Sep 27, 2026", dayOfWeek: "Sunday", wasteType: "General",
  truckName: "Historical truck", truckPlate: "OLD-123", totalStops: 1, completedStops: 0, skippedStops: 1, completionPct: 0,
  timeOnRoute: null, status: "no-collection", stops: [{ id: "stop", stopNumber: 1, barangay: "Saved checkpoint", status: "skipped", time: "", skipReason: "Route ended" }] });
let host: HTMLDivElement; let root: Root;
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient(); notifyManager.setScheduler(queueMicrotask);
  useAuthStore.setState({ user: { id: "collector", role: "DRIVER" } as never, token: "session" });
  vi.resetAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.mocked(fetchCollectorHistoryPage).mockResolvedValue({ items: [run()], total: 1, nextCursor: null });
  vi.mocked(fetchCollectorHistoryRun).mockResolvedValue(run());
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); client.clear(); notifyManager.setScheduler((callback) => setTimeout(callback, 0)); host.remove(); });
const Navigation = () => { const navigate = useNavigate(); return <button onClick={() => navigate("?route=missing")}>Unknown link</button>; };
const render = async (url = "/collector/route-history") => { await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Navigation /><CollectorRouteHistory /></MemoryRouter></QueryClientProvider>)); };
it("shows load failure and retry instead of false empty history", async () => {
  vi.mocked(fetchCollectorHistoryPage).mockRejectedValueOnce(new Error("offline")); await render();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not be loaded"); expect(host.textContent).not.toContain("No route logs found");
  await act(async () => [...host.querySelectorAll("button")].find((button) => button.textContent === "Retry")!.click());
  expect(host.textContent).toContain("Route run-A");
});
it("fetches an older linked route directly without searching only the recent page", async () => {
  vi.mocked(fetchCollectorHistoryRun).mockResolvedValue(run("older-than-50")); await render("/collector/route-history?route=older-than-50");
  expect(fetchCollectorHistoryRun).toHaveBeenCalledWith("older-than-50"); expect(fetchCollectorHistoryPage).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Route older-than-50");
});
it("never leaves a previous route's details on an invalid URL", async () => {
  await render("/collector/route-history?route=run-A");
  vi.mocked(fetchCollectorHistoryRun).mockRejectedValue({ response: { status: 404 } });
  await act(async () => [...host.querySelectorAll("button")].find((button) => button.textContent === "Unknown link")!.click());
  expect(host.textContent).toContain("Route not found"); expect(host.textContent).not.toContain("Route run-A");
});
it("loads older pages on demand and filters across the full backend history", async () => {
  vi.mocked(fetchCollectorHistoryPage).mockResolvedValueOnce({ items: [run()], total: 80, nextCursor: "next" }); await render();
  vi.mocked(fetchCollectorHistoryPage).mockResolvedValueOnce({ items: [run("older")], total: 80, nextCursor: null });
  await act(async () => [...host.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Load older routes"))!.click());
  expect(fetchCollectorHistoryPage).toHaveBeenLastCalledWith({ status: "all", waste_type: "all", cursor: "next" });
  expect(host.textContent).toContain("Route older");
  await act(async () => [...host.querySelectorAll("button")].find((button) => button.textContent === "No collection")!.click());
  expect(fetchCollectorHistoryPage).toHaveBeenLastCalledWith({ status: "no-collection", waste_type: "all", cursor: undefined });
});
it("keeps the list when the already-selected status tab is clicked", async () => {
  await render(); await act(async () => [...host.querySelectorAll("button")].find((button) => button.querySelector("span")?.textContent === "All routes")!.click());
  expect(host.textContent).toContain("Route run-A"); expect(fetchCollectorHistoryPage).toHaveBeenCalledTimes(1);
});
it("uses accessible route buttons and honest duration without unsupported counts", async () => {
  await render(); const button = [...host.querySelectorAll("button")].find((item) => item.textContent?.includes("Route run-A"))!;
  await act(async () => button.click());
  expect(host.textContent).toContain("Active collection time"); expect(host.textContent).toContain("Unavailable");
  expect(host.textContent).not.toContain("residents notified"); expect(host.textContent).not.toContain("Shift duration");
});
