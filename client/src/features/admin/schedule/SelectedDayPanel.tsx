import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Lock,
  Users,
  Truck,
  MapPin,
  Clock,
  Trash2,
  Edit2,
  Eye,
} from "lucide-react";
import { CalendarEvent, EventType, EventStatus } from "@/services/scheduleService";

interface SelectedDayPanelProps {
  selectedDateStr: string;
  events: CalendarEvent[];
  onViewEvent: (event: CalendarEvent) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (event: CalendarEvent) => void;
}

const categoryMeta: Record<EventType, { label: string; badge: string; icon: React.ElementType }> = {
  PRIVATE_EVENT: {
    label: "MENRO Private",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    icon: Lock,
  },
  COMMUNITY_EVENT: {
    label: "Public Community",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    icon: Users,
  },
  COLLECTION_SCHEDULE: {
    label: "Collection Route",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    icon: Truck,
  },
};

const statusMeta: Record<EventStatus, { label: string; badge: string }> = {
  UPCOMING: { label: "Upcoming", badge: "bg-primary/10 text-primary border-primary/20" },
  ONGOING: { label: "In Progress", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  COMPLETED: { label: "Completed", badge: "bg-muted text-muted-foreground border-border" },
  CANCELLED: { label: "Cancelled", badge: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const SelectedDayPanel: React.FC<SelectedDayPanelProps> = ({
  selectedDateStr,
  events,
  onViewEvent,
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

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-start min-h-[460px]">
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
      <div className="space-y-3 flex-1">
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
            const meta = categoryMeta[evt.event_type] || categoryMeta.PRIVATE_EVENT;
            const Icon = meta.icon;
            const st = statusMeta[evt.status] || statusMeta.UPCOMING;

            return (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl border border-border/80 bg-background shadow-2xs space-y-2.5 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${meta.badge}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-tight truncate">
                        {evt.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded border ${meta.badge}`}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          · {evt.visibility === "PRIVATE" ? "Hidden from Residents" : "Public to Residents"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onViewEvent(evt)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditEvent(evt)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                      title="Edit event"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(evt)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {evt.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {evt.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-2 border-t border-border/40">
                  {evt.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>{evt.start_time.slice(0, 5)} {evt.end_time ? `– ${evt.end_time.slice(0, 5)}` : ""}</span>
                    </span>
                  )}
                  {(evt.location || evt.barangay_name) && (
                    <span className="flex items-center gap-1 truncate max-w-[170px]">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>{evt.barangay_name ? `${evt.barangay_name}` : evt.location}</span>
                    </span>
                  )}
                  <span className={`ml-auto text-[9px] px-1.5 py-0.2 rounded border font-semibold ${st.badge}`}>
                    {st.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
