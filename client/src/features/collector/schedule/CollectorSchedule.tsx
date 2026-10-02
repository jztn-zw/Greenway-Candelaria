import { useCollectorQuery } from "@/lib/collectorQuery";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
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
  if (schedule.error && schedule.data === undefined) return <PageErrorState kind="unavailable" description="We couldn't load this month's schedule. Please try again." onRetry={() => void schedule.refetch()} retrying={schedule.isFetching} homeHref="/collector" />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8">
      <div>
        <div className="min-w-0">
          <h1 className="gw-page-title sm:text-ui-page-lg tracking-tight text-foreground">Internal schedule</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">View internal events added by admin. Route assignments are shown separately in your route map.</p>
        </div>
      </div>

      {schedule.error && <DataRefreshNotice message="Couldn't refresh the schedule. Showing the last loaded events, which may be outdated." onRetry={() => void schedule.refetch()} retrying={schedule.isFetching} />}
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
