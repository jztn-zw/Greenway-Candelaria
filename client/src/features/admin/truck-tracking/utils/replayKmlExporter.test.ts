import { afterEach, expect, it, vi } from "vitest";
import { buildReplayKml, exportReplayKml, buildReplayGpx, exportReplayGpx } from "./replayKmlExporter";
import type { ReplayTrip } from "./replayTrip";

const options = () => ({ truckName: 'Truck <1> & "two"', plateNumber: "ABC-123", dateStr: "2026-10-21", trip: {
  path: [[14, 121], [14.001, 121.001], [14.002, 121.002]],
  timestamps: [], times: [Date.UTC(2026, 9, 21), Date.UTC(2026, 9, 21, 0, 0, 10), Date.UTC(2026, 9, 21, 0, 1)],
  breakBefore: [false, false, true], distanceKm: 1,
  stops: [{ id: "s", targetName: "A & B", status: "DONE", order: 1, startedAt: null, endedAt: null, location: { name: "A & B", coords: [14, 121] } }],
} as ReplayTrip });
const parse = (value: string) => new DOMParser().parseFromString(value, "application/xml");
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it("exports valid XML with original UTC times, longitude first, and escaped labels", () => {
  const doc = parse(buildReplayKml(options()));
  expect(doc.querySelector("parsererror")).toBeNull();
  expect(doc.querySelector("Document > name")?.textContent).toBe('Truck <1> & "two" — 2026-10-21');
  expect([...doc.getElementsByTagName("when")].map(node => node.textContent)).toEqual(options().trip.times.map(time => new Date(time).toISOString()));
  expect(doc.getElementsByTagNameNS("http://www.google.com/kml/ext/2.2", "coord")[0].textContent).toBe("121 14 0");
  expect(doc.querySelector("Folder name")?.textContent).toBe("Target Streets");
  expect(doc.querySelector("Folder Placemark name")?.textContent).toBe("A & B");
});

it("splits both the timed and static trail across missing GPS data", () => {
  const doc = parse(buildReplayKml(options()));
  expect(doc.getElementsByTagNameNS("http://www.google.com/kml/ext/2.2", "Track")).toHaveLength(2);
  expect(doc.getElementsByTagNameNS("http://www.google.com/kml/ext/2.2", "interpolate")[0].textContent).toBe("0");
  expect(doc.querySelectorAll("MultiGeometry LineString")).toHaveLength(1);
  expect(doc.querySelectorAll("MultiGeometry Point")).toHaveLength(1);
  expect(doc.querySelector("LineString coordinates")?.textContent).toBe("121,14,0 121.001,14.001,0");
});

it("allows a single fix and rejects invalid coordinates or missing timestamps", () => {
  const value = options();
  value.trip.path = [[14, 121]]; value.trip.times = [0];
  expect(parse(buildReplayKml(value)).querySelector("Point")).not.toBeNull();
  value.trip.times = [];
  expect(() => buildReplayKml(value)).toThrow("Valid GPS");
  value.trip.times = [0]; value.trip.path = [[91, 121]];
  expect(() => buildReplayKml(value)).toThrow("Valid GPS");
});

it("downloads a KML blob and releases its temporary URL", async () => {
  vi.useFakeTimers();
  const create = vi.fn((_blob: Blob) => "blob:fixture"), revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toMatch(/_2026-10-21_Route_Replay\.kml$/);
    expect(this.isConnected).toBe(true);
  });
  await exportReplayKml(options());
  expect(click).toHaveBeenCalledOnce();
  expect(create.mock.calls[0][0].type).toBe("application/vnd.google-earth.kml+xml;charset=utf-8");
  expect(document.querySelector('a[download]')).toBeNull();
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledWith("blob:fixture");
  const controller = new AbortController(); controller.abort();
  await expect(exportReplayKml({ ...options(), signal: controller.signal })).rejects.toThrow();
  expect(click).toHaveBeenCalledOnce();
});

it("writes GPX 1.1 timestamped track segments and named target waypoints", () => {
  const doc = parse(buildReplayGpx(options()));
  expect(doc.querySelector("parsererror")).toBeNull();
  expect(doc.documentElement.namespaceURI).toBe("http://www.topografix.com/GPX/1/1");
  expect(doc.documentElement.getAttribute("version")).toBe("1.1");
  expect(doc.querySelectorAll("trkseg")).toHaveLength(2);
  expect(doc.querySelectorAll("trkpt")).toHaveLength(3);
  expect(doc.querySelector("trkpt")?.getAttribute("lat")).toBe("14");
  expect(doc.querySelector("trkpt")?.getAttribute("lon")).toBe("121");
  expect([...doc.querySelectorAll("trkpt time")].map(node => node.textContent)).toEqual(options().trip.times.map(time => new Date(time).toISOString()));
  expect(doc.querySelector("wpt name")?.textContent).toBe("A & B");
  expect(doc.querySelector("rte")).toBeNull();
});
it("downloads GPX with the correct extension and MIME type", async () => {
  vi.useFakeTimers();
  const create = vi.fn((_blob: Blob) => "blob:gpx"), revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: revoke });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toMatch(/Route_Replay\.gpx$/);
  });
  await exportReplayGpx(options());
  expect(create.mock.calls[0][0].type).toBe("application/gpx+xml;charset=utf-8");
  vi.runAllTimers(); expect(revoke).toHaveBeenCalledWith("blob:gpx");
});
