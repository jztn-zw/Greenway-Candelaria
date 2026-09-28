import { formatManilaDateTime, parseApiTimestamp } from "@/utils/date";

export const formatCollectionTime = (value?: string | null) => {
  if (!value) return "-";

  const timeMatch = String(value).match(/^(\d{2}):(\d{2})/);
  if (timeMatch) {
    const [, hours, minutes] = timeMatch;
    const hour = Number(hours);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return "-";
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${minutes} ${suffix}`;
  }

  return formatManilaDateTime(value, { hour: "numeric", minute: "2-digit" }, "-");
};

export const formatCollectionDate = (value?: string | null) => {
  if (!value) return "-";
  const parsedDate = parseApiTimestamp(value);
  if (!parsedDate) return "-";
  return formatManilaDateTime(parsedDate, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }, "-");
};

export const calculateDistanceInKilometers = (
  firstCoordinate: [number, number],
  secondCoordinate: [number, number],
) => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const [firstLatitude, firstLongitude] = firstCoordinate;
  const [secondLatitude, secondLongitude] = secondCoordinate;
  const latitudeDifference = toRadians(secondLatitude - firstLatitude);
  const longitudeDifference = toRadians(secondLongitude - firstLongitude);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(firstLatitude)) *
      Math.cos(toRadians(secondLatitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return 6371 * (2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
};

export const normaliseId = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

export const parseCoordinate = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsedValue = Number(value.trim());
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }
  return null;
};
