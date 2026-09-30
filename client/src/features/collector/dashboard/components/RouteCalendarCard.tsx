import { useCollectorQuery } from "@/lib/collectorQuery";
import { getEventColors } from "@/components/calendar/calendar.utils";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CollectorCalendarCardSkeleton } from "@/components/PageLoadingSkeletons";
import { fetchCalendarEvents } from "@/services/scheduleService";
import { getManilaNow } from "@/utils/date";

const toDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const RouteCalendarCard = () => {
  const navigate = useNavigate();
  const today = getManilaNow();
  const [currentDate, setCurrentDate] = useState(() => new Date(today.year, today.month - 1, 1));
  const [selectedDateStr, setSelectedDateStr] = useState(() =>
    today.dateKey,
  );
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = today.dateKey;

  const monthKey = toDateString(year, month, 1).slice(0, 7);
  const schedule = useCollectorQuery("schedule", [monthKey], () => fetchCalendarEvents({ view: "collector", event_type: "PRIVATE_EVENT", visibility: "PRIVATE", month: monthKey }));
  const calendarError = Boolean(schedule.error);
  const calendarLoading = schedule.isLoading;
  const events = useMemo(() => schedule.data ?? [], [schedule.data]);

  const scheduleColorById = useMemo(() => getEventColors(events), [events]);

  const changeMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setCurrentDate(next);
    setSelectedDateStr(toDateString(next.getFullYear(), next.getMonth(), 1));
  };

  const goToday = () => {
    setCurrentDate(new Date(today.year, today.month - 1, 1));
    setSelectedDateStr(todayStr);
  };

  if (calendarLoading) return <CollectorCalendarCardSkeleton year={year} month={month} />;

  return (
    <section className="flex h-full min-h-0 sm:min-h-[380px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-xs sm:p-4 lg:min-h-0">
      {calendarError ? <p role="alert" className="text-sm text-destructive">Schedule unavailable. Open the schedule page to check again later.</p> : null}
      <div className="min-h-0 flex-1">
        <CalendarGrid
          embedded
          currentDate={currentDate}
          selectedDateStr={selectedDateStr}
          events={events}
          scheduleColorById={scheduleColorById}
          onSelectDate={setSelectedDateStr}
          onPrevMonth={() => changeMonth(-1)}
          onNextMonth={() => changeMonth(1)}
          onGoToday={goToday}
          headingLabel={new Date(`${selectedDateStr}T00:00:00`).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          showNavigation={false}
          hideTodayButtonWhenOtherDateSelected
          compactMobileCells
          compact
          twoLayerDots
          headerAction={
            <button
              type="button"
            onClick={() => navigate("/collector/schedule")}
              className="group inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-primary transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
            >
            View schedule <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          }
        />
      </div>
    </section>
  );
};

export default RouteCalendarCard;
