import React from "react";
import {
  Calendar as CalendarIcon,
  Clock3,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
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
import { SelectedDayEventsSkeleton } from "@/components/PageLoadingSkeletons";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";

interface SelectedDayPanelProps {
  selectedDateStr: string;
  events: CalendarEvent[];
  scheduleColorById: Map<string, string>;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (event: CalendarEvent) => void;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
  variant?: "default" | "admin";
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
  variant = "default",
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
  const isAdmin = variant === "admin";

  return (
    <div
      className={cn(
        "bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col overflow-hidden min-h-[340px] max-h-[480px] lg:max-h-none lg:h-[620px]",
        className
      )}
    >
      {/* Header */}
      <div className={cn("pb-3.5 mb-3.5 border-b border-border/60 shrink-0", isAdmin && "flex items-center gap-3")}>
        {isAdmin && (
          <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary" aria-hidden="true">
            <span className="text-[9px] font-semibold uppercase leading-none">{dateObj.toLocaleDateString("en-US", { month: "short" })}</span>
            <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">{dateObj.getDate()}</span>
          </div>
        )}
        <div className="min-w-0">
          {isAdmin && <p className="mb-1 text-ui-overline font-medium text-muted-foreground">Selected day</p>}
          <h3 className="gw-heading text-sm sm:text-base text-foreground">
            {formattedDate}
          </h3>
          <p className="text-ui-caption text-muted-foreground mt-0.5">
            {isLoading ? "Loading internal events…" : error ? "Schedule unavailable" : `${events.length} internal event${events.length === 1 ? "" : "s"} on this date`}
          </p>
        </div>
      </div>

      {/* List of Events */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1 overscroll-contain">
        {isLoading ? <SelectedDayEventsSkeleton />
          : error ? <p role="alert" className="py-8 text-sm text-destructive">{error}</p>
          : events.length === 0 ? (
          <div className={cn("text-center space-y-2", isAdmin ? "py-8" : "py-16")}>
            <div className="w-11 h-11 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">No internal events scheduled</p>
              <p className="text-ui-caption text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
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
                className={cn("p-3.5 rounded-xl border border-border/80 bg-background shadow-2xs space-y-2.5", isAdmin ? "bg-muted/40 border-l-[3px]" : "hover:border-primary/30 transition-all group")}
                style={isAdmin ? { borderLeftColor: scheduleColorById.get(evt.id) || "hsl(var(--chart-1))" } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                      {!isAdmin && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: scheduleColorById.get(evt.id) || "hsl(var(--chart-1))" }} />}
                      <h4 className="gw-heading text-xs sm:text-sm text-foreground leading-tight break-words">
                        {evt.title}
                      </h4>
                  </div>

                  {onEditEvent && onDeleteEvent && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="gw-action-ghost w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors" title="Schedule actions">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-28">
                        <DropdownMenuItem onClick={() => onEditEvent(evt)} className="gap-2">
                          <Pencil className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteEvent(evt)} className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2">
                          <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {isAdmin && (
                  <div className="space-y-2">
                    <Badge className={cn("text-ui-overline", getStatusBadgeStyle(evt.status).className)}>
                      {evt.status === "ONGOING" ? "In progress" : evt.status.charAt(0) + evt.status.slice(1).toLowerCase()}
                    </Badge>
                    {(evt.start_time || evt.location || evt.barangay_name) && (
                      <div className="space-y-1.5 text-ui-caption text-muted-foreground">
                        {evt.start_time && <p className="flex items-start gap-2"><Clock3 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{evt.start_time.slice(0, 5)}{evt.end_time ? ` – ${evt.end_time.slice(0, 5)}` : ""}</span></p>}
                        {(evt.location || evt.barangay_name) && <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{evt.location || evt.barangay_name}</span></p>}
                      </div>
                    )}
                  </div>
                )}

                {evt.description && (
                  <p className="text-ui-caption text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                    {evt.description}
                  </p>
                )}

                <div className="flex text-ui-overline text-muted-foreground pt-2 border-t border-border/40">
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
