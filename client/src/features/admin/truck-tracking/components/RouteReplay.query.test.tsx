import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { fetchTruckHistory, type HistoryRow } from "@/services/trackingService";
import type { AdminTruck } from "../types";
import RouteReplay from "./RouteReplay";
import { exportReplayVideo } from "../utils/replayVideoExporter";

vi.mock("@/services/trackingService", () => ({ fetchTruckHistory: vi.fn() }));
vi.mock("../utils/replayVideoExporter", () => ({ exportReplayVideo: vi.fn(), REPLAY_VIDEO_SPEEDS: [1, 2, 5, 10, 30, 60] }));
vi.mock("@/components/ui/searchable-select", () => ({
  SearchableSelect: ({ value, onValueChange }: { value: string; onValueChange: (id: string) => void }) =>
    <select aria-label="Truck" value={value} onChange={event => onValueChange(event.target.value)}><option value="" /><option value="one">Truck 1</option></select>,
}));
const logs = [0, 1, 2].map(index => ({ latitude: 14 + index / 1000, longitude: 121, created_at: `2026-10-09T01:0${index}:00Z` })) as HistoryRow[];
let client: QueryClient;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  notifyManager.setScheduler(queueMicrotask);
  client = new QueryClient();
  useAuthStore.setState({ user: { id: "admin", role: "ADMIN" } as never, token: "fixture" });
  vi.mocked(fetchTruckHistory).mockResolvedValue({ logs, stops: [] });
});
it("holds the export snapshot until video creation finishes, then adopts refreshed history", async () => {
  const onPath = vi.fn();
  let finish!: () => void;
  vi.mocked(exportReplayVideo).mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<QueryClientProvider client={client}><RouteReplay trucks={[{ id: "one", name: "Truck 1" } as AdminTruck]}
    onReplayPath={onPath} onReplayIndex={vi.fn()} /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("Truck"), { target: { value: "one" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Load Replay" })); });
  fireEvent.click(screen.getByRole("button", { name: "Download Video" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create Video" })); });
  const extended = [...logs, { latitude: 14.003, longitude: 121, created_at: "2026-10-09T01:03:00Z" } as HistoryRow];
  vi.mocked(fetchTruckHistory).mockResolvedValue({ logs: extended, stops: [] });
  await act(async () => {
    const key = client.getQueryCache().getAll().find(query => query.queryKey[2] === "tracking" && query.queryKey[3] === "history" && query.queryKey[4] === "one")!.queryKey;
    client.setQueryData(key, { logs: extended, stops: [] });
  });
  expect(onPath).toHaveBeenLastCalledWith(logs.map(row => [row.latitude, row.longitude]));
  expect(vi.mocked(exportReplayVideo).mock.calls[0][0].trip.path).toHaveLength(logs.length);
  await act(async () => { finish(); });
  expect(onPath).toHaveBeenLastCalledWith(extended.map(row => [row.latitude, row.longitude]));
});
afterEach(() => {
  cleanup(); client.clear(); vi.clearAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals();
  notifyManager.setScheduler(callback => setTimeout(callback, 0));
});
it("refreshes loaded history when paused, preserving elapsed time and the active playback snapshot", async () => {
  const onPath = vi.fn();
  render(<QueryClientProvider client={client}><RouteReplay trucks={[{ id: "one", name: "Truck 1" } as AdminTruck]}
    onReplayPath={onPath} onReplayIndex={vi.fn()} /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("Truck"), { target: { value: "one" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Load Replay" })); });
  await act(async () => { vi.advanceTimersByTime(15_000); });
  const before = screen.getByRole("slider").getAttribute("aria-valuenow");
  const extended = [...logs, { latitude: 14.003, longitude: 121, created_at: "2026-10-09T01:03:00Z" } as HistoryRow];
  vi.mocked(fetchTruckHistory).mockResolvedValue({ logs: extended, stops: [] });
  await act(async () => { await client.invalidateQueries({ queryKey: ["admin", "admin", "tracking"] }); });
  expect(onPath).toHaveBeenLastCalledWith(logs.map(row => [row.latitude, row.longitude]));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Pause" })); });
  await act(async () => { vi.advanceTimersByTime(0); });
  expect(onPath).toHaveBeenLastCalledWith(extended.map(row => [row.latitude, row.longitude]));
  expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", before);
});
it("resumes automatic history refresh after playback reaches its last recorded point", async () => {
  const onPath = vi.fn();
  render(<QueryClientProvider client={client}><RouteReplay trucks={[{ id: "one", name: "Truck 1" } as AdminTruck]}
    onReplayPath={onPath} onReplayIndex={vi.fn()} /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("Truck"), { target: { value: "one" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Load Replay" })); });
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(screen.getByText("Finished")).toBeInTheDocument();
  const extended = [...logs, { latitude: 14.003, longitude: 121, created_at: "2026-10-09T01:03:00Z" } as HistoryRow];
  vi.mocked(fetchTruckHistory).mockResolvedValue({ logs: extended, stops: [] });
  await act(async () => { await client.invalidateQueries({ queryKey: ["admin", "admin", "tracking"] }); });
  await act(async () => { vi.advanceTimersByTime(0); });
  expect(onPath).toHaveBeenLastCalledWith(extended.map(row => [row.latitude, row.longitude]));
});
