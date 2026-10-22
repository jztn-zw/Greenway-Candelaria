import { expect, it } from "vitest";
import { locationMatchesStreet, nearbyStreets, streetLocationPoints, readResidentLocation, type ResidentSetupLocation } from "./residentLocation";
const street = { id: "ilaya", name: "Argao", area: "Ilaya", coverage_path: [[13.93, 121.42], [13.93, 121.43]] as [number, number][], location_points: [[13.93, 121.42], [13.93, 121.43]] as [number, number][] };
const pin: ResidentSetupLocation = { method: "MANUAL_PIN", latitude: 13.9301, longitude: 121.425 };
it("restores only address-matching saved pins and strips server association fields before resubmitting", () => {
  const stored = { ...pin, barangayId: "b", streetId: "s" };
  expect(readResidentLocation(JSON.stringify(stored), "b", "s")).toEqual(pin);
  expect(readResidentLocation(stored, "b", "other")).toBeNull();
  expect(readResidentLocation("{broken", "b", "s")).toBeNull();
  expect(readResidentLocation({ ...stored, latitude: 1000 }, "b", "s")).toBeNull();
});
it("matches the full street segment, not only the admin endpoint pins", () => {
  expect(locationMatchesStreet(pin, street)).toBe(true);
  expect(nearbyStreets(pin, [street])[0].distance).toBeCloseTo(11.0574);
});
it("keeps ambiguous Ilaya and Ibaba candidates distinct and rejects distant or missing paths", () => {
  const ibaba = { ...street, id: "ibaba", area: "Ibaba" };
  expect(nearbyStreets(pin, [street, ibaba]).map(row => row.street.id)).toEqual(["ilaya", "ibaba"]);
  expect(nearbyStreets({ ...pin, latitude: 14 }, [street])).toEqual([]);
  expect(locationMatchesStreet(pin, { ...street, coverage_path: null })).toBe(false);
});
it("exposes only saved controls and detects an outdated selected point", () => {
  expect(streetLocationPoints(street)).toHaveLength(2);
  expect(streetLocationPoints({ ...street, location_points: null })).toEqual([]);
  const selected: ResidentSetupLocation = { method: "STREET_POINT", latitude: 13.93, longitude: 121.42, pointIndex: 0 };
  expect(locationMatchesStreet(selected, street)).toBe(true);
  expect(locationMatchesStreet({ ...selected, pointIndex: 1 }, street)).toBe(false);
});
