import { getServerNow,getSystemDate } from "@/lib/serverClock";
import { parseApiTimestamp } from "./apiTimestamp";
export { parseApiTimestamp } from "./apiTimestamp";

export interface RelativeTimeOptions {
  emptyLabel?: string;
  dateOptions?: Intl.DateTimeFormatOptions;
  now?: number | null;
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

/** Formats an API timestamp using GreenWay's existing compact relative-time labels. */
export const formatRelativeTime = (
  value: string | null | undefined,
  {
    emptyLabel = "",
    dateOptions = { month: "short", day: "numeric" },
    now = getServerNow(),
  }: RelativeTimeOptions = {},
): string => {
  if (!value) return emptyLabel || "";

  const date = parseApiTimestamp(value);
  if (!date) return value;

  // Without a trusted clock, show the actual Philippine date/time instead of
  // inventing a relative age from a potentially incorrect device clock.
  if (now === null) return formatManilaDateTime(date, {
    ...dateOptions, year: "numeric", hour: "numeric", minute: "2-digit",
  });
  const differenceInSeconds = Math.floor((now - date.getTime()) / 1000);
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
export const getManilaNow = (value: Date = getSystemDate()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  const weekday = part("weekday");

  return {
    year: Number(part("year")),
    month: Number(part("month")),
    day: Number(part("day")),
    hour: Number(part("hour")),
    minute: Number(part("minute")),
    second: Number(part("second")),
    weekday,
    weekdayIndex: Math.max(0, MANILA_WEEKDAYS.indexOf(weekday as (typeof MANILA_WEEKDAYS)[number])),
    dateKey: `${part("year")}-${part("month")}-${part("day")}`,
  };
};

/** A date-picker carrier of Philippine calendar fields, not a stored instant. */
export const toManilaCalendarDate = (value: string | Date = getSystemDate()) => {
  const instant = parseApiTimestamp(value);
  if (!instant) return new Date(NaN);
  const fields = getManilaNow(instant);
  return new Date(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute, fields.second);
};

/** Converts picker fields in Philippine time to a UTC instant for saving. */
export const fromManilaCalendarDate = (value: Date) => new Date(Date.UTC(
  value.getFullYear(), value.getMonth(), value.getDate(), value.getHours() - 8, value.getMinutes(), value.getSeconds(), value.getMilliseconds(),
));

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
