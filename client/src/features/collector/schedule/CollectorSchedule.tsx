import { useCollectorQuery } from "@/lib/collectorQuery";
import { useEffect, useMemo, useState } from "react";
import { CollectorScheduleSkeleton } from "@/components/PageLoadingSkeletons";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { SelectedDayPanel } from "@/components/calendar/SelectedDayPanel";
import { calendarDateKey, eventOccursOnDate, getEventColors, getManilaCalendarDate } from "@/components/calendar/calendar.utils";
import { fetchCalendarEvents } from "@/services/scheduleService";

const EMPTY_EVENTS: Awaited<ReturnType<typeof fetchCalendarEvents>> = [];

const CollectorSchedule = () => {
  const [currentDate, setCurrentDate] = useState(getManilaCalendarDate);
  const [selectedDateStr, setSelectedDateStr] = useState(() => calendarDateKey(getManilaCalendarDate()));
  const monthKey = calendarDateKey(currentDate).slice(0, 7);
  const schedule = useCollectorQuery("schedule", [monthKey], () => fetchCalendarEvents({ view: "collector", month: monthKey, event_type: "PRIVATE_EVENT", visibility: "PRIVATE" }));
  const isLoading = schedule.isLoading;
  const [hasSettledInitialLoad, setHasSettledInitialLoad] = useState(false);
  useEffect(() => {
    if (schedule.isFetched) setHasSettledInitialLoad(true);
  }, [schedule.isFetched]);
  const error = schedule.error && !schedule.data ? "Schedule unavailable. Please try opening this page again later." : null;
  const events = schedule.data ?? EMPTY_EVENTS;

  const scheduleColorById = useMemo(() => getEventColors(events), [events]);
  const selectedEvents = useMemo(() => events.filter((event) => eventOccursOnDate(event, selectedDateStr)), [events, selectedDateStr]);
  const changeMonth = (amount: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + amount, 1);
    setCurrentDate(nextDate);
    setSelectedDateStr(calendarDateKey(nextDate));
  };
  const goToday = () => {
    const today = getManilaCalendarDate();
    setCurrentDate(today);
    setSelectedDateStr(calendarDateKey(today));
  };

  if (isLoading && !hasSettledInitialLoad) return <CollectorScheduleSkeleton currentDate={currentDate} />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8">
      <div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-foreground">Internal schedule</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">View internal events added by admin. Route assignments are shown separately in your route map.</p>
        </div>
      </div>

      {schedule.error && schedule.data && <p role="alert" className="text-sm text-destructive">Schedule could not be refreshed. Showing last known events.</p>}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <CalendarGrid
            isLoading={isLoading}
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
          />
        </div>

        <aside className="lg:col-span-1">
          <SelectedDayPanel
            isLoading={isLoading}
            error={error}
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
