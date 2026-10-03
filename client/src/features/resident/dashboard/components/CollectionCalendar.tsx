import { useResidentQuery } from "@/lib/residentQuery";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { ResidentDashboardCalendarSkeleton } from "@/components/PageLoadingSkeletons";
import { dashboardStyles } from "../dashboardStyles";
import { Button } from "@/components/ui/button";
import { fetchCalendarEvents } from "@/services/scheduleService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateOnly, getManilaNow } from "@/utils/date";

const toDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const eventColor = (id: string) => {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) value = (value * 31 + id.charCodeAt(index)) >>> 0;
  return `hsl(${value % 360} 72% 52%)`;
};

const CollectionCalendar = () => {
  const navigate = useNavigate();
  const today = getManilaNow();
  const [currentDate, setCurrentDate] = useState(() => new Date(today.year, today.month - 1, 1));
  const [selectedDateStr, setSelectedDateStr] = useState(() =>
    today.dateKey,
  );
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = today.dateKey;

  const calendarQuery = useResidentQuery("schedule", ["calendar", year, month],
    () => fetchCalendarEvents({ month: `${year}-${String(month + 1).padStart(2, "0")}` }));
  const events = useMemo(() => calendarQuery.data ?? [], [calendarQuery.data]);
  const calendarError = calendarQuery.isError;
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const scheduleColorById = useMemo(
    () => new Map(events.map((event) => [event.id, eventColor(event.id)])),
    [events],
  );
  const selectedDateEvents = useMemo(
    () => events.filter((event) => {
      const start = event.event_date.split("T")[0];
      const end = event.end_date?.split("T")[0] || start;
      return start <= selectedDateStr && end >= selectedDateStr;
    }),
    [events, selectedDateStr],
  );

  const changeMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setCurrentDate(next);
    setSelectedDateStr(toDateString(next.getFullYear(), next.getMonth(), 1));
  };
  const goToday = () => {
    setCurrentDate(new Date(today.year, today.month - 1, 1));
    setSelectedDateStr(todayStr);
  };

  if (calendarQuery.isLoading) {
    return (
      <section className={dashboardStyles.calendarSection}>
        <ResidentDashboardCalendarSkeleton dayCount={firstDayIndex + daysInMonth} firstDayIndex={firstDayIndex} />
      </section>
    );
  }

  if (calendarError && calendarQuery.data === undefined) return <PageErrorState kind="unavailable" variant="section" title="Calendar couldn't load" description="We couldn't load calendar announcements. Please try again." onRetry={() => void calendarQuery.refetch()} retrying={calendarQuery.isFetching} />;

  return (
    <section className={dashboardStyles.calendarSection}>
      {calendarError && <DataRefreshNotice message="Couldn't refresh the calendar. Showing the last loaded announcements, which may be outdated." onRetry={() => void calendarQuery.refetch()} retrying={calendarQuery.isFetching} />}
      <CalendarGrid
        currentDate={currentDate}
        selectedDateStr={selectedDateStr}
        events={events}
        scheduleColorById={scheduleColorById}
        onSelectDate={setSelectedDateStr}
        onPrevMonth={() => changeMonth(-1)}
        onNextMonth={() => changeMonth(1)}
        onGoToday={goToday}
        headingLabel={formatDateOnly(toDateString(year, month, 1), { month: "long", year: "numeric" })}
        showNavigation={false}
        hideTodayButtonWhenOtherDateSelected
        compactMobileCells
        compact
        fillHeight
        className={dashboardStyles.calendarGrid}
        headerAction={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="View calendar"
            onClick={() => navigate("/resident/schedule")}
            className="group h-8 shrink-0 gap-1 px-2 text-xs"
          >
            <span className="resident-dashboard-calendar-action-label">View calendar</span> <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        }
        footer={<TooltipProvider delayDuration={100}>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="mr-1 text-xs font-medium text-muted-foreground">Announcements · {formatDateOnly(selectedDateStr, { month: "short", day: "numeric" })}</span>
          {selectedDateEvents.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              {calendarError ? "Announcements unavailable right now." : "No official announcements on this date."}
            </span>
          ) : selectedDateEvents.map((event) => {
            const start = event.event_date.split("T")[0];
            const end = event.end_date?.split("T")[0] || start;
            const dateLabel = formatDateOnly(start, { month: "short", day: "numeric" });
            const endLabel = end === start ? null : formatDateOnly(end, { month: "short", day: "numeric" });
            const color = scheduleColorById.get(event.id) || "hsl(var(--chart-1))";
            return (
              <Tooltip key={event.id}>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex max-w-[180px] items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-muted/80 cursor-pointer"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate font-semibold">{event.title}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="w-[280px] lg:w-[320px] max-w-[90vw] space-y-2 p-3 rounded-xl shadow-md border border-border bg-popover text-popover-foreground z-50 text-left">
                  <div className="flex items-start gap-2 font-bold text-xs leading-tight">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: color }}
                    />
                    <span className="break-words break-all [overflow-wrap:anywhere]">{event.title}</span>
                  </div>

                  <p className="text-ui-caption text-muted-foreground">
                    <strong className="text-foreground">Date:</strong> {dateLabel}{endLabel ? ` – ${endLabel}` : ""}
                  </p>

                  {event.description && (
                    <div className="pt-1.5 border-t border-border/60 max-h-36 overflow-y-auto pr-1">
                      <p className="text-ui-caption text-muted-foreground/90 italic leading-relaxed break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
                        {event.description}
                      </p>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
          </div>
        </TooltipProvider>}
      />
    </section>
  );
};

export default CollectionCalendar;

