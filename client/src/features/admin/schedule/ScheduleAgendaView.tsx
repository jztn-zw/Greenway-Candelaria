import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  MapPin,
  Lock,
  Users,
  Truck,
  Edit2,
  Trash2,
  Eye,
} from "lucide-react";
import { CalendarEvent, EventType, EventStatus } from "@/services/scheduleService";

interface ScheduleAgendaViewProps {
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

export const ScheduleAgendaView: React.FC<ScheduleAgendaViewProps> = ({
  events,
  onViewEvent,
  onEditEvent,
  onDeleteEvent,
}) => {
  if (events.length === 0) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">No events found</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            No schedule matches your active filters or search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div>
          <h3 className="text-sm font-bold text-foreground font-display">
            Chronological Agenda ({events.length})
          </h3>
          <p className="text-[11px] text-muted-foreground">
            All active schedules sorted by date and time
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {events.map((evt) => {
          const meta = categoryMeta[evt.event_type] || categoryMeta.PRIVATE_EVENT;
          const Icon = meta.icon;
          const st = statusMeta[evt.status] || statusMeta.UPCOMING;

          const dateObj = new Date(
            typeof evt.event_date === "string" && !evt.event_date.includes("T")
              ? evt.event_date + "T00:00:00"
              : evt.event_date
          );

          const dateLabel = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                weekday: "short",
              })
            : String(evt.event_date);

          return (
            <div
              key={evt.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-muted/30 -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                {/* Date Badge */}
                <div className="w-14 shrink-0 text-center p-1.5 rounded-xl bg-muted/60 border border-border/80 text-xs">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    {dateLabel.split(",")[0]}
                  </span>
                  <span className="font-extrabold text-foreground font-display text-sm">
                    {dateLabel.split(",")[1] || dateLabel}
                  </span>
                </div>

                {/* Category Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${meta.badge}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Event Info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {evt.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-semibold px-1.5 py-0 rounded border ${meta.badge}`}
                    >
                      {meta.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-semibold px-1.5 py-0 rounded border ${st.badge}`}
                    >
                      {st.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                    {evt.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        {evt.start_time.slice(0, 5)} {evt.end_time ? `– ${evt.end_time.slice(0, 5)}` : ""}
                      </span>
                    )}
                    {(evt.location || evt.barangay_name) && (
                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin className="w-3 h-3 text-primary" />
                        {evt.barangay_name ? `${evt.barangay_name}` : evt.location}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/80">
                      {evt.visibility === "PRIVATE" ? "Hidden from Residents" : "Public to Residents"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewEvent(evt)}
                  className="h-8 px-2.5 text-xs rounded-xl text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditEvent(evt)}
                  className="h-8 px-2.5 text-xs rounded-xl cursor-pointer gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteEvent(evt)}
                  className="h-8 px-2 text-xs rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  title="Delete event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
