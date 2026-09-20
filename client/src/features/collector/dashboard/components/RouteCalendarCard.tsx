import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CalendarGrid } from "@/features/admin/schedule/CalendarGrid";
import { CalendarEvent, fetchCalendarEvents } from "@/services/scheduleService";

const toDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const RouteCalendarCard = () => {
  const navigate = useNavigate();
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

  const changeMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setCurrentDate(next);
    setSelectedDateStr(toDateString(next.getFullYear(), next.getMonth(), 1));
  };

  const goToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  return (
    <section className="flex h-full min-h-0 sm:min-h-[380px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-xs sm:p-4 lg:min-h-0">
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
