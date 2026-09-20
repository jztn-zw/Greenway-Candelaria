export const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsedValue = Number(value.trim());
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }
  return null;
};
