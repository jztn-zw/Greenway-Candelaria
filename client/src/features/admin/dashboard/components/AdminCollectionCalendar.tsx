import { Button } from "@/components/ui/button";
import { CalendarSkeleton } from "@/components/PageLoadingSkeletons";
import { getEventColor } from "@/components/calendar/calendar.utils";
import { useAdminQuery } from "@/lib/adminQuery";
import { cn } from "@/lib/utils";
import { fetchCalendarEvents } from "@/services/scheduleService";
import { ArrowRight } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AdminCollectionCalendarProps {
  className?: string;
  asOfDate?: string;
}

const AdminCollectionCalendar: React.FC<AdminCollectionCalendarProps> = ({ className = "", asOfDate }) => {
  const navigate = useNavigate();
  const currentDate = new Date(`${asOfDate || new Date().toISOString().slice(0, 10)}T12:00:00Z`);
  const { data: events = [], isLoading, isError: error } = useAdminQuery("schedule", ["calendar", asOfDate], () => fetchCalendarEvents(), { refetchInterval: 60_000 });

  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth();
  const todayDayNumber = currentDate.getUTCDate();

  const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(todayDayNumber).padStart(2, "0")}`;
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  useEffect(() => { setSelectedDateStr(todayStr); }, [todayStr]);

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString("en-US", { month: "long", timeZone: "UTC" });

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0);
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

  // Assign distinct colors per event visible in current month
  const scheduleColorById = useMemo(() => {
    const visibleScheduleIds = [
      ...new Set(
        events
          .filter((event) => {
            const start = event.event_date ? event.event_date.split("T")[0] : "";
            const end = event.end_date ? event.end_date.split("T")[0] : start;
            return start <= monthEnd && end >= monthStart;
          })
          .map((event) => event.id)
      ),
    ].sort();

    return new Map(
      visibleScheduleIds.map((id) => [
        id,
        getEventColor(id),
      ])
    );
  }, [events, monthStart, monthEnd]);

  // Events in currently selected month
  const currentMonthEvents = useMemo(() => {
    return events.filter((event) => {
      const start = event.event_date ? event.event_date.split("T")[0] : "";
      const end = event.end_date ? event.end_date.split("T")[0] : start;
      return start <= monthEnd && end >= monthStart;
    });
  }, [events, monthStart, monthEnd]);

  // Events for selected date
  const selectedDayEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return events.filter((e) => {
      const start = typeof e.event_date === "string" ? e.event_date.split("T")[0] : "";
      const end = e.end_date ? e.end_date.split("T")[0] : start;
      return start <= selectedDateStr && end >= selectedDateStr;
    });
  }, [events, selectedDateStr]);

  // Event titles with matching dot colors to display directly below the calendar
  const eventsToShow = useMemo(() => {
    const source = selectedDayEvents.length > 0 ? selectedDayEvents : currentMonthEvents;
    const seen = new Set<string>();
    return source.filter((e) => {
      const key = (e.title || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedDayEvents, currentMonthEvents]);

  if (isLoading) {
    return <CalendarSkeleton asOfDate={asOfDate} className={className} />;
  }

  return (
    <div
      className={cn("bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs", className)}
    >
      {/* Header with Title, Month & Manager Link */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <h3 className="gw-heading text-base sm:text-lg text-foreground tracking-tight">
            MENRO Schedule
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {monthName} {year}
          </span>
        </div>

        <Button
          variant="primary-ghost"
          size="sm"
          className="group inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          onClick={() => navigate("/admin/schedule")}
        >
          <span>Schedule Manager</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Calendar Grid Container */}
      {error && <p role="alert" className="text-sm text-destructive">Schedule data could not be refreshed. Please open Schedule Manager to retry.</p>}
      {!error &&
      <TooltipProvider delayDuration={100}>
        <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-ui-caption font-semibold text-muted-foreground/80 uppercase tracking-wider pb-2">
          {dayLabels.map((d) => (
            <div
              key={d}
              className="py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 min-h-0">
          {/* Empty offset slots */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-square min-h-0 sm:aspect-auto sm:min-h-[95px] rounded-xl bg-muted/20 border border-transparent opacity-30"
            />
          ))}

          {/* Month Day Cells */}
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
                onClick={() => setSelectedDateStr(dateStr)}
                className={cn(
                  "relative aspect-square min-h-0 p-1 sm:aspect-auto sm:p-2 sm:min-h-[95px] rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between group text-left",
                  isSelected
                    ? "border-primary bg-primary/[0.07] dark:bg-primary/10 shadow-2xs ring-1 ring-primary/50"
                    : isToday
                      ? "border-primary/40 bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                      : "border-border/60 hover:border-border hover:bg-muted/40"
                )}
              >
                {/* Day Number Circle */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full transition-all",
                      isToday
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : isSelected
                          ? "text-primary font-bold"
                          : "text-foreground group-hover:text-primary"
                    )}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* All schedule color dots directly on date with hover details */}
                <div className="relative mt-0.5 sm:mt-1 min-h-3.5 sm:min-h-4 flex items-center justify-center w-full max-w-full">
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1 w-full max-w-full sm:px-0.5 sm:py-0.5">
                      {dayEvents.map((evt) => {
                        const dateText = evt.event_date
                          ? new Date(evt.event_date.split("T")[0] + "T00:00:00").toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "";
                        const endDateText = evt.end_date && evt.end_date !== evt.event_date
                          ? new Date(evt.end_date.split("T")[0] + "T00:00:00").toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "";

                        return (
                          <Tooltip key={evt.id}>
                            <TooltipTrigger asChild>
                              <span
                                className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0 shadow-2xs transition-transform hover:scale-125 cursor-pointer"
                                style={{
                                  backgroundColor:
                                    scheduleColorById.get(evt.id) || "hsl(var(--chart-1))",
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="w-[280px] sm:w-[320px] max-w-[90vw] space-y-2 p-3 rounded-xl shadow-md border border-border bg-popover text-popover-foreground z-50 text-left"
                            >
                              <div className="flex items-start gap-2 font-bold text-xs leading-tight">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                                  style={{
                                    backgroundColor:
                                      scheduleColorById.get(evt.id) || "hsl(var(--chart-1))",
                                  }}
                                />
                                <span className="break-words break-all [overflow-wrap:anywhere]">{evt.title}</span>
                              </div>

                              {dateText && (
                                <p className="text-ui-caption text-muted-foreground">
                                  <strong className="text-foreground">Date:</strong> {dateText}
                                  {endDateText ? ` – ${endDateText}` : ""}
                                </p>
                              )}

                              {evt.start_time && (
                                <p className="text-ui-caption text-muted-foreground">
                                  <strong className="text-foreground">Time:</strong> {evt.start_time.slice(0, 5)}
                                  {evt.end_time ? ` – ${evt.end_time.slice(0, 5)}` : ""}
                                </p>
                              )}

                              {(evt.location || evt.barangay_name) && (
                                <p className="text-ui-caption text-muted-foreground break-words break-all [overflow-wrap:anywhere]">
                                  <strong className="text-foreground">Location:</strong> {evt.location || evt.barangay_name}
                                </p>
                              )}

                              {evt.description && (
                                <div className="pt-1.5 border-t border-border/60 max-h-36 overflow-y-auto pr-1">
                                  <p className="text-ui-caption text-muted-foreground/90 italic leading-relaxed break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
                                    {evt.description}
                                  </p>
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Schedule Legend with full details on hover and click */}
        {eventsToShow.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <span className="text-ui-caption font-bold text-muted-foreground uppercase tracking-wider mr-1">
                Schedule Legend:
              </span>
              {eventsToShow.map((evt) => {
                const dateText = evt.event_date
                  ? new Date(evt.event_date.split("T")[0] + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "";
                const endDateText = evt.end_date && evt.end_date !== evt.event_date
                  ? new Date(evt.end_date.split("T")[0] + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "";

                return (
                  <Tooltip key={evt.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          if (evt.event_date) {
                            setSelectedDateStr(evt.event_date.split("T")[0]);
                          }
                        }}
                        className="gw-action-outline inline-flex max-w-[180px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors cursor-pointer"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              scheduleColorById.get(evt.id) || "hsl(var(--chart-1))",
                          }}
                        />
                        <span className="truncate font-semibold">
                          {evt.title}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-[280px] sm:w-[320px] max-w-[90vw] space-y-2 p-3 rounded-xl shadow-md border border-border bg-popover text-popover-foreground z-50 text-left">
                      <div className="flex items-start gap-2 font-bold text-xs leading-tight">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                          style={{
                            backgroundColor:
                              scheduleColorById.get(evt.id) || "hsl(var(--chart-1))",
                          }}
                        />
                        <span className="break-words break-all [overflow-wrap:anywhere]">{evt.title}</span>
                      </div>

                      {dateText && (
                        <p className="text-ui-caption text-muted-foreground">
                          <strong className="text-foreground">Date:</strong> {dateText}
                          {endDateText ? ` – ${endDateText}` : ""}
                        </p>
                      )}

                      {evt.start_time && (
                        <p className="text-ui-caption text-muted-foreground">
                          <strong className="text-foreground">Time:</strong> {evt.start_time.slice(0, 5)}
                          {evt.end_time ? ` – ${evt.end_time.slice(0, 5)}` : ""}
                        </p>
                      )}

                      {(evt.location || evt.barangay_name) && (
                        <p className="text-ui-caption text-muted-foreground break-words break-all [overflow-wrap:anywhere]">
                          <strong className="text-foreground">Location:</strong> {evt.location || evt.barangay_name}
                        </p>
                      )}

                      {evt.description && (
                        <div className="pt-1.5 border-t border-border/60 max-h-36 overflow-y-auto pr-1">
                          <p className="text-ui-caption text-muted-foreground/90 italic leading-relaxed break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
                            {evt.description}
                          </p>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
        )}
        </div>
      </TooltipProvider>
      }
    </div>
  );
};

export default AdminCollectionCalendar;
