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

interface SelectedDayPanelProps {
  selectedDateStr: string;
  events: CalendarEvent[];
  scheduleColorById: Map<string, string>;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
}

export const SelectedDayPanel: React.FC<SelectedDayPanelProps> = ({
  selectedDateStr,
  events,
  scheduleColorById,
  onEditEvent,
  onDeleteEvent,
}) => {
  const dateObj = new Date(selectedDateStr + "T00:00:00");
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : selectedDateStr;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const dateLabel = selectedDateStr === todayStr ? "Today" : selectedDateStr > todayStr ? "Upcoming" : "Past";
  const formatShortDate = (value: string) => new Date(`${value.split("T")[0]}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col h-[620px] max-h-[72vh] overflow-hidden">
      {/* Header */}
      <div className="pb-3.5 mb-3.5 border-b border-border/60">
        <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
          {formattedDate}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {events.length} schedule{events.length === 1 ? "" : "s"} assigned to this date
        </p>
      </div>

      {/* List of Events */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1 overscroll-contain">
        {events.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">No events on this day</p>
              <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                Click "New Schedule / Event" above to create an internal task or public drive.
              </p>
            </div>
          </div>
        ) : (
          events.map((evt) => {
            const dateRange = evt.end_date
              ? `${selectedDateStr === todayStr ? "Today" : formatShortDate(evt.event_date)} – ${formatShortDate(evt.end_date)}`
              : dateLabel;
            return (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl border border-border/80 bg-background shadow-2xs space-y-2.5 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: scheduleColorById.get(evt.id) || "hsl(160 72% 52%)" }} />
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                        {evt.title}
                      </h4>
                  </div>

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
