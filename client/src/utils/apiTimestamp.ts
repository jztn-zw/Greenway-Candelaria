/** Parses stored API instants as UTC, including MySQL DATETIME without Z. */
export const parseApiTimestamp = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const normalized = value.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : /^\d{4}-\d{2}-\d{2}/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};
