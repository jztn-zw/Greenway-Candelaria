import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { exportReplayVideo } from "./replayVideoExporter";
import type { ReplayTrip } from "./replayTrip";

const encodedFrames = vi.hoisted(() => vi.fn(async (_timestamp: number, _duration: number) => {}));
vi.mock("mediabunny", () => ({
  Quality: class {},
  BufferTarget: class { buffer: ArrayBuffer | null = null; },
  Mp4OutputFormat: class {}, WebMOutputFormat: class {},
  canEncodeVideo: vi.fn(async () => true),
  CanvasSource: class { add = encodedFrames; },
  Output: class {
    state = "pending";
    target: { buffer: ArrayBuffer | null };
    constructor({ target }: { target: { buffer: ArrayBuffer | null } }) { this.target = target; }
    addVideoTrack() {}
    async start() { this.state = "started"; }
    async finalize() { this.state = "finalized"; this.target.buffer = new Uint8Array([1, 2, 3]).buffer; }
    async cancel() { this.state = "canceled"; }
  },
}));

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
const drawImage = vi.fn();
const recordStart = vi.fn();
const captureDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "captureStream");
const urlDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillText, fillRect: vi.fn(), drawImage, save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  Object.defineProperty(HTMLCanvasElement.prototype, "captureStream", { configurable: true, value: () => ({ getTracks: () => [{ stop: stopTrack }] }) });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createUrl });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { download(this.download); });
  vi.stubGlobal("Image", class {
    onload?: () => void;
    onerror?: () => void;
    set src(value: string) { if (value) this.onload?.(); }
  });
  vi.stubGlobal("Path2D", class { moveTo() {} lineTo() {} });
  vi.stubGlobal("MediaRecorder", class {
    static isTypeSupported = (type: string) => type === "video/webm";
    state = "inactive";
    onstop?: () => void;
    ondataavailable?: (event: { data: Blob }) => void;
    start() { this.state = "recording"; recordStart(performance.now()); }
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

it("encodes the full map trip quickly while preserving the selected playback duration", async () => {
  vi.stubGlobal("VideoEncoder", class {});
  vi.stubGlobal("VideoFrame", class {});
  const onProgress = vi.fn();
  const onStage = vi.fn();
  const work = exportReplayVideo({ truckName: "Truck 1", plateNumber: "ABC-123", dateStr: "2026-09-28", trip, speed: 60, onProgress, onStage });
  await vi.advanceTimersByTimeAsync(100); await work;
  const labels = fillText.mock.calls.map(([text]) => text);
  expect(labels).toContain("Start"); expect(labels).toContain("End");
  expect(labels).toContain("Replay complete");
  expect(labels).toContain("Collection replay · Candelaria");
  expect(labels).toContain("2026-09-28 · 60× speed");
  expect(drawImage).toHaveBeenCalled();
  expect(drawImage.mock.calls.some(([image, x, y]) => image instanceof HTMLCanvasElement && x === 0 && y === 76)).toBe(true);
  expect(onStage.mock.calls.map(([stage]) => stage)).toEqual(["map", "encoding", "finalizing"]);
  expect(labels.join(" ")).toContain("09:02 AM");
  expect(download).toHaveBeenCalledWith("Truck_1_2026-09-28_Route_Replay_60x.mp4");
  expect(onProgress).toHaveBeenLastCalledWith(100);
  expect(recordStart).not.toHaveBeenCalled();
  expect(encodedFrames).toHaveBeenCalledTimes(48);
  expect(encodedFrames.mock.calls[0][0]).toBe(0);
  expect(encodedFrames.mock.calls.at(-1)![0]).toBeCloseTo(47 / 24);
  expect(encodedFrames.mock.calls.reduce((duration, [, frameDuration]) => duration + frameDuration, 0)).toBeCloseTo(2);
});

it("cancels an in-progress export, releases recording resources and avoids a download", async () => {
  const controller = new AbortController();
  const result = exportReplayVideo({ truckName: "Truck 1", plateNumber: "ABC-123", dateStr: "2026-09-28", trip, speed: 60, signal: controller.signal }).then(() => null, (error: Error) => error);
  await vi.advanceTimersByTimeAsync(100);
  controller.abort();
  await vi.runAllTimersAsync();
  expect((await result)?.name).toBe("AbortError");
  expect(stopRecording).toHaveBeenCalledTimes(1);
  expect(stopTrack).toHaveBeenCalledTimes(1);
  expect(download).not.toHaveBeenCalled();
  expect(createUrl).not.toHaveBeenCalled();
});

it("records for the trip duration divided by speed instead of a fixed clip length", async () => {
  const work = exportReplayVideo({ truckName: "Truck", plateNumber: "", dateStr: "2026-09-28", trip, speed: 10 });
  await vi.advanceTimersByTimeAsync(11000);
  expect(recordStart).toHaveBeenCalledTimes(1);
  expect(download).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1100);
  await work;
  expect(download).toHaveBeenCalledTimes(1);
});

it("does not record or download a plain video when the map cannot load", async () => {
  vi.stubGlobal("Image", class { onerror?: () => void; set src(value: string) { if (value) this.onerror?.(); } });
  await expect(exportReplayVideo({ truckName: "Truck", plateNumber: "", dateStr: "2026-09-28", trip, speed: 10 })).rejects.toThrow("Could not load the map");
  expect(recordStart).not.toHaveBeenCalled();
  expect(download).not.toHaveBeenCalled();
});

it("waits for slow map tiles before starting the recording", async () => {
  vi.stubGlobal("Image", class {
    onload?: () => void;
    set src(value: string) { if (value) window.setTimeout(() => this.onload?.(), 2500); }
  });
  const work = exportReplayVideo({ truckName: "Truck", plateNumber: "", dateStr: "2026-09-28", trip, speed: 60 });
  await vi.advanceTimersByTimeAsync(2000);
  expect(recordStart).not.toHaveBeenCalled();
  await vi.runAllTimersAsync(); await work;
  expect(recordStart).toHaveBeenCalledTimes(1);
  expect(download).toHaveBeenCalledTimes(1);
});

it("can cancel while waiting for map tiles without starting a recorder", async () => {
  vi.stubGlobal("Image", class { set src(_value: string) {} });
  const controller = new AbortController();
  const result = exportReplayVideo({ truckName: "Truck", plateNumber: "", dateStr: "2026-09-28", trip, speed: 10, signal: controller.signal }).catch((error: Error) => error);
  controller.abort();
  expect((await result as Error).name).toBe("AbortError");
  expect(recordStart).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
