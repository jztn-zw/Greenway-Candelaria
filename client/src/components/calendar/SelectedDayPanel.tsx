import React from "react";
import {
  Calendar as CalendarIcon,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarEvent } from "@/services/scheduleService";
import { cn } from "@/lib/utils";
import { formatDateOnly, getManilaNow } from "@/utils/date";

interface SelectedDayPanelProps {
  selectedDateStr: string;
  events: CalendarEvent[];
  scheduleColorById: Map<string, string>;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (event: CalendarEvent) => void;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
}

export const SelectedDayPanel: React.FC<SelectedDayPanelProps> = ({
  selectedDateStr,
  events,
  scheduleColorById,
  onEditEvent,
  onDeleteEvent,
  className,
  isLoading = false,
  error = null,
}) => {
  const dateObj = new Date(selectedDateStr + "T00:00:00");
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : selectedDateStr;
  const todayStr = getManilaNow().dateKey;
  const dateLabel = selectedDateStr === todayStr ? "Today" : selectedDateStr > todayStr ? "Upcoming" : "Past";
  const formatShortDate = (value: string) => formatDateOnly(value.split("T")[0], { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      className={cn(
        "bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col overflow-hidden min-h-[340px] max-h-[480px] lg:max-h-none lg:h-[620px]",
        className
      )}
    >
      {/* Header */}
      <div className="pb-3.5 mb-3.5 border-b border-border/60 shrink-0">
        <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
          {formattedDate}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isLoading ? "Loading internal events…" : error ? "Schedule unavailable" : `${events.length} internal event${events.length === 1 ? "" : "s"} on this date`}
        </p>
      </div>

      {/* List of Events */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1 overscroll-contain">
        {isLoading ? <p role="status" className="py-8 text-sm text-muted-foreground">Loading schedule…</p>
          : error ? <p role="alert" className="py-8 text-sm text-destructive">{error}</p>
          : events.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">No internal events scheduled</p>
              <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                {onEditEvent
                  ? 'Click "New Internal Schedule" above to add an event for admin and collectors.'
                  : "Admin has not added an internal event for this date."}
              </p>
            </div>
          </div>
        ) : (
          events.map((evt) => {
            const dateRange = evt.end_date
              ? `${formatShortDate(evt.event_date)} – ${formatShortDate(evt.end_date)}`
              : dateLabel;
            return (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl border border-border/80 bg-background shadow-2xs space-y-2.5 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: scheduleColorById.get(evt.id) || "hsl(160 72% 52%)" }} />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-tight break-words">
                        {evt.title}
                      </h4>
                  </div>

                  {onEditEvent && onDeleteEvent && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors" title="Schedule actions">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-28">
                        <DropdownMenuItem onClick={() => onEditEvent(evt)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteEvent(evt)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {evt.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                    {evt.description}
                  </p>
                )}

                <div className="flex text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                  <span>{dateRange}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
