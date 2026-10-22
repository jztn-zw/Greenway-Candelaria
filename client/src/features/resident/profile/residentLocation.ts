import type { BarangayStreetRow } from "@/services/barangaysService";

import type { ResidentSetupLocation } from "@/types/residentLocation";
export type { ResidentSetupLocation } from "@/types/residentLocation";

export const validLocationPoint = (point: unknown): point is [number, number] => Array.isArray(point) && point.length === 2
  && point.every(Number.isFinite) && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180;

export const readResidentLocation = (value: unknown, barangayId: string, streetId: string): ResidentSetupLocation | null => {
  try {
    const pin = typeof value === "string" ? JSON.parse(value) : value;
    if (!pin || typeof pin !== "object" || !("barangayId" in pin) || pin.barangayId !== barangayId ||
      !("streetId" in pin) || pin.streetId !== streetId || !("latitude" in pin) || !("longitude" in pin) ||
      !validLocationPoint([pin.latitude, pin.longitude]) || !("method" in pin)) return null;
    const latitude = Number(pin.latitude), longitude = Number(pin.longitude);
    if (pin.method === "MANUAL_PIN") return { method: pin.method, latitude, longitude };
    if (pin.method === "STREET_POINT" && "pointIndex" in pin && Number.isInteger(pin.pointIndex) && Number(pin.pointIndex) >= 0 && Number(pin.pointIndex) < 100)
      return { method: pin.method, latitude, longitude, pointIndex: Number(pin.pointIndex) };
    if (pin.method === "CURRENT_LOCATION" && "accuracyMeters" in pin && typeof pin.accuracyMeters === "number" && Number.isFinite(pin.accuracyMeters)
      && pin.accuracyMeters >= 0 && pin.accuracyMeters <= 50 && "capturedAt" in pin && typeof pin.capturedAt === "string" && Number.isFinite(Date.parse(pin.capturedAt)))
      return { method: pin.method, latitude, longitude, accuracyMeters: pin.accuracyMeters, capturedAt: pin.capturedAt };
    return null;
  } catch { return null; }
};
export const locationPath = (value: unknown): [number, number][] => Array.isArray(value) && value.length >= 2 && value.length <= 500
  && value.every(validLocationPoint) && value.some(point => point[0] !== value[0][0] || point[1] !== value[0][1]) ? value : [];
export const streetLocationPoints = (street?: BarangayStreetRow): [number, number][] => {
  const points = locationPath(street?.location_points);
  return points.length <= 100 ? points : [];
};
export const streetLabel = (street: BarangayStreetRow) => street.area ? `${street.name} (${street.area})` : street.name;
export const streetDistanceMeters = (latitude: number, longitude: number, street: BarangayStreetRow): number => {
  const path = locationPath(street.coverage_path);
  const scaleX = 111320 * Math.cos(latitude * Math.PI / 180), scaleY = 110574;
  let nearest = Infinity;
  for (let index = 1; index < path.length; index++) {
    const [a, b] = [path[index - 1], path[index]];
    const x = (a[1] - longitude) * scaleX, y = (a[0] - latitude) * scaleY;
    const dx = (b[1] - a[1]) * scaleX, dy = (b[0] - a[0]) * scaleY;
    const t = dx * dx + dy * dy ? Math.max(0, Math.min(1, -(x * dx + y * dy) / (dx * dx + dy * dy))) : 0;
    nearest = Math.min(nearest, Math.hypot(x + t * dx, y + t * dy));
  }
  return nearest;
};
export const nearbyStreets = (value: ResidentSetupLocation, streets: BarangayStreetRow[]) => streets
  .map(street => ({ street, distance: streetDistanceMeters(value.latitude, value.longitude, street) }))
  .filter(candidate => candidate.distance <= 100).sort((a, b) => a.distance - b.distance);
export const locationMatchesStreet = (value: ResidentSetupLocation | null, street?: BarangayStreetRow): boolean => {
  if (!value || !street || !validLocationPoint([value.latitude, value.longitude]) || streetDistanceMeters(value.latitude, value.longitude, street) > 100) return false;
  if (value.method !== "STREET_POINT") return true;
  const point = streetLocationPoints(street)[value.pointIndex];
  return !!point && Math.abs(point[0] - value.latitude) <= 0.000001 && Math.abs(point[1] - value.longitude) <= 0.000001;
};
