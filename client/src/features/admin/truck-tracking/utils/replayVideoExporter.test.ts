import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { exportReplayVideo } from "./replayVideoExporter";
import type { ReplayTrip } from "./replayTrip";

const trip: ReplayTrip = {
  path: [[14, 121], [14.001, 121.002], [14.003, 121.003]],
  timestamps: ["2026-09-28T01:00:00Z", "2026-09-28T01:01:00Z", "2026-09-28T01:02:00Z"],
  times: [Date.parse("2026-09-28T01:00:00Z"), Date.parse("2026-09-28T01:01:00Z"), Date.parse("2026-09-28T01:02:00Z")],
  distanceKm: 0.4567,
};
const fillText = vi.fn();
const stopTrack = vi.fn();
const stopRecording = vi.fn();
const createUrl = vi.fn(() => "blob:test-video");
const download = vi.fn();
const captureDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "captureStream");
const urlDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillText, fillRect: vi.fn(), drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  Object.defineProperty(HTMLCanvasElement.prototype, "captureStream", { configurable: true, value: () => ({ getTracks: () => [{ stop: stopTrack }] }) });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createUrl });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { download(this.download); });
  vi.stubGlobal("Image", class {
    onerror?: () => void;
    set src(_value: string) { this.onerror?.(); }
  });
  vi.stubGlobal("MediaRecorder", class {
    static isTypeSupported = (type: string) => type === "video/webm";
    state = "inactive";
    onstop?: () => void;
    ondataavailable?: (event: { data: Blob }) => void;
    start() { this.state = "recording"; }
    stop() {
      stopRecording(); this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["recorded frames"]) }); this.onstop?.();
    }
  });
});
afterEach(() => {
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const [object, key, descriptor] of [
    [HTMLCanvasElement.prototype, "captureStream", captureDescriptor],
    [URL, "createObjectURL", urlDescriptor], [URL, "revokeObjectURL", revokeDescriptor],
  ] as const) {
    if (descriptor) Object.defineProperty(object, key, descriptor);
    else Reflect.deleteProperty(object, key);
  }
});

it("exports one continuous full-trip video without street completion claims", async () => {
  const onProgress = vi.fn();
  const work = exportReplayVideo({ truckName: "Truck 1", plateNumber: "ABC-123", dateStr: "2026-09-28", trip, onProgress });
  await vi.runAllTimersAsync(); await work;
  const labels = fillText.mock.calls.map(([text]) => text);
  expect(labels).toContain("Start"); expect(labels).toContain("End");
  expect(labels).toContain("Replay complete");
  expect(labels.join(" ")).not.toMatch(/TARGET|COLLECTION STATUS|Successfully Completed|barangay/i);
  expect(labels.join(" ")).toContain("09:02 AM");
  expect(download).toHaveBeenCalledWith("Truck_1_2026-09-28_Route_Replay.webm");
  expect(onProgress).toHaveBeenLastCalledWith(100);
  expect(stopRecording).toHaveBeenCalledTimes(1);
  expect(stopTrack).toHaveBeenCalledTimes(1);
});

it("cancels an in-progress export, releases recording resources and avoids a download", async () => {
  const controller = new AbortController();
  const result = exportReplayVideo({ truckName: "Truck 1", plateNumber: "ABC-123", dateStr: "2026-09-28", trip, signal: controller.signal }).then(() => null, (error: Error) => error);
  await vi.advanceTimersByTimeAsync(100);
  controller.abort();
  await vi.runAllTimersAsync();
  expect((await result)?.name).toBe("AbortError");
  expect(stopRecording).toHaveBeenCalledTimes(1);
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(download).not.toHaveBeenCalled();
  expect(createUrl).not.toHaveBeenCalled();
});
