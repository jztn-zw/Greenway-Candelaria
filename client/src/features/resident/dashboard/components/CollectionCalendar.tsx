import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CalendarGrid } from "@/features/admin/schedule/CalendarGrid";
import { CalendarEvent, fetchCalendarEvents } from "@/services/scheduleService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const toDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const eventColor = (id: string) => {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) value = (value * 31 + id.charCodeAt(index)) >>> 0;
  return `hsl(${value % 360} 72% 52%)`;
};

const CollectionCalendar = () => {
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
    fetchCalendarEvents({ month: `${year}-${String(month + 1).padStart(2, "0")}` })
      .then(setEvents)
      .catch((error) => console.error("Failed to load resident calendar events", error));
  }, [year, month]);

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
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  return (
    <section>
      <CalendarGrid
        currentDate={currentDate}
        selectedDateStr={selectedDateStr}
        events={events}
        scheduleColorById={scheduleColorById}
        onSelectDate={setSelectedDateStr}
        onPrevMonth={() => changeMonth(-1)}
        onNextMonth={() => changeMonth(1)}
        onGoToday={goToday}
        headingLabel={new Date(`${selectedDateStr}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        showNavigation={false}
        hideTodayButtonWhenOtherDateSelected
        compactMobileCells
        headerAction={
          <button
            type="button"
            onClick={() => navigate("/resident/schedule")}
            className="group inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-primary transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
          >
            View Calendar <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        }
        footer={<TooltipProvider delayDuration={100}>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ANNOUNCEMENTS</span>
          {selectedDateEvents.length === 0 ? (
            <span className="text-xs text-muted-foreground">No official announcements on this date.</span>
          ) : selectedDateEvents.map((event) => {
            const start = event.event_date.split("T")[0];
            const end = event.end_date?.split("T")[0] || start;
            const dateLabel = new Date(`${start}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const endLabel = end === start ? null : new Date(`${end}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const color = scheduleColorById.get(event.id) || "hsl(160 72% 52%)";
            return (
              <Tooltip key={event.id}>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-muted/80 cursor-pointer"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate font-semibold">{event.title}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="w-[280px] lg:w-[320px] max-w-[90vw] space-y-2 p-3 rounded-xl shadow-xl border border-border bg-popover text-popover-foreground z-50 text-left">
                  <div className="flex items-start gap-2 font-bold text-xs leading-tight">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: color }}
                    />
                    <span className="break-words break-all [overflow-wrap:anywhere]">{event.title}</span>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Date:</strong> {dateLabel}{endLabel ? ` – ${endLabel}` : ""}
                  </p>

                  {event.description && (
                    <div className="pt-1.5 border-t border-border/60 max-h-36 overflow-y-auto pr-1">
                      <p className="text-[11px] text-muted-foreground/90 italic leading-relaxed break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
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

