export const formatCollectionTime = (value?: string | null) => {
  if (!value) return "-";

  const timeMatch = String(value).match(/^(\d{2}):(\d{2})/);
  if (timeMatch) {
    const [, hours, minutes] = timeMatch;
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "-";
  return parsedDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export const formatCollectionDate = (value?: string | null) => {
  if (!value) return "-";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "-";
  return parsedDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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
