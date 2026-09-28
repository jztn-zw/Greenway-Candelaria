import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarEvent } from "@/services/scheduleService";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDateOnly, getManilaNow } from "@/utils/date";
import { indexMonthEvents } from "./calendar.utils";

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
  compact?: boolean;
  embedded?: boolean;
  fillHeight?: boolean;
  twoLayerDots?: boolean;
  className?: string;
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
  compact = false,
  embedded = false,
  fillHeight = false,
  twoLayerDots = false,
  className,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedDate = new Date(`${selectedDateStr}T00:00:00`);
  const headingDate = Number.isNaN(selectedDate.getTime())
    ? currentDate.toLocaleString("default", { month: "long", year: "numeric" })
    : selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const todayStr = getManilaNow().dateKey;
  const eventsByDate = useMemo(() => indexMonthEvents(events, year, month), [events, year, month]);

  const renderEventDot = (event: CalendarEvent, isMobile = false) => {
    const start = event.event_date ? event.event_date.split("T")[0] : "";
    const end = event.end_date ? event.end_date.split("T")[0] : start;
    const dateLabel = start ? new Date(`${start}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
    const endLabel = end && end !== start ? new Date(`${end}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
    const color = scheduleColorById.get(event.id) || "hsl(160 72% 52%)";

    return (
      <Tooltip key={event.id}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "rounded-full cursor-pointer hover:scale-125 transition-transform shadow-2xs shrink-0",
              isMobile || compact || twoLayerDots ? "h-1.5 w-1.5" : "h-2 w-2"
            )}
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

          {(event.location || event.barangay_name) && (
            <p className="text-[11px] text-muted-foreground break-words break-all [overflow-wrap:anywhere]">
              <strong className="text-foreground">Location:</strong> {event.location || event.barangay_name}
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
  };

  const renderMultiEventsPill = (
    eventsList: CalendarEvent[],
    totalCount: number,
    dayNumber: number,
    pillLabel?: string,
    isMobile = false
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center gap-1 rounded-full bg-muted/80 hover:bg-muted font-bold font-mono text-foreground leading-none shrink-0 transition-all hover:scale-105 cursor-pointer shadow-2xs",
            isMobile ? "h-3.5 px-1.5 text-[9px]" : "h-4 px-1.5 text-[10px]"
          )}
          aria-label={`${totalCount} schedules`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: scheduleColorById.get(eventsList[0]?.id) || "hsl(160 72% 52%)" }}
          />
          <span>{pillLabel || totalCount}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        collisionPadding={16}
        className="w-[280px] sm:w-[320px] max-w-[90vw] p-3 rounded-xl shadow-xl border border-border bg-popover text-popover-foreground z-50 text-left space-y-2"
      >
        <div className="font-bold text-xs pb-1.5 border-b border-border/60 flex items-center justify-between">
          <span className="font-semibold text-foreground">Schedules for Day {dayNumber}</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {totalCount} total
          </span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {eventsList.map((event) => {
            const color = scheduleColorById.get(event.id) || "hsl(160 72% 52%)";
            return (
              <div key={event.id} className="text-xs space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium leading-tight">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate font-semibold text-foreground">
                    {event.title}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground pl-3.5 flex items-center gap-1.5 flex-wrap">
                  {event.start_time && (
                    <span>
                      {event.start_time.slice(0, 5)}
                      {event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ""}
                    </span>
                  )}
                  {(event.location || event.barangay_name) && (
                    <span className="truncate">
                      • {event.location || event.barangay_name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  );

  const renderTwoLayerDots = (dayEvents: CalendarEvent[], dayNum: number) => {
    if (dayEvents.length === 0) return null;

    const layer1 = dayEvents.slice(0, 3);
    const hasLayer2 = dayEvents.length > 3;
    const layer2 = dayEvents.slice(3, 6);

    return (
      <span className="w-full flex items-center justify-center">
        {/* Non-laptop screens (< xl: mobile, tablet, and compact 1024px desktop):
            Same as mobile logic: if dots don't fit (> 3 events), show multi-events pill [• count], otherwise show individual dots */}
        <span className="flex xl:hidden items-center justify-center gap-0.5 w-full max-w-full overflow-hidden px-0.5">
          {dayEvents.length > 3
            ? renderMultiEventsPill(dayEvents, dayEvents.length, dayNum, undefined, true)
            : dayEvents.map((evt) => renderEventDot(evt, true))}
        </span>

        {/* Laptop & Big Screen View (>= xl):
            If dots don't fit (> 6 events), use multi-events pill [• count].
            Otherwise render up to 2 clean layers (max 3 dots per row) */}
        <span className="hidden xl:flex flex-col items-center justify-center w-full gap-0.5">
          {dayEvents.length > 6 ? (
            renderMultiEventsPill(dayEvents, dayEvents.length, dayNum, undefined, false)
          ) : (
            <>
              {/* First layer: up to 3 dots */}
              <span className="flex items-center justify-center gap-0.5">
                {layer1.map((evt) => renderEventDot(evt, true))}
              </span>

              {/* Second layer: up to 3 dots if 4-6 events */}
              {hasLayer2 && (
                <span className="flex items-center justify-center gap-0.5">
                  {layer2.map((evt) => renderEventDot(evt, true))}
                </span>
              )}
            </>
          )}
        </span>
      </span>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className={embedded ? cn("h-full flex flex-col", className) : cn("bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs", fillHeight && "flex flex-col", className)}>
        {/* Month Header & Controls */}
        <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-3 sm:mb-4 sm:pb-4 shrink-0">
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
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider pb-2 shrink-0">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* 7-Column Month Grid */}
        <div
          className={cn(
            "grid grid-cols-7",
            compact ? "gap-1" : "gap-1 sm:gap-1.5",
            fillHeight && "min-h-0 sm:flex-1 sm:auto-rows-fr",
            embedded && !compact && "min-h-0 flex-1 auto-rows-fr",
            compactMobileCells && "min-h-0"
          )}
        >
          {/* Empty slots for offset */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className={cn(
                "rounded-xl bg-muted/20 border border-transparent opacity-30",
                fillHeight
                  ? compactMobileCells
                    ? "aspect-square min-h-0 sm:aspect-auto sm:min-h-0 sm:h-full"
                    : "min-h-0 sm:h-full"
                  : compact
                    ? compactMobileCells
                      ? "aspect-square min-h-0 sm:aspect-auto sm:min-h-[52px]"
                      : "min-h-[52px]"
                    : compactMobileCells
                      ? "aspect-square min-h-0 sm:aspect-auto sm:min-h-[95px]"
                      : embedded
                        ? "min-h-0"
                        : "min-h-[75px] sm:min-h-[95px]"
              )}
            />
          ))}

          {/* Calendar Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const isSelected = selectedDateStr === dateStr;
            const isToday = todayStr === dateStr;

            const dayEvents = eventsByDate.get(dateStr) ?? [];

            return (
              <button
                type="button"
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                aria-label={`${formatDateOnly(dateStr, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${dayEvents.length ? `: ${dayEvents.map((event) => event.title).join(", ")}` : ""}`}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "relative rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  fillHeight
                    ? compactMobileCells
                      ? "aspect-square min-h-0 p-1 sm:aspect-auto sm:p-2 sm:min-h-0 sm:h-full"
                      : "min-h-0 sm:h-full p-1.5 sm:p-2"
                    : compact
                      ? compactMobileCells
                        ? "aspect-square min-h-0 p-1 sm:aspect-auto sm:px-1 sm:py-1.5 sm:min-h-[52px]"
                        : "min-h-[52px] px-1 py-1.5 sm:p-2"
                      : compactMobileCells
                        ? "aspect-square min-h-0 p-1 sm:aspect-auto sm:p-2 sm:min-h-[95px]"
                        : embedded
                          ? "min-h-0 p-1.5"
                          : "min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2",
                  isSelected
                    ? "border-primary bg-primary/[0.07] dark:bg-primary/10 shadow-2xs ring-1 ring-primary/50"
                    : isToday
                      ? "border-primary/40 bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                      : "border-border/60 hover:border-border hover:bg-muted/40"
                )}
              >
                {/* Day Number */}
                <span className="flex items-center justify-between">
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
                </span>

                {/* Schedule Indicators:
                    - Collector Dashboard (twoLayerDots): 2 layers (5 first layer, 5 second layer, max 10)
                    - Standard calendars:
                      - Mobile (< sm): 1-3 centered dots, or micro-pill if > 3
                      - Desktop (>= sm): Show up to 12 dots directly in the big screen, or first 11 + overflow pill if > 12 */}
                <span className="relative mt-0.5 sm:mt-1 min-h-3.5 sm:min-h-4 flex items-center justify-center w-full max-w-full overflow-hidden">
                  {twoLayerDots ? (
                    renderTwoLayerDots(dayEvents, dayNum)
                  ) : (
                    <>
                      {/* Mobile View */}
                      <span className="flex sm:hidden items-center justify-center gap-1 w-full">
                        {dayEvents.length > 3
                          ? renderMultiEventsPill(dayEvents, dayEvents.length, dayNum, undefined, true)
                          : dayEvents.map((evt) => renderEventDot(evt, true))}
                      </span>

                      {/* Desktop / Big Screen View */}
                      <span className="hidden sm:flex flex-wrap items-center justify-center gap-1 w-full max-w-full px-0.5 py-0.5">
                        {dayEvents.length <= 12
                          ? dayEvents.map((evt) => renderEventDot(evt, false))
                          : (
                            <>
                              {dayEvents.slice(0, 11).map((evt) => renderEventDot(evt, false))}
                              {renderMultiEventsPill(dayEvents.slice(11), dayEvents.length, dayNum, `+${dayEvents.length - 11}`, false)}
                            </>
                          )}
                      </span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {footer && <div className="shrink-0">{footer}</div>}
      </div>
    </TooltipProvider>
  );
};
