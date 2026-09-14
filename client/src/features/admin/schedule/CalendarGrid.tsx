import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarEvent } from "@/services/scheduleService";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface CalendarGridProps {
  currentDate: Date;
  selectedDateStr: string;
  events: CalendarEvent[];
  scheduleColorById: Map<string, string>;
  onSelectDate: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
  footer?: React.ReactNode;
  headingLabel?: string;
  headerAction?: React.ReactNode;
  showNavigation?: boolean;
  showTodayButton?: boolean;
  hideTodayButtonWhenOtherDateSelected?: boolean;
  compactMobileCells?: boolean;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  selectedDateStr,
  events,
  scheduleColorById,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  footer,
  headingLabel,
  headerAction,
  showNavigation = true,
  showTodayButton = true,
  hideTodayButtonWhenOtherDateSelected = false,
  compactMobileCells = false,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedDate = new Date(`${selectedDateStr}T00:00:00`);
  const headingDate = Number.isNaN(selectedDate.getTime())
    ? currentDate.toLocaleString("default", { month: "long", year: "numeric" })
    : selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
        {/* Month Header & Controls */}
        <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-foreground font-display tracking-tight">
              {headingLabel || headingDate}
            </h2>
            {showTodayButton && (!hideTodayButtonWhenOtherDateSelected || selectedDateStr === todayStr) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGoToday}
                className="text-xs h-7 px-2.5 rounded-lg font-medium border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer active:scale-95 transition-all"
              >
                Today
              </Button>
            )}
          </div>

          {headerAction || (showNavigation && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrevMonth}
                className="w-8 h-8 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer active:scale-95 transition-all"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNextMonth}
                className="w-8 h-8 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer active:scale-95 transition-all"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider pb-2">
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
            className={`${compactMobileCells ? "aspect-square min-h-0 sm:aspect-auto sm:min-h-[95px]" : "min-h-[75px] sm:min-h-[95px]"} rounded-xl bg-muted/20 border border-transparent opacity-30`}
          />
        ))}

        {/* Calendar Day Cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const isSelected = selectedDateStr === dateStr;
          const isToday = todayStr === dateStr;

          const dayEvents = events.filter((e) => {
            const start = typeof e.event_date === "string" ? e.event_date.split("T")[0] : "";
            const end = e.end_date ? e.end_date.split("T")[0] : start;
            return start <= dateStr && end >= dateStr;
          });

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              title={dayEvents.length > 0 ? dayEvents.map((event) => event.title).join("\n") : undefined}
              aria-label={dayEvents.length > 0 ? `${dayNum}: ${dayEvents.map((event) => event.title).join(", ")}` : undefined}
              className={`relative ${compactMobileCells ? "aspect-square min-h-0 p-1 sm:aspect-auto sm:min-h-[95px] sm:p-2" : "min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2"} rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? "border-primary bg-primary/[0.07] dark:bg-primary/10 shadow-2xs ring-1 ring-primary/50"
                  : isToday
                    ? "border-primary/40 bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                    : "border-border/60 hover:border-border hover:bg-muted/40"
              }`}
            >
              {/* Day Number and Count */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full transition-all ${
                    isToday
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : isSelected
                        ? "text-primary font-bold"
                        : "text-foreground group-hover:text-primary"
                  }`}
                >
                  {dayNum}
                </span>
              </div>

              {/* Every schedule is a compact color dot, including multi-day schedules. */}
              <div className="relative mt-1 min-h-5">
                <div className="grid grid-cols-6 gap-x-1.5 gap-y-1 max-w-[58px]">
                  {dayEvents.slice(0, 12).map((event) => {
                    const start = event.event_date ? event.event_date.split("T")[0] : "";
                    const end = event.end_date ? event.end_date.split("T")[0] : start;
                    const dateLabel = start ? new Date(`${start}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
                    const endLabel = end && end !== start ? new Date(`${end}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
                    const color = scheduleColorById.get(event.id) || "hsl(160 72% 52%)";

                    return (
                      <Tooltip key={event.id}>
                        <TooltipTrigger asChild>
                          <span
                            className="h-2 w-2 rounded-full cursor-pointer hover:scale-125 transition-transform shadow-2xs"
                            style={{ backgroundColor: color }}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          align="start"
                          collisionPadding={16}
                          className="w-[280px] sm:w-[320px] max-w-[90vw] space-y-2 p-3 rounded-xl shadow-xl border border-border bg-popover text-popover-foreground z-50 text-left"
                        >
                          <div className="flex items-start gap-2 font-bold text-xs leading-tight">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                              style={{ backgroundColor: color }}
                            />
                            <span className="break-words break-all [overflow-wrap:anywhere]">{event.title}</span>
                          </div>

                          {dateLabel && (
                            <p className="text-[11px] text-muted-foreground">
                              <strong className="text-foreground">Date:</strong> {dateLabel}{endLabel ? ` – ${endLabel}` : ""}
                            </p>
                          )}

                          {event.start_time && (
                            <p className="text-[11px] text-muted-foreground">
                              <strong className="text-foreground">Time:</strong> {event.start_time.slice(0, 5)}
                              {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ""}
                            </p>
                          )}

                          {(event.location || (event as any).barangay_name) && (
                            <p className="text-[11px] text-muted-foreground break-words break-all [overflow-wrap:anywhere]">
                              <strong className="text-foreground">Location:</strong> {event.location || (event as any).barangay_name}
                            </p>
                          )}

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
              </div>
            </div>
          );
        })}
      </div>
        {footer}
      </div>
    </TooltipProvider>
  );
};
