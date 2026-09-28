import { describe, expect, it } from "vitest";
import type { HistoryRow, RouteStopHistoryItem } from "@/services/trackingService";
import { buildReplayTrip, formatReplayDuration, formatReplayTime, getReplayCompletedTargetLocations, getReplayCompletionElapsed, getReplayGaps, getReplaySkippedTargetLocations, getReplayTargetLocation, getReplayTargetProgress, sampleReplayTrip } from "./replayTrip";

const log = (latitude: unknown, longitude: unknown, created_at: string) => ({ latitude, longitude, created_at }) as HistoryRow;

describe("full-trip GPS replay", () => {
  it("keeps all valid points in time order, including stationary records", () => {
    const trip = buildReplayTrip([
      log(14.04, 121.43, "2026-09-28T01:02:00Z"),
      log(14.03, 121.42, "2026-09-28T01:00:00Z"),
      log(14.03, 121.42, "2026-09-28T01:01:00Z"),
    ])!;
    expect(trip.path).toEqual([[14.03, 121.42], [14.03, 121.42], [14.04, 121.43]]);
    expect(trip.timestamps).toEqual(["2026-09-28T01:00:00Z", "2026-09-28T01:01:00Z", "2026-09-28T01:02:00Z"]);
  });

  it("rejects missing coordinates, invalid ranges, and invalid timestamps", () => {
    expect(buildReplayTrip([
      log(null, 121, "2026-09-28T01:00:00Z"), log("", 121, "2026-09-28T01:00:00Z"),
      log(91, 121, "2026-09-28T01:00:00Z"), log(14, 181, "2026-09-28T01:00:00Z"),
      log(14, 121, "invalid"), log(Infinity, 121, "2026-09-28T01:00:00Z"),
    ])).toBeNull();
    expect(buildReplayTrip([log("14.03", "121.42", "2026-09-28T01:00:00Z")])?.path).toEqual([[14.03, 121.42]]);
  });

  it("calculates distance before display rounding and excludes small stationary jitter", () => {
    const trip = buildReplayTrip([
      log(14, 121, "2026-09-28T01:00:00Z"),
      log(14.00001, 121, "2026-09-28T01:01:00Z"),
      log(14, 121, "2026-09-28T01:02:00Z"),
      log(14.001, 121, "2026-09-28T01:03:00Z"),
    ])!;
    expect(trip.distanceKm).toBeCloseTo(0.111195, 5);
    expect(buildReplayTrip([log(14, 121, "2026-09-28T01:00:00Z")])?.distanceKm).toBe(0);
  });

  it("samples the full trail for video and reaches the actual last record", () => {
    const trip = buildReplayTrip([
      log(14, 121, "2026-09-28T01:00:00Z"), log(15, 122, "2026-09-28T01:01:00Z"),
      log(16, 123, "2026-09-28T01:02:00Z"),
    ])!;
    expect(sampleReplayTrip(trip, 0.25).coords).toEqual([14.5, 121.5]);
    expect(sampleReplayTrip(trip, 0.5).coords).toEqual([15, 122]);
    expect(sampleReplayTrip(trip, 1)).toEqual({ index: 2, position: 2, coords: [16, 123], timestamp: "2026-09-28T01:02:00.000Z" });
    expect(formatReplayTime("2026-09-28T01:00:00Z")).toBe("09:00 AM");
  });

  it("tracks individual street targets and their recorded completion times", () => {
    const stops = [
      { route_id: "run", barangay_id: "pob", barangay_name: "Poblacion", stop_name: "Street B", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z" },
      { route_id: "run", barangay_id: "pob", barangay_name: "Poblacion", stop_name: "Street A", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z" },
      { route_id: "run", barangay_id: "mal", barangay_name: "Malabanan", stop_name: "Street C", stop_order: 3, stop_status: "DONE", completed_at: "2026-09-28T01:03:00Z" },
    ] as RouteStopHistoryItem[];
    const trip = buildReplayTrip([0, 1, 2, 3].map((minute) => log(14, 121, "2026-09-28T01:0" + minute + ":00Z")), stops)!;
    expect(getReplayTargetProgress(trip, 0)).toEqual({ currentTarget: "Street A (Poblacion)", targetUnknown: false, completed: [] });
    expect(getReplayTargetProgress(trip, 1)).toEqual({ currentTarget: "Street B (Poblacion)", targetUnknown: false, completed: ["Street A (Poblacion)"] });
    expect(getReplayTargetProgress(trip, 2)).toEqual({ currentTarget: "Street C (Malabanan)", targetUnknown: false, completed: ["Street A (Poblacion)", "Street B (Poblacion)"] });
    expect(getReplayTargetProgress(trip, 3)).toEqual({ currentTarget: null, targetUnknown: false, completed: ["Street A (Poblacion)", "Street B (Poblacion)", "Street C (Malabanan)"] });
    expect(getReplayTargetProgress(trip, 0).completed).toEqual([]);
  });

  it("does not mark skipped or undated streets as completed", () => {
    const stops = [
      { route_id: "run", barangay_id: "pob", barangay_name: "Poblacion", stop_name: "Street A", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z" },
      { route_id: "run", barangay_id: "pob", barangay_name: "Poblacion", stop_name: "Street B", stop_order: 2, stop_status: "MISSED", completed_at: "2026-09-28T01:02:00Z" },
      { route_id: "run", barangay_id: "mal", barangay_name: "Malabanan", stop_order: 3, stop_status: "DONE", completed_at: null },
    ] as RouteStopHistoryItem[];
    const trip = buildReplayTrip([log(14, 121, "2026-09-28T01:03:00Z")], stops)!;
    expect(getReplayTargetProgress(trip, 0)).toEqual({ currentTarget: null, targetUnknown: true, completed: ["Street A (Poblacion)"] });
    expect(getReplayTargetProgress(buildReplayTrip([log(14, 121, "2026-09-28T01:03:00Z")])!, 0).targetUnknown).toBe(true);
  });

  it("parses UTC database timestamps consistently with ISO offsets and Philippine time", () => {
    const trip = buildReplayTrip([
      log(14, 121, "2026-09-28 01:00:00"),
      log(14, 121, "2026-09-28T09:00:02+08:00"),
      log(14, 121, "2026-09-28T01:00:10Z"),
    ], [
      { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28 01:00:05" },
    ] as RouteStopHistoryItem[])!;
    expect(trip.times).toEqual([Date.parse("2026-09-28T01:00:00Z"), Date.parse("2026-09-28T01:00:02Z"), Date.parse("2026-09-28T01:00:10Z")]);
    expect(formatReplayTime("2026-09-28 01:00:00")).toBe(formatReplayTime("2026-09-28T09:00:00+08:00"));
    expect(formatReplayTime("2026-09-28 01:00:00")).toBe("09:00 AM");
    expect(formatReplayTime("invalid")).toBe("—");
    const halfway = sampleReplayTrip(trip, 0.5);
    expect(halfway.index).toBe(1);
    expect(halfway.position).toBeCloseTo(1.375);
    expect(halfway.timestamp).toBe("2026-09-28T01:00:05.000Z");
    expect(getReplayTargetProgress(trip, halfway.index, Date.parse(halfway.timestamp)).completed).toEqual(["Argao Street (Poblacion)"]);
    expect(getReplayTargetProgress(trip, halfway.index).completed).toEqual([]);
  });

  it("handles simultaneous GPS records without adding imaginary playback time", () => {
    const trip = buildReplayTrip([
      log(14, 121, "2026-09-28 01:00:00"), log(14.001, 121, "2026-09-28 01:00:00"),
      log(14.003, 121, "2026-09-28 01:00:02"),
    ])!;
    expect(sampleReplayTrip(trip, 0).position).toBe(1);
    expect(sampleReplayTrip(trip, 0.5).coords[0]).toBeCloseTo(14.002, 10);
    expect(sampleReplayTrip(trip, 0.5).coords[1]).toBe(121);
    expect(sampleReplayTrip(trip, 0.5).timestamp).toBe("2026-09-28T01:00:01.000Z");
  });

  it("formats trip duration compactly and flags only gaps longer than a minute", () => {
    expect(formatReplayDuration(0)).toBe("0 min");
    expect(formatReplayDuration(30000)).toBe("< 1 min");
    expect(formatReplayDuration(180000)).toBe("3 min");
    expect(formatReplayDuration(3600000)).toBe("1 h");
    expect(formatReplayDuration(3900000)).toBe("1 h 5 min");
    const trip = buildReplayTrip([
      log(14, 121, "2026-09-28T01:00:00Z"),
      log(14, 121, "2026-09-28T01:01:00Z"),
      log(14, 121, "2026-09-28T01:02:01Z"),
    ])!;
    expect(getReplayGaps(trip)).toEqual([{ start: trip.times[1], end: trip.times[2], durationMs: 61000 }]);
    expect(getReplayGaps(buildReplayTrip([log(14, 121, "2026-09-28T01:00:00Z")])!)).toEqual([]);
  });

  it("seeks to the latest recorded street completion without clamping unknown or out-of-range events", () => {
    const stops = [
      { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z" },
      { route_id: "later-run", barangay_name: "Poblacion", stop_name: "Argao Street", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z" },
      { route_id: "run", barangay_name: "Poblacion", stop_name: "Before GPS", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T00:59:00Z" },
      { route_id: "run", barangay_name: "Poblacion", stop_name: "Skipped Street", stop_order: 3, stop_status: "MISSED", completed_at: "2026-09-28T01:01:00Z" },
    ] as RouteStopHistoryItem[];
    const trip = buildReplayTrip([
      log(14, 121, "2026-09-28T01:00:00Z"), log(14, 121, "2026-09-28T01:03:00Z"),
    ], stops)!;
    expect(getReplayCompletionElapsed(trip, "Argao Street (Poblacion)", trip.times[0] + 90000)).toBe(60000);
    expect(getReplayCompletionElapsed(trip, "Argao Street (Poblacion)", trip.times[1])).toBe(120000);
    expect(getReplayCompletionElapsed(trip, "Argao Street (Poblacion)", trip.times[0])).toBeNull();
    expect(getReplayCompletionElapsed(trip, "Before GPS (Poblacion)", trip.times[1])).toBeNull();
    expect(getReplayCompletionElapsed(trip, "Skipped Street (Poblacion)", trip.times[1])).toBeNull();
  });

  it("uses saved street geometry and keeps the target map location aligned with replay time", () => {
    const stops = [
      { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", street_id: "street-a", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z", coverage_path: '[["14.04","121.42"],[14.05,121.43]]', latitude: 14.1, longitude: 121.5 },
      { route_id: "run", barangay_name: "Poblacion", stop_name: "Another Street", street_id: "street-b", stop_order: 2, stop_status: "DONE", completed_at: "2026-09-28T01:02:00Z", coverage_path: [[14.06, 121.44], [14.07, 121.45]], latitude: 14.1, longitude: 121.5 },
    ] as RouteStopHistoryItem[];
    const trip = buildReplayTrip([0, 1, 2].map((minute) => log(14, 121, "2026-09-28T01:0" + minute + ":00Z")), stops)!;
    expect(getReplayTargetLocation(trip, 0)).toEqual({ name: "Argao Street (Poblacion)", coords: [14.04, 121.42] });
    expect(getReplayTargetLocation(trip, 1)).toEqual({ name: "Another Street (Poblacion)", coords: [14.06, 121.44] });
    expect(getReplayTargetLocation(trip, 2)).toBeNull();
    expect(getReplayTargetLocation(trip, 0)?.coords).not.toEqual([14.1, 121.5]);
  });

  it("does not substitute barangay centers or invalid geometry for street locations", () => {
    const history = [log(14, 121, "2026-09-28T01:00:00Z")];
    const stop = { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", street_id: "street-a", stop_order: 1, stop_status: "IN_PROGRESS", latitude: 14.1, longitude: 121.5 } as RouteStopHistoryItem;
    expect(getReplayTargetLocation(buildReplayTrip(history, [stop])!, 0)).toBeNull();
    expect(getReplayTargetLocation(buildReplayTrip(history, [{ ...stop, coverage_path: "invalid JSON" }])!, 0)).toBeNull();
    expect(getReplayTargetLocation(buildReplayTrip(history, [{ ...stop, coverage_path: [[91, 121], [14, 181]] }])!, 0)).toBeNull();
    expect(getReplayTargetLocation(buildReplayTrip(history, [{ ...stop, coverage_path: [[14.04, 121.42]], stop_status: "DONE", completed_at: null }])!, 0)).toBeNull();
    const barangay = buildReplayTrip(history, [{ ...stop, street_id: null, stop_name: "Poblacion" }])!;
    expect(getReplayTargetLocation(barangay, 0)).toEqual({ name: "Poblacion", coords: [14.1, 121.5] });
  });

  it("retains only confirmed completed street locations at the replay time, including distinct same-named targets", () => {
    const base = { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", street_id: "street-a", stop_order: 1, stop_status: "DONE", completed_at: "2026-09-28T01:01:00Z", coverage_path: [[14.04, 121.42]] } as RouteStopHistoryItem;
    const trip = buildReplayTrip([0, 1, 2, 3].map((minute) => log(14, 121, "2026-09-28T01:0" + minute + ":00Z")), [
      base,
      { ...base, route_id: "later", street_id: "street-b", completed_at: "2026-09-28T01:02:00Z", coverage_path: [[14.06, 121.44]] },
      { ...base, stop_order: 2, stop_status: "MISSED" },
      { ...base, stop_order: 3, stop_status: "SKIPPED" },
      { ...base, stop_order: 4, completed_at: null },
      { ...base, stop_order: 5, coverage_path: null, latitude: 14.1, longitude: 121.5 },
    ])!;
    const first = { name: "Argao Street (Poblacion)", coords: [14.04, 121.42] };
    const second = { name: "Argao Street (Poblacion)", coords: [14.06, 121.44] };
    expect(getReplayCompletedTargetLocations(trip, 0)).toEqual([]);
    expect(getReplayCompletedTargetLocations(trip, 1)).toEqual([first]);
    expect(getReplayCompletedTargetLocations(trip, 2)).toEqual([first, second]);
    expect(getReplayCompletedTargetLocations(trip, 3)).toEqual([first, second]);
    expect(getReplayCompletedTargetLocations(trip, 0, trip.times[0] + 59999)).toEqual([]);
    expect(getReplayCompletedTargetLocations(trip, 0, trip.times[0] + 60000)).toEqual([first]);
    expect(getReplayCompletedTargetLocations(trip, 1)[0]).toBe(getReplayTargetLocation(trip, 0));
  });

  it("shows skipped street pins at their recorded times without treating them as completed or guessing coordinates", () => {
    const base = { route_id: "run", barangay_name: "Poblacion", stop_name: "Argao Street", street_id: "street-a", stop_order: 1, stop_status: "MISSED", completed_at: "2026-09-28T01:01:00Z", skipped_reason: "Blocked road", coverage_path: [[14.04, 121.42]] } as RouteStopHistoryItem;
    const trip = buildReplayTrip([0, 1, 2, 3].map((minute) => log(14, 121, "2026-09-28T01:0" + minute + ":00Z")), [
      base,
      { ...base, stop_order: 2, stop_status: "SKIPPED", completed_at: "2026-09-28T01:02:00Z", stop_name: "Second Street", street_id: "street-b", coverage_path: [[14.06, 121.44]], skipped_reason: null },
      { ...base, stop_order: 3, stop_name: "No Geometry", coverage_path: null },
      { ...base, stop_order: 4, stop_name: "No Time", completed_at: null },
      { ...base, stop_order: 5, stop_name: "Completed", stop_status: "DONE" },
    ])!;
    const first = { name: "Argao Street (Poblacion)", coords: [14.04, 121.42], skippedReason: "Blocked road" };
    const second = { name: "Second Street (Poblacion)", coords: [14.06, 121.44] };
    expect(getReplaySkippedTargetLocations(trip, 0)).toEqual([]);
    expect(getReplaySkippedTargetLocations(trip, 1)).toEqual([first]);
    expect(getReplaySkippedTargetLocations(trip, 2)).toEqual([first, second]);
    expect(getReplaySkippedTargetLocations(trip, 3)).toEqual([first, second]);
    expect(getReplayCompletedTargetLocations(trip, 3)).toEqual([{ name: "Completed (Poblacion)", coords: [14.04, 121.42] }]);
    expect(getReplaySkippedTargetLocations(trip, 0, trip.times[0] + 59999)).toEqual([]);
  });
});
