import { useEffect, useMemo, useState } from "react";
import { CalendarGrid } from "@/features/admin/schedule/CalendarGrid";
import { SelectedDayPanel } from "@/features/admin/schedule/SelectedDayPanel";
import { CalendarEvent, fetchCalendarEvents } from "@/services/scheduleService";

const toDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const CollectorSchedule = () => {
  const today = new Date();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState(() =>
    toDateString(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = toDateString(today.getFullYear(), today.getMonth(), today.getDate());

  useEffect(() => {
    fetchCalendarEvents({ event_type: "PRIVATE_EVENT", visibility: "PRIVATE" })
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  const scheduleColorById = useMemo(() => {
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0);
    const monthEnd = toDateString(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate());
    const visibleScheduleIds = [...new Set(
      events
        .filter((event) => {
          const start = event.event_date.split("T")[0];
          const end = event.end_date ? event.end_date.split("T")[0] : start;
          return start <= monthEnd && end >= monthStart;
        })
        .map((event) => event.id),
    )].sort();

    return new Map(
      visibleScheduleIds.map((id, index) => [
        id,
        `hsl(${Math.round((index * 360) / Math.max(visibleScheduleIds.length, 1))} 72% 52%)`,
      ]),
    );
  }, [events, month, year]);

  const selectedEvents = useMemo(
    () => events.filter((event) => {
      const start = event.event_date.split("T")[0];
      const end = event.end_date?.split("T")[0] || start;
      return start <= selectedDateStr && end >= selectedDateStr;
    }),
    [events, selectedDateStr],
  );

  const changeMonth = (amount: number) => {
    const nextDate = new Date(year, month + amount, 1);
    setCurrentDate(nextDate);
    setSelectedDateStr(toDateString(nextDate.getFullYear(), nextDate.getMonth(), 1));
  };
  const goToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8">
      <div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-foreground">Collection schedule</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Review official collection schedules and dispatch events.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <CalendarGrid
            className="lg:h-[620px]"
            fillHeight
            compactMobileCells
            currentDate={currentDate}
            selectedDateStr={selectedDateStr}
            events={events}
            scheduleColorById={scheduleColorById}
            onSelectDate={setSelectedDateStr}
            onPrevMonth={() => changeMonth(-1)}
            onNextMonth={() => changeMonth(1)}
            onGoToday={goToday}
            hideTodayButtonWhenOtherDateSelected
          />
        </div>

        <aside className="lg:col-span-1">
          <SelectedDayPanel
            className="min-h-[340px] max-h-[480px] lg:max-h-none lg:h-[620px]"
            selectedDateStr={selectedDateStr}
            events={selectedEvents}
            scheduleColorById={scheduleColorById}
          />
        </aside>
      </div>
    </div>
  );
};

export default CollectorSchedule;
