import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { CalendarEvent } from "@/services/scheduleService";

interface CalendarGridProps {
  currentDate: Date;
  selectedDateStr: string;
  events: CalendarEvent[];
  onSelectDate: (dateStr: string) => void;
  onViewEvent?: (event: CalendarEvent) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  selectedDateStr,
  events,
  onSelectDate,
  onViewEvent,
  onPrevMonth,
  onNextMonth,
  onGoToday,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
      {/* Month Header & Controls */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-foreground font-display tracking-tight">
            {monthName}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onGoToday}
            className="text-xs h-7 px-2.5 rounded-lg ml-1 font-semibold cursor-pointer active:scale-95 transition-all"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevMonth}
            className="w-8 h-8 rounded-xl hover:bg-muted cursor-pointer active:scale-95 transition-all"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            className="w-8 h-8 rounded-xl hover:bg-muted cursor-pointer active:scale-95 transition-all"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider pb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* 7-Column Month Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {/* Empty slots for offset */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="min-h-[75px] sm:min-h-[95px] rounded-xl bg-muted/20 border border-transparent opacity-30"
          />
        ))}

        {/* Calendar Day Cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const isSelected = selectedDateStr === dateStr;
          const isToday = todayStr === dateStr;

          const dayEvents = events.filter((e) => {
            const eDate = typeof e.event_date === "string" ? e.event_date.split("T")[0] : "";
            return eDate === dateStr;
          });

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-2xs ring-1.5 ring-primary/40"
                  : isToday
                    ? "border-primary/40 bg-muted/30"
                    : "border-border/60 hover:border-primary/30 hover:bg-muted/40"
              }`}
            >
              {/* Day Number and Count */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full transition-colors ${
                    isToday
                      ? "bg-primary text-primary-foreground font-extrabold shadow-2xs"
                      : isSelected
                        ? "text-primary font-black"
                        : "text-foreground group-hover:text-primary"
                  }`}
                >
                  {dayNum}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-muted/80 text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Pills */}
              <div className="space-y-1 mt-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((e) => {
                  const style =
                    e.event_type === "PRIVATE_EVENT"
                      ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25 hover:bg-amber-500/25"
                      : e.event_type === "COMMUNITY_EVENT"
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/25"
                        : "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/25 hover:bg-sky-500/25";

                  const dotColor =
                    e.event_type === "PRIVATE_EVENT"
                      ? "bg-amber-500"
                      : e.event_type === "COMMUNITY_EVENT"
                        ? "bg-emerald-500"
                        : "bg-sky-500";

                  return (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onSelectDate(dateStr);
                        if (onViewEvent) onViewEvent(e);
                      }}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-medium truncate shadow-2xs transition-colors cursor-pointer ${style}`}
                      title={`${e.title} (${e.event_type === "PRIVATE_EVENT" ? "Private" : "Public"})`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                      <span className="truncate">{e.title}</span>
                    </div>
                  );
                })}

                {dayEvents.length > 2 && (
                  <span className="text-[9px] font-semibold text-muted-foreground pl-1 block hover:text-foreground">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
