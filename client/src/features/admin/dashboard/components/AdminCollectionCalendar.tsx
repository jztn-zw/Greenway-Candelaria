import React, { useState, useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarEvent, fetchCalendarEvents } from "@/services/scheduleService";
import { DashboardRoute } from "./useAdminDashboard";
import { cn } from "@/lib/utils";

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AdminCollectionCalendarProps {
  className?: string;
  routes?: DashboardRoute[];
}

const AdminCollectionCalendar: React.FC<AdminCollectionCalendarProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const currentDate = new Date();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayDayNumber = currentDate.getDate();

  const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(todayDayNumber).padStart(2, "0")}`;
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Fetch real schedule events from Schedule Manager
  useEffect(() => {
    let isMounted = true;
    const loadEvents = async () => {
      try {
        const data = await fetchCalendarEvents();
        if (isMounted) {
          setEvents(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch calendar schedule events", err);
      }
    };
    loadEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

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
      visibleScheduleIds.map((id, index) => [
        id,
        `hsl(${Math.round((index * 360) / Math.max(visibleScheduleIds.length, 1))} 72% 52%)`,
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

  return (
    <div
      className={`bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all space-y-3.5 ${className}`}
    >
      {/* Header with Title, Month Badge & Manager Link */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-base font-bold text-foreground font-display">
            MENRO Schedule
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted/60 text-muted-foreground border border-border/80 shadow-2xs">
            {monthName} {year}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary font-semibold h-8 px-3 gap-1.5 hover:bg-primary/10 hover:text-primary rounded-xl cursor-pointer group active:scale-95 transition-all"
          onClick={() => navigate("/admin/schedule")}
        >
          <span>Schedule Manager</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Calendar Grid Container */}
      <TooltipProvider delayDuration={100}>
        <div className="border border-border/80 rounded-xl p-3 sm:p-3.5 bg-background space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1">
          {dayLabels.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-0.5"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells — matched to Schedule Manager CalendarGrid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {/* Empty offset slots */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[64px] sm:min-h-[72px] rounded-xl bg-muted/15 border border-transparent opacity-30"
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
                  "relative min-h-[64px] sm:min-h-[72px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-2xs ring-1.5 ring-primary/40"
                    : isToday
                      ? "border-primary/40 bg-muted/30"
                      : "border-border/60 hover:border-primary/30 hover:bg-muted/40"
                )}
              >
                {/* Day Number Circle */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full transition-colors",
                      isToday
                        ? "bg-primary text-primary-foreground font-extrabold shadow-2xs"
                        : isSelected
                          ? "text-primary font-black"
                          : "text-foreground group-hover:text-primary"
                    )}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* All schedule color dots directly on date with hover details */}
                <div className="relative mt-auto min-h-[16px] flex items-center">
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 max-w-full">
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
                                className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0 shadow-2xs transition-transform hover:scale-150 cursor-pointer"
                                style={{
                                  backgroundColor:
                                    scheduleColorById.get(evt.id) || "hsl(160 72% 52%)",
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="w-[280px] sm:w-[320px] max-w-[90vw] space-y-2 p-3 rounded-xl shadow-xl border border-border bg-popover text-popover-foreground z-50"
                            >
                              <div className="flex items-start gap-2 font-bold text-xs leading-tight">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                                  style={{
                                    backgroundColor:
                                      scheduleColorById.get(evt.id) || "hsl(160 72% 52%)",
                                  }}
                                />
                                <span className="break-words break-all [overflow-wrap:anywhere]">{evt.title}</span>
                              </div>

                              {dateText && (
                                <p className="text-[11px] text-muted-foreground">
                                  <strong className="text-foreground">Date:</strong> {dateText}
                                  {endDateText ? ` – ${endDateText}` : ""}
                                </p>
                              )}

                              {evt.start_time && (
                                <p className="text-[11px] text-muted-foreground">
                                  <strong className="text-foreground">Time:</strong> {evt.start_time.slice(0, 5)}
                                  {evt.end_time ? ` – ${evt.end_time.slice(0, 5)}` : ""}
                                </p>
                              )}

                              {(evt.location || evt.barangay_name) && (
                                <p className="text-[11px] text-muted-foreground break-words break-all [overflow-wrap:anywhere]">
                                  <strong className="text-foreground">Location:</strong> {evt.location || evt.barangay_name}
                                </p>
                              )}

                              {evt.description && (
                                <div className="pt-1.5 border-t border-border/60 max-h-36 overflow-y-auto pr-1">
                                  <p className="text-[11px] text-muted-foreground/90 italic leading-relaxed break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
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
          <div className="flex flex-wrap items-center gap-2 pt-2.5 mt-1 border-t border-border/60">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
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
                        className="inline-flex items-center gap-1.5 text-xs text-foreground bg-muted/40 hover:bg-muted/80 hover:border-primary/40 px-2.5 py-1 rounded-full border border-border/70 shadow-2xs transition-all cursor-pointer group"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-2xs group-hover:scale-125 transition-transform"
                          style={{
                            backgroundColor:
                              scheduleColorById.get(evt.id) || "hsl(160 72% 52%)",
                          }}
                        />
                        <span className="font-semibold text-xs text-foreground">
                          {evt.title}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="w-[280px] sm:w-[320px] max-w-[90vw] space-y-2 p-3 rounded-xl shadow-xl border border-border bg-popover text-popover-foreground">
                      <div className="flex items-start gap-2 font-bold text-xs leading-tight">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                          style={{
                            backgroundColor:
                              scheduleColorById.get(evt.id) || "hsl(160 72% 52%)",
                          }}
                        />
                        <span className="break-words break-all [overflow-wrap:anywhere]">{evt.title}</span>
                      </div>

                      {dateText && (
                        <p className="text-[11px] text-muted-foreground">
                          <strong className="text-foreground">Date:</strong> {dateText}
                          {endDateText ? ` – ${endDateText}` : ""}
                        </p>
                      )}

                      {evt.start_time && (
                        <p className="text-[11px] text-muted-foreground">
                          <strong className="text-foreground">Time:</strong> {evt.start_time.slice(0, 5)}
                          {evt.end_time ? ` – ${evt.end_time.slice(0, 5)}` : ""}
                        </p>
                      )}

                      {(evt.location || evt.barangay_name) && (
                        <p className="text-[11px] text-muted-foreground break-words break-all [overflow-wrap:anywhere]">
                          <strong className="text-foreground">Location:</strong> {evt.location || evt.barangay_name}
                        </p>
                      )}

                      {evt.description && (
                        <div className="pt-1.5 border-t border-border/60 max-h-36 overflow-y-auto pr-1">
                          <p className="text-[11px] text-muted-foreground/90 italic leading-relaxed break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
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
    </div>
  );
};

export default AdminCollectionCalendar;
