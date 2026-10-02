import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchTruckHistory, type HistoryRow, type RouteStopHistoryItem } from "@/services/trackingService";
import { exportReplayVideo } from "../utils/replayVideoExporter";
import type { AdminTruck } from "../types";
import RouteReplay from "./RouteReplay";

vi.mock("@/lib/adminQuery", () => ({ useAdminFetch: () => (_domain: string, _key: unknown, request: () => unknown) => request() }));
vi.mock("@/services/trackingService", () => ({ fetchTruckHistory: vi.fn() }));
vi.mock("../utils/replayVideoExporter", () => ({ exportReplayVideo: vi.fn(async () => {}), REPLAY_VIDEO_SPEEDS: [1, 2, 5, 10, 30, 60] }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/searchable-select", () => ({
  SearchableSelect: ({ value, onValueChange, disabled, options }: { value: string; onValueChange: (value: string) => void; disabled: boolean; options: { value: string; label: string }[] }) => <select aria-label="Truck" value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}><option value="">Select a truck</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>,
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
  const element = [...document.querySelectorAll("button")].find((item) => item.getAttribute("aria-label") === name || item.textContent === name);
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
  expect(host.textContent).not.toMatch(/Leg Progress|GPS Point|A street|B street/);
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
  await click("Try again"); expect(button("Pause")).toBeTruthy();
});

it("shows a lone recorded position without playback or video controls", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs: logs.slice(0, 1), stops: [] });
  await load();
  expect(onPath).toHaveBeenLastCalledWith([[14, 121]]);
  expect(host.textContent).toContain("Only one GPS record");
  expect(host.querySelector('input[type="range"]')).toBeNull();
  expect(host.textContent).not.toContain("Download video");
});

it("lists every target immediately and updates its state while playback remains continuous", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_id: "pob", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z" },
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_id: "pob", barangay_name: "Poblacion", stop_name: "Another Street", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z" },
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_id: "mal", barangay_name: "Malabanan", stop_name: "Malabanan Street", stop_order: 3, stop_status: "DONE", completed_at: "2026-09-28T01:03:00Z" },
  ] as RouteStopHistoryItem[] });
  await load();
  const target = () => host.querySelector("dl dd")!.textContent;
  const list = () => host.querySelector('[aria-label="Target street locations"]')!;
  expect(target()).toBe("Argao Street (Poblacion)");
  expect(list().querySelectorAll("li")).toHaveLength(3);
  expect(list().textContent).toContain("Upcoming");
  expect(button("Play from target 1: Argao Street (Poblacion)").getAttribute("aria-current")).toBe("step");
  await tick(30000);
  expect(target()).toBe("Another Street (Poblacion)");
  expect(list().querySelectorAll("li")).toHaveLength(3);
  expect(button("Play from target 1: Argao Street (Poblacion)").textContent).toContain("Completed");
  await tick(30000);
  expect(target()).toBe("Malabanan Street (Malabanan)");
  expect(button("Play from target 2: Another Street (Poblacion)").textContent).toContain("Completed");
  expect(button("Pause")).toBeTruthy();
  await tick(30000);
  expect(target()).toBe("No remaining target");
  expect(list().querySelectorAll("li")).toHaveLength(3);
  await click("Restart replay");
  expect(target()).toBe("Argao Street (Poblacion)");
  expect(list().querySelectorAll("li")).toHaveLength(3);
  expect(host.textContent).toContain("Current target street");
  expect(host.textContent).toContain("Target streets");
  expect(host.textContent).not.toContain("Completed streets");
  expect(host.textContent).not.toContain("Completed barangays");
});

it("exports the full trip and aborts video work when the panel closes", async () => {
  vi.mocked(exportReplayVideo).mockImplementationOnce(({ signal }) => new Promise((_, reject) => signal!.addEventListener("abort", () => reject(new Error("Aborted")))));
  await load(); await click("Download video");
  expect(exportReplayVideo).not.toHaveBeenCalled();
  await act(async () => (document.querySelector('input[name="replay-video-speed"][value="5"]') as HTMLInputElement).click());
  await click("Create video");
  const options = vi.mocked(exportReplayVideo).mock.calls[0][0];
  expect(options.speed).toBe(5);
  expect(options.trip.path).toHaveLength(4);
  expect(options).not.toHaveProperty("legs");
  expect(host.querySelector("select")!.disabled).toBe(true);
  await act(async () => root.unmount());
  expect(options.signal!.aborted).toBe(true);
  expect(onPath).toHaveBeenLastCalledWith(undefined);
  expect(onIndex).toHaveBeenLastCalledWith(undefined);
});

it("shows accurate video export stages and progress while keeping cancel available", async () => {
  vi.mocked(exportReplayVideo).mockImplementationOnce(({ signal }) => new Promise((_, reject) => signal!.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")))));
  await load(); await click("Download video"); await click("Create video");
  const options = vi.mocked(exportReplayVideo).mock.calls[0][0];
  const progress = () => document.querySelector('[role="progressbar"][aria-label="Video export progress"]');
  const loadingButton = () => document.querySelector('button[data-loading="true"]');
  expect(loadingButton()?.getAttribute("data-loading-label")).toBe("Preparing map…");
  expect(document.querySelector('.gw-action-loader')).toBeTruthy();
  expect(progress()?.hasAttribute("aria-valuenow")).toBe(false);

  await act(async () => { options.onStage?.("encoding"); options.onProgress?.(17); });
  expect(loadingButton()?.getAttribute("data-loading-label")).toBe("Encoding video…");
  expect(progress()?.getAttribute("aria-valuenow")).toBe("17");
  expect(progress()?.firstElementChild?.getAttribute("style")).toContain("width: 17%");

  await act(async () => { options.onStage?.("recording"); options.onProgress?.(42); });
  expect(loadingButton()?.getAttribute("data-loading-label")).toBe("Recording video…");
  expect(progress()?.getAttribute("aria-valuenow")).toBe("42");

  await act(async () => { options.onStage?.("finalizing"); });
  expect(loadingButton()?.getAttribute("data-loading-label")).toBe("Finishing file…");
  expect(progress()?.getAttribute("aria-valuenow")).toBe("42");
  await click("Cancel");
  expect(options.signal?.aborted).toBe(true);
});

it("cancels a video export from the popup and allows another attempt", async () => {
  vi.mocked(exportReplayVideo).mockImplementationOnce(({ signal }) => new Promise((_, reject) => signal!.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")))));
  await load(); await click("Download video"); await click("Create video");
  const options = vi.mocked(exportReplayVideo).mock.calls[0][0];
  await click("Cancel");
  expect(options.signal!.aborted).toBe(true);
  expect(host.querySelector("select")!.disabled).toBe(false);
  await click("Download video");
  expect(button("Create video").disabled).toBe(false);
});

it("shows a failed map export in the popup and lets the user retry", async () => {
  vi.mocked(exportReplayVideo).mockRejectedValueOnce(new Error("Could not load the map. Please check your connection and try again."));
  await load(); await click("Download video"); await click("Create video");
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Could not load the map");
  expect(button("Create video").disabled).toBe(false);
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

it("plays from a selected target's start while playing, paused, or finished", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Argao St (Ilaya)", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z", coverage_path: [[14.04, 121.42]] },
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Argao St (Ibaba)", stop_order: 2, stop_status: "MISSED", completed_at: "2026-09-28T01:02:00Z", coverage_path: [[14.05, 121.43]] },
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Cabunag St (Ibaba)", stop_order: 3, stop_status: "DONE", completed_at: "2026-09-28T01:03:00Z", coverage_path: [[14.06, 121.44]] },
  ] as RouteStopHistoryItem[] });
  await load(); await tick(5000);
  await click("Play from target 3: Cabunag St (Ibaba) (Poblacion)");
  expect(onIndex).toHaveBeenLastCalledWith(2);
  expect(host.querySelector("dl dd")!.textContent).toBe("Cabunag St (Ibaba) (Poblacion)");
  expect(onTargetLocation).toHaveBeenLastCalledWith({ name: "Cabunag St (Ibaba) (Poblacion)", coords: [14.06, 121.44] });
  expect(onCompletedTargets).toHaveBeenLastCalledWith([{ name: "Argao St (Ilaya) (Poblacion)", coords: [14.04, 121.42] }]);
  expect(onSkippedTargets).toHaveBeenLastCalledWith([{ name: "Argao St (Ibaba) (Poblacion)", coords: [14.05, 121.43] }]);
  expect(host.textContent).toContain("Replay time: 09:02 AM");
  expect(button("Pause")).toBeTruthy();
  await tick(3000);
  expect(onIndex).toHaveBeenLastCalledWith(2.1);
  await click("Pause");
  await click("Play from target 2: Argao St (Ibaba) (Poblacion)");
  expect(onIndex).toHaveBeenLastCalledWith(1);
  expect(onSkippedTargets).toHaveBeenLastCalledWith([]);
  expect(host.textContent).toContain("Replay time: 09:01 AM");
  expect(button("Pause")).toBeTruthy();
  await tick(60000);
  expect(host.textContent).toContain("Finished");
  await click("Play from target 1: Argao St (Ilaya) (Poblacion)");
  expect(onIndex).toHaveBeenLastCalledWith(0);
  expect(onCompletedTargets).toHaveBeenLastCalledWith([]);
  expect(button("Pause")).toBeTruthy();
  await tick(3000); expect(onIndex).toHaveBeenLastCalledWith(0.1);
});

it("keeps targets visible but disables jumps with no matching GPS interval or recorded start", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Earlier Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T00:59:00Z" },
    { route_id: "missing-start", route_started_at: null, barangay_name: "Poblacion", stop_name: "Unknown Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z" },
  ] as RouteStopHistoryItem[] });
  await load();
  expect(button("Play from target 1: Earlier Street (Poblacion)").disabled).toBe(true);
  expect(button("Play from target 2: Unknown Street (Poblacion)").disabled).toBe(true);
  expect(host.textContent).toContain("Earlier Street (Poblacion)");
  expect(host.textContent).toContain("Time not recorded");
});

it("updates the target map location without interrupting playback and clears it when leaving the trip", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z", coverage_path: [[14.04, 121.42], [14.05, 121.43]] },
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Another Street", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z", coverage_path: [[14.06, 121.44], [14.07, 121.45]] },
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
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "IN_PROGRESS", latitude: 14.1, longitude: 121.5 },
  ] as RouteStopHistoryItem[] });
  await load();
  expect(onTargetLocation).toHaveBeenLastCalledWith(null);
  expect(host.textContent).toContain("Target location was not recorded.");
});

it("retains completed map locations after finishing and publishes them only when outcomes change", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z", coverage_path: [[14.04, 121.42]] },
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Another Street", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z", coverage_path: [[14.06, 121.44]] },
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
  await click("Play from target 2: Another Street (Poblacion)");
  expect(onCompletedTargets).toHaveBeenLastCalledWith([first]);
  await click("Restart replay"); expect(onCompletedTargets).toHaveBeenLastCalledWith([]);
  await tick(30000); expect(onCompletedTargets).toHaveBeenLastCalledWith([first]);
  await select("two"); expect(onCompletedTargets).toHaveBeenLastCalledWith([]);
});

it("retains skipped map locations through playback and clears future skips on rewind", async () => {
  vi.mocked(fetchTruckHistory).mockResolvedValueOnce({ logs, stops: [
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "MISSED", completed_at: "2026-09-28T01:01:00Z", coverage_path: [[14.04, 121.42]], skipped_reason: "Blocked road" },
    { route_id: "run", route_started_at: "2026-09-28T01:00:00Z", barangay_name: "Poblacion", stop_name: "Another Street", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z", coverage_path: [[14.06, 121.44]] },
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
