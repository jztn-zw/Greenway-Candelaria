export interface RelativeTimeOptions {
  emptyLabel?: string;
  dateOptions?: Intl.DateTimeFormatOptions;
}

export const MANILA_TIME_ZONE = "Asia/Manila";

const MANILA_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Parses API timestamps as UTC. MySQL returns UTC DATETIME values without Z. */
export const parseApiTimestamp = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const normalizedValue = value.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : /^\d{4}-\d{2}-\d{2}/.test(value)
      ? `${value.replace(" ", "T")}Z`
      : value;
  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Formats an API timestamp using GreenWay's existing compact relative-time labels. */
export const formatRelativeTime = (
  value: string | null | undefined,
  {
    emptyLabel = "",
    dateOptions = { month: "short", day: "numeric" },
  }: RelativeTimeOptions = {},
): string => {
  if (!value) return emptyLabel || "";

  const date = parseApiTimestamp(value);
  if (!date) return value;

  const differenceInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (differenceInSeconds < 60) return "Just now";
  if (differenceInSeconds < 3600) return `${Math.floor(differenceInSeconds / 60)}m ago`;
  if (differenceInSeconds < 86400) return `${Math.floor(differenceInSeconds / 3600)}h ago`;
  if (differenceInSeconds < 604800) return `${Math.floor(differenceInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { ...dateOptions, timeZone: MANILA_TIME_ZONE });
};

/** Formats an instant using the application's canonical Philippine timezone. */
export const formatManilaDateTime = (
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
  emptyLabel = "",
): string => {
  const date = parseApiTimestamp(value);
  if (!date) return emptyLabel;

  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: MANILA_TIME_ZONE,
  }).format(date);
};

/** Returns the current Manila calendar fields without depending on the device timezone. */
export const getManilaNow = (value: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  const weekday = part("weekday");

  return {
    year: Number(part("year")),
    month: Number(part("month")),
    day: Number(part("day")),
    hour: Number(part("hour")),
    weekday,
    weekdayIndex: Math.max(0, MANILA_WEEKDAYS.indexOf(weekday as (typeof MANILA_WEEKDAYS)[number])),
    dateKey: `${part("year")}-${part("month")}-${part("day")}`,
  };
};

/** Formats a YYYY-MM-DD calendar value without shifting it across timezones. */
export const formatDateOnly = (
  value: string,
  options: Intl.DateTimeFormatOptions,
  emptyLabel = "",
): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return emptyLabel;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
};
