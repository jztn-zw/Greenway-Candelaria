import type { CalendarEvent } from "@/services/scheduleService";
import { getManilaNow } from "@/utils/date";
import { cn } from "@/lib/utils";

export type CalendarLayoutOptions = {
  compact?: boolean;
  embedded?: boolean;
  fillHeight?: boolean;
  compactMobileCells?: boolean;
};

/** Loaded days and their placeholders must keep identical responsive geometry. */
export const getCalendarLayout = ({ compact, embedded, fillHeight, compactMobileCells }: CalendarLayoutOptions) => {
  const height = fillHeight
    ? compactMobileCells ? "aspect-square min-h-0 sm:aspect-auto sm:min-h-0 sm:h-full" : "min-h-0 sm:h-full"
    : compact
      ? compactMobileCells ? "aspect-square min-h-0 sm:aspect-auto sm:min-h-[52px]" : "min-h-[52px]"
      : compactMobileCells ? "aspect-square min-h-0 sm:aspect-auto sm:min-h-[95px]"
        : embedded ? "min-h-0" : "min-h-[75px] sm:min-h-[95px]";
  const padding = fillHeight
    ? compactMobileCells ? "p-1 sm:p-2" : "p-1.5 sm:p-2"
    : compact
      ? compactMobileCells ? "p-1 sm:px-1 sm:py-1.5" : "px-1 py-1.5 sm:p-2"
      : compactMobileCells ? "p-1 sm:p-2" : embedded ? "p-1.5" : "p-1.5 sm:p-2";
  return {
    grid: cn("calendar-grid-cells grid grid-cols-7", compact ? "gap-1" : "gap-1 sm:gap-1.5",
      fillHeight && "min-h-0 sm:flex-1 sm:auto-rows-fr", embedded && !compact && "min-h-0 flex-1 auto-rows-fr", compactMobileCells && "min-h-0"),
    day: cn("calendar-grid-day", height, padding),
    emptyDay: cn("calendar-grid-day", height),
  };
};

export const calendarDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Calendar widgets use local Date fields; construct those fields from Manila's date. */
export const getManilaCalendarDate = () => {
  const { year, month, day } = getManilaNow();
  return new Date(year, month - 1, day);
};

export const eventOccursOnDate = (event: CalendarEvent, date: string) => {
  const start = event.event_date.split("T")[0];
  const end = event.end_date?.split("T")[0] || start;
  return start <= date && date <= end;
};

/** Stable across months, filters, and other events being added or removed. */
export const getEventColor = (id: string) => {
  let hash = 0;
  for (const char of id) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return `hsl(var(--chart-${(hash % 6) + 1}))`;
};

export const getEventColors = (events: CalendarEvent[]) =>
  new Map(events.map((event) => [event.id, getEventColor(event.id)]));

/** Index only this month's days, including events spanning month/year boundaries. */
export const indexMonthEvents = (events: CalendarEvent[], year: number, month: number) => {
  const days = new Map<string, CalendarEvent[]>();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthStart = calendarDateKey(new Date(year, month, 1));
  const monthEnd = calendarDateKey(new Date(year, month, lastDay));
  for (const event of events) {
    const start = event.event_date.split("T")[0];
    const end = event.end_date?.split("T")[0] || start;
    if (start > monthEnd || end < monthStart || end < start) continue;
    const first = start < monthStart ? 1 : Number(start.slice(8, 10));
    const last = end > monthEnd ? lastDay : Number(end.slice(8, 10));
    for (let day = first; day <= last; day++) {
      const key = calendarDateKey(new Date(year, month, day));
      const entries = days.get(key) ?? [];
      entries.push(event);
      days.set(key, entries);
    }
  }
  return days;
};
