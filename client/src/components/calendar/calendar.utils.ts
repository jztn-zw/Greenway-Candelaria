import type { CalendarEvent } from "@/services/scheduleService";
import { getManilaNow } from "@/utils/date";

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
