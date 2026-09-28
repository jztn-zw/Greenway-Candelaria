import { act, type ReactNode, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchTruckHistory, type HistoryRow, type RouteStopHistoryItem } from "@/services/trackingService";
import { exportReplayVideo } from "../utils/replayVideoExporter";
import type { AdminTruck } from "../types";
import RouteReplay from "./RouteReplay";

vi.mock("@/lib/adminQuery", () => ({ useAdminFetch: () => (_domain: string, _key: unknown, request: () => unknown) => request() }));
vi.mock("@/services/trackingService", () => ({ fetchTruckHistory: vi.fn() }));
vi.mock("../utils/replayVideoExporter", () => ({ exportReplayVideo: vi.fn(async () => {}) }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, disabled, children }: { value: string; onValueChange: (value: string) => void; disabled: boolean; children: ReactNode }) => <select aria-label="Truck" value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}><option value="">Select a truck</option>{children}</select>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactElement[] }) => <option value={value}>{children.map((child) => child.props.children).join(" ")}</option>,
}));
vi.mock("@/components/ui/slider", () => ({
  Slider: ({ value, max, onValueChange }: { value: number[]; max: number; onValueChange: (value: number[]) => void }) => <input aria-label="Trip replay progress" type="range" min={0} max={max} value={value[0]} onChange={(event) => onValueChange([Number(event.target.value)])} />,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let host: HTMLDivElement;
const onPath = vi.fn();
const onIndex = vi.fn();
const onTargetLocation = vi.fn();
const onCompletedTargets = vi.fn();
const onSkippedTargets = vi.fn();
const trucks = [{ id: "one", name: "Truck 1", plateNumber: "ABC-123" }, { id: "two", name: "Truck 2", plateNumber: "DEF-456" }] as AdminTruck[];
const logs = [0, 1, 2, 3].map((index) => ({ latitude: 14 + index / 1000, longitude: 121, created_at: "2026-09-28T01:0" + index + ":00Z" })) as HistoryRow[];
const button = (name: string) => {
  const element = [...host.querySelectorAll("button")].find((item) => item.getAttribute("aria-label") === name || item.textContent === name);
  if (!element) throw new Error("Missing button " + name);
  return element;
};
const click = async (name: string) => act(async () => button(name).click());
const select = async (id: string) => act(async () => {
  const element = host.querySelector("select")!;
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(element, id);
  element.dispatchEvent(new Event("change", { bubbles: true }));
});
const tick = async (milliseconds: number) => act(async () => { vi.advanceTimersByTime(milliseconds); });
const load = async () => { await select("one"); await click("Load replay"); };

beforeEach(async () => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.mocked(fetchTruckHistory).mockResolvedValue({ logs, stops: [{ stop_name: "A street" }, { stop_name: "B street" }] as never });
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(<RouteReplay trucks={trucks} onReplayPath={onPath} onReplayIndex={onIndex} onReplayTargetLocation={onTargetLocation} onReplayCompletedTargets={onCompletedTargets} onReplaySkippedTargets={onSkippedTargets} />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove(); vi.useRealTimers();
});

it("plays one complete GPS trail across street boundaries without transition pauses", async () => {
  await load();
  expect(onPath).toHaveBeenLastCalledWith(logs.map((log) => [log.latitude, log.longitude]));
  for (let index = 1; index <= 3; index++) {
    await tick(30000);
    expect(onIndex).toHaveBeenLastCalledWith(index);
  }
  expect(host.textContent).toContain("Finished");
  expect(host.textContent).toContain("100%");
  expect(button("Replay again")).toBeTruthy();
  expect(host.textContent).not.toMatch(/Target|Leg Progress|GPS Point|A street|B street/);
  await click("Replay again");
  expect(onIndex).toHaveBeenLastCalledWith(0);
});

it("pauses, seeks, changes speed and restarts without a pending street transition", async () => {
  await load(); await tick(30000); await click("Pause");
  await tick(3000); expect(onIndex).toHaveBeenLastCalledWith(1);
  expect(host.textContent).toContain("Paused");
  await act(async () => {
    const slider = host.querySelector('input[type="range"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(slider, "120000");
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(onIndex).toHaveBeenLastCalledWith(2);
  await click("10×"); await click("Play");
  await tick(6000); expect(onIndex).toHaveBeenLastCalledWith(3);
  await click("Restart replay"); expect(onIndex).toHaveBeenLastCalledWith(0);
});

it("discards a stale request when the selected truck changes", async () => {
  let resolve!: (result: { logs: HistoryRow[]; stops: [] }) => void;
  vi.mocked(fetchTruckHistory).mockImplementation(() => new Promise((done) => { resolve = done; }));
  await select("one"); await click("Load replay"); await select("two");
  await act(async () => resolve({ logs, stops: [] }));
  expect(onPath).toHaveBeenLastCalledWith(undefined);
  expect(host.querySelector('input[type="range"]')).toBeNull();
  expect(button("Load replay").disabled).toBe(false);
});

it("shows useful empty and retry states without a fake route", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs: [], stops: [] });
  await load();
  expect(host.textContent).toContain("No GPS records");
  expect(host.querySelector('input[type="range"]')).toBeNull();
  vi.mocked(fetchTruckHistory).mockRejectedValueOnce(new Error("Unavailable"));
  await click("Load replay");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Could not load");
  await click("Retry"); expect(button("Pause")).toBeTruthy();
});

it("shows a lone recorded position without playback or video controls", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs: logs.slice(0, 1), stops: [] });
  await load();
  expect(onPath).toHaveBeenLastCalledWith([[14, 121]]);
  expect(host.textContent).toContain("Only one GPS record");
  expect(host.querySelector('input[type="range"]')).toBeNull();
  expect(host.textContent).not.toContain("Download video");
});

it("shows the actual target street and completed streets while playback remains continuous", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", barangay_id: "pob", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z" },
    { route_id: "run", barangay_id: "pob", barangay_name: "Poblacion", stop_name: "Another Street", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z" },
    { route_id: "run", barangay_id: "mal", barangay_name: "Malabanan", stop_name: "Malabanan Street", stop_order: 3, stop_status: "DONE", completed_at: "2026-09-28T01:03:00Z" },
  ] as RouteStopHistoryItem[] });
  await load();
  const target = () => host.querySelector("dl dd")!.textContent;
  expect(target()).toBe("Argao Street (Poblacion)");
  expect(host.querySelectorAll("dl li")).toHaveLength(0);
  await tick(30000);
  expect(target()).toBe("Another Street (Poblacion)");
  expect([...host.querySelectorAll("dl li")].map((item) => item.textContent)).toEqual(["Argao Street (Poblacion)"]);
  await tick(30000);
  expect(target()).toBe("Malabanan Street (Malabanan)");
  expect([...host.querySelectorAll("dl li")].map((item) => item.textContent)).toEqual(["Argao Street (Poblacion)", "Another Street (Poblacion)"]);
  expect(button("Pause")).toBeTruthy();
  await tick(30000);
  expect(target()).toBe("No remaining target");
  expect(host.querySelectorAll("dl li")).toHaveLength(3);
  await click("Restart replay");
  expect(target()).toBe("Argao Street (Poblacion)");
  expect(host.querySelectorAll("dl li")).toHaveLength(0);
  expect(host.textContent).toContain("Current target street");
  expect(host.textContent).toContain("Completed streets");
  expect(host.textContent).not.toContain("Completed barangays");
});

it("exports the full trip and aborts video work when the panel closes", async () => {
  vi.mocked(exportReplayVideo).mockImplementationOnce(({ signal }) => new Promise((_, reject) => signal!.addEventListener("abort", () => reject(new Error("Aborted")))));
  await load(); await click("Download video");
  const options = vi.mocked(exportReplayVideo).mock.calls[0][0];
  expect(options.trip.path).toHaveLength(4);
  expect(options).not.toHaveProperty("legs");
  expect(host.querySelector("select")!.disabled).toBe(true);
  await act(async () => root.unmount());
  expect(options.signal!.aborted).toBe(true);
  expect(onPath).toHaveBeenLastCalledWith(undefined);
  expect(onIndex).toHaveBeenLastCalledWith(undefined);
});

it("uses real recorded time gaps at 1× and keeps the clock accurate through pause and speed changes", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs: [
    { latitude: 14, longitude: 121, created_at: "2026-09-28 01:00:00" },
    { latitude: 14.001, longitude: 121, created_at: "2026-09-28 01:00:02" },
    { latitude: 14.003, longitude: 121, created_at: "2026-09-28 01:00:10" },
  ] as HistoryRow[], stops: [] });
  await load(); await click("1×");
  await tick(1000);
  expect(onIndex).toHaveBeenLastCalledWith(0.5);
  expect(host.textContent).toContain("Replay time: 09:00 AM");
  expect(host.textContent).toContain("10%");
  // Pause between animation frames: preserve the extra 50 ms too.
  await tick(50); await click("Pause"); await tick(5000);
  expect(onIndex).toHaveBeenLastCalledWith(0.525);
  await click("Play"); await tick(950);
  expect(onIndex).toHaveBeenLastCalledWith(0.975);
  await click("2×"); await tick(1000);
  expect(host.textContent).toContain("Replay time: 09:00 AM");
  expect(onIndex.mock.lastCall?.[0]).toBeCloseTo(1.25);
  await click("Restart replay");
  expect(onIndex).toHaveBeenLastCalledWith(0);
});

it("offers faster playback and shows the recorded trip duration once", async () => {
  await load();
  expect(host.textContent).toContain("Recorded duration");
  expect(host.textContent).toContain("3 min");
  expect(host.textContent!.match(/Recorded duration/g)).toHaveLength(1);
  await click("30×"); await tick(1000);
  expect(button("30×").getAttribute("aria-pressed")).toBe("true");
  expect(onIndex).toHaveBeenLastCalledWith(0.5);
  await click("60×"); await tick(1000);
  expect(button("60×").getAttribute("aria-pressed")).toBe("true");
  expect(onIndex).toHaveBeenLastCalledWith(1.5);
});

it("flags the active GPS gap and clears its active message at the next recorded point", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs: [
    { latitude: 14, longitude: 121, created_at: "2026-09-28T01:00:00Z" },
    { latitude: 14.001, longitude: 121, created_at: "2026-09-28T01:00:30Z" },
    { latitude: 14.003, longitude: 121, created_at: "2026-09-28T01:05:00Z" },
  ] as HistoryRow[], stops: [] });
  await load();
  const notice = () => host.querySelector('[aria-label="GPS recording gaps"]')!.textContent;
  expect(notice()).toContain("1 gap over 1 min");
  await tick(20000);
  expect(notice()).toContain("GPS gap: 09:00 AM – 09:05 AM");
  expect(notice()).toContain("Locations inside gaps are estimated.");
  expect(button("Pause")).toBeTruthy();
  await tick(130000);
  expect(notice()).not.toContain("GPS gap:");
  expect(button("Replay again")).toBeTruthy();
  await select("two");
  expect(host.querySelector('[aria-label="GPS recording gaps"]')).toBeNull();
});

it("clicking a completed street seeks to its saved completion and pauses until resumed", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z" },
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Another Street", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z" },
  ] as RouteStopHistoryItem[] });
  await load(); await tick(60000);
  expect(onIndex).toHaveBeenLastCalledWith(2);
  await click("Jump to Argao Street (Poblacion) completion");
  expect(onIndex).toHaveBeenLastCalledWith(1);
  expect(host.textContent).toContain("Replay time: 09:01 AM");
  expect(button("Play")).toBeTruthy();
  await tick(5000); expect(onIndex).toHaveBeenLastCalledWith(1);
  await click("Play"); await tick(30000);
  expect(onIndex).toHaveBeenLastCalledWith(2);
});

it("keeps completed streets visible but disables jumps outside the GPS timeline", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Earlier Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T00:59:00Z" },
  ] as RouteStopHistoryItem[] });
  await load();
  expect(button("Jump to Earlier Street (Poblacion) completion").disabled).toBe(true);
  expect(host.textContent).toContain("Earlier Street (Poblacion)");
});

it("updates the target map location without interrupting playback and clears it when leaving the trip", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z", coverage_path: [[14.04, 121.42], [14.05, 121.43]] },
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Another Street", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z", coverage_path: [[14.06, 121.44], [14.07, 121.45]] },
  ] as RouteStopHistoryItem[] });
  await load();
  expect(onTargetLocation).toHaveBeenLastCalledWith({ name: "Argao Street (Poblacion)", coords: [14.04, 121.42] });
  onTargetLocation.mockClear();
  await tick(500);
  expect(onTargetLocation).not.toHaveBeenCalled();
  await tick(29500);
  expect(onTargetLocation).toHaveBeenLastCalledWith({ name: "Another Street (Poblacion)", coords: [14.06, 121.44] });
  expect(button("Pause")).toBeTruthy();
  await tick(30000);
  expect(onTargetLocation).toHaveBeenLastCalledWith(null);
  expect(button("Pause")).toBeTruthy();
  await click("Restart replay");
  expect(onTargetLocation).toHaveBeenLastCalledWith({ name: "Argao Street (Poblacion)", coords: [14.04, 121.42] });
  await select("two");
  expect(onTargetLocation).toHaveBeenLastCalledWith(null);
});

it("explains unavailable street coordinates instead of placing a target at the barangay center", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "IN_PROGRESS", latitude: 14.1, longitude: 121.5 },
  ] as RouteStopHistoryItem[] });
  await load();
  expect(onTargetLocation).toHaveBeenLastCalledWith(null);
  expect(host.textContent).toContain("Target location was not recorded.");
});

it("retains completed map locations after finishing and publishes them only when outcomes change", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z", coverage_path: [[14.04, 121.42]] },
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Another Street", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z", coverage_path: [[14.06, 121.44]] },
  ] as RouteStopHistoryItem[] });
  const first = { name: "Argao Street (Poblacion)", coords: [14.04, 121.42] };
  const second = { name: "Another Street (Poblacion)", coords: [14.06, 121.44] };
  await load(); onCompletedTargets.mockClear();
  await tick(500); expect(onCompletedTargets).not.toHaveBeenCalled();
  await tick(29500); expect(onCompletedTargets).toHaveBeenLastCalledWith([first]);
  await tick(30000); expect(onCompletedTargets).toHaveBeenLastCalledWith([first, second]);
  const changes = onCompletedTargets.mock.calls.length;
  await tick(30000); expect(host.textContent).toContain("Finished");
  expect(onCompletedTargets).toHaveBeenCalledTimes(changes);
  expect(onCompletedTargets).toHaveBeenLastCalledWith([first, second]);
  await click("Jump to Argao Street (Poblacion) completion");
  expect(onCompletedTargets).toHaveBeenLastCalledWith([first]);
  await click("Restart replay"); expect(onCompletedTargets).toHaveBeenLastCalledWith([]);
  await tick(30000); expect(onCompletedTargets).toHaveBeenLastCalledWith([first]);
  await select("two"); expect(onCompletedTargets).toHaveBeenLastCalledWith([]);
});

it("retains skipped map locations through playback and clears future skips on rewind", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "MISSED", completed_at: "2026-09-28T01:01:00Z", coverage_path: [[14.04, 121.42]], skipped_reason: "Blocked road" },
    { route_id: "run", barangay_name: "Poblacion", stop_name: "Another Street", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z", coverage_path: [[14.06, 121.44]] },
  ] as RouteStopHistoryItem[] });
  const skipped = { name: "Argao Street (Poblacion)", coords: [14.04, 121.42], skippedReason: "Blocked road" };
  await load(); onSkippedTargets.mockClear();
  await tick(29500); expect(onSkippedTargets).not.toHaveBeenCalled();
  await tick(500); expect(onSkippedTargets).toHaveBeenLastCalledWith([skipped]);
  const calls = onSkippedTargets.mock.calls.length;
  await tick(60000); expect(onSkippedTargets).toHaveBeenCalledTimes(calls);
  expect(onCompletedTargets).toHaveBeenLastCalledWith([{ name: "Another Street (Poblacion)", coords: [14.06, 121.44] }]);
  await click("Restart replay"); expect(onSkippedTargets).toHaveBeenLastCalledWith([]);
  await tick(30000); expect(onSkippedTargets).toHaveBeenLastCalledWith([skipped]);
  await select("two"); expect(onSkippedTargets).toHaveBeenLastCalledWith([]);
});
