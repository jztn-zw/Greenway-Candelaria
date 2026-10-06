import { useSystemTime } from "@/hooks/useSystemTime";
import { CalendarDays } from "lucide-react";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { adminScheduleStyles as scheduleStyles } from "@/components/common/communityContentStyles";
import { useCollectorQuery } from "@/lib/collectorQuery";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { useEffect,useMemo,useState } from "react";
import { CollectorScheduleSkeleton } from "@/components/loading/PageLoadingSkeletons";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { SelectedDayPanel } from "@/components/calendar/SelectedDayPanel";
import { calendarDateKey,eventOccursOnDate,getEventColors,getManilaCalendarDate } from "@/components/calendar/calendar.utils";
import { fetchCalendarEvents } from "@/services/scheduleService";

const EMPTY_EVENTS: Awaited<ReturnType<typeof fetchCalendarEvents>> = [];

const CollectorSchedule = () => {
  useSystemTime();
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
    <div className={scheduleStyles.page}>
      <ResidentPageHeader
        className="admin-module-header"
        title="MENRO Calendar"
        description="View MENRO events scheduled for this month."
      />

      {schedule.error && <DataRefreshNotice message="Couldn't refresh the schedule. Showing the last loaded events, which may be outdated." onRetry={() => void schedule.refetch()} retrying={schedule.isFetching} />}
      <section className={scheduleStyles.workspace} aria-labelledby="collector-calendar-title">
        <div className={scheduleStyles.workspaceHeader}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="collector-calendar-title" className="gw-heading text-sm text-foreground">Monthly events</h2>
              <p className="mt-0.5 text-ui-caption text-muted-foreground">Select a date to view its activities.</p>
            </div>
          </div>
        </div>
        <div className={`${scheduleStyles.layout} p-3 sm:p-5`}>
          <div className="min-w-0">
            <CalendarGrid
              isLoading={isLoading}
              className={scheduleStyles.calendar}
              headingLabel={currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
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
  
          <aside className="min-w-0">
            <SelectedDayPanel
              isLoading={isLoading}
              className={scheduleStyles.dayPanel}
              variant="admin"
              selectedDateStr={selectedDateStr}
              events={selectedEvents}
              scheduleColorById={scheduleColorById}
            />
          </aside>
        </div>
      </section>
    </div>
  );
};

export default CollectorSchedule;
