import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
const roots = new Set<Root>();
function renderHook<P, T>(useValue: (props: P) => T, config?: { initialProps: P }) {
  const host = document.createElement("div");
  const root = createRoot(host);
  roots.add(root);
  const result = { current: undefined as T };
  const Hook = ({ props }: { props: P }) => { result.current = useValue(props); return null; };
  const rerender = (props: P) => act(() => root.render(<Hook props={props} />));
  rerender(config?.initialProps as P);
  return { result, rerender, unmount: () => { act(() => root.unmount()); roots.delete(root); } };
}
const cleanup = () => { roots.forEach((root) => act(() => root.unmount())); roots.clear(); };
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveTracking } from "./useLiveTracking";
import { pingLocation } from "@/services/trackingService";
import { distanceToStopKm } from "../routeMap.utils";

vi.mock("@/services/trackingService", () => ({ pingLocation: vi.fn() }));
const ping = vi.mocked(pingLocation);
let success: PositionCallback;
let failure: PositionErrorCallback;
const getPosition = vi.fn((onSuccess: PositionCallback, onError: PositionErrorCallback) => {
  success = onSuccess; failure = onError;
});
const position = () => ({
  timestamp: Date.now(), coords: { latitude: 14, longitude: 121, accuracy: 5 },
}) as GeolocationPosition;
const options = { truckId: "truck", routeId: "run", isRouteEnded: false, isTrackingEnabled: true };

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.clearAllMocks();
  ping.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: getPosition } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("web GPS lifecycle", () => {
  it("discards a GPS callback that arrives after pause", async () => {
    const { rerender } = renderHook((props) => useLiveTracking(props), { initialProps: options });
    const lateCallback = success;
    rerender({ ...options, isTrackingEnabled: false });
    await act(async () => lateCallback(position()));
    expect(ping).not.toHaveBeenCalled();
  });
  it("discards a GPS callback after leaving the collector layout", async () => {
    const { unmount } = renderHook(() => useLiveTracking(options));
    unmount();
    await act(async () => { success(position()); });
    expect(ping).not.toHaveBeenCalled();
  });
  it("does not overlap acquisitions or requests and sends capture/run identity", async () => {
    let finish: () => void = () => {};
    ping.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    renderHook(() => useLiveTracking(options));
    await act(async () => vi.advanceTimersByTime(15000));
    expect(getPosition).toHaveBeenCalledTimes(1);
    await act(async () => { success(position()); });
    expect(ping).toHaveBeenCalledWith("truck", 14, 121, expect.objectContaining({
      route_run_id: "run", captured_at: new Date().toISOString(), sample_id: expect.any(String),
    }), expect.any(AbortSignal));
    await act(async () => vi.advanceTimersByTime(15000));
    expect(getPosition).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    await act(async () => vi.advanceTimersByTime(5000));
    expect(getPosition).toHaveBeenCalledTimes(2);
  });
  it("shows location permission failure without inventing a truck position", async () => {
    const { result } = renderHook(() => useLiveTracking(options));
    await act(async () => failure({ code: 1 } as GeolocationPositionError));
    expect(result.current.gpsError).toMatch(/Allow location access/);
    expect(result.current.truckCoords).toBeNull();
  });
  it("drops stale coordinates when no new fix arrives", async () => {
    const { result } = renderHook(() => useLiveTracking(options));
    await act(async () => { success(position()); });
    expect(result.current.truckCoords).toEqual([14, 121]);
    await act(async () => vi.advanceTimersByTime(125000));
    expect(result.current.truckCoords).toBeNull();
  });
});
it("geofence uses GPS distance to the street, including its middle", () => {
  const stop = { coords: [14, 121] as [number, number], coveragePath: [[14, 121], [14, 121.02]] as [number, number][] };
  expect(distanceToStopKm([14, 121.01], stop)).toBeCloseTo(0);
  expect(distanceToStopKm([14.01, 121.01], stop)).toBeGreaterThan(1);
});
