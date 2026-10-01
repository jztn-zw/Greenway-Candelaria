import { getCategoryBadgeColors, getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
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
    badge: getCategoryBadgeColors("MENRO Private").className,
    icon: Lock,
  },
  COMMUNITY_EVENT: {
    label: "Public Community",
    badge: getCategoryBadgeColors("Public Community").className,
    icon: Users,
  },
  COLLECTION_SCHEDULE: {
    label: "Collection Route",
    badge: getCategoryBadgeColors("Collection Route").className,
    icon: Truck,
  },
};

const statusMeta: Record<EventStatus, { label: string; badge: string }> = {
  UPCOMING: { label: "Upcoming", badge: getStatusBadgeStyle("Upcoming").className },
  ONGOING: { label: "In Progress", badge: getStatusBadgeStyle("In Progress").className },
  COMPLETED: { label: "Completed", badge: getStatusBadgeStyle("Completed").className },
  CANCELLED: { label: "Cancelled", badge: getStatusBadgeStyle("Cancelled").className },
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
          <h3 className="gw-heading text-sm text-foreground">No events found</h3>
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
          <h3 className="gw-heading text-sm text-foreground ">
            Chronological Agenda ({events.length})
          </h3>
          <p className="text-ui-caption text-muted-foreground">
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
          const endDateLabel = evt.end_date
            ? new Date(evt.end_date.includes("T") ? evt.end_date : `${evt.end_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : null;

          return (
            <div
              key={evt.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-muted/30 -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                {/* Date Badge */}
                <div className="w-14 shrink-0 text-center p-1.5 rounded-xl bg-muted/60 border border-border/80 text-xs">
                  <span className="text-ui-overline uppercase font-bold text-muted-foreground block">
                    {dateLabel.split(",")[0]}
                  </span>
                  <span className="font-semibold text-foreground font-body tabular-nums text-sm">
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
                    <h4 className="gw-heading text-xs sm:text-sm text-foreground truncate">
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

                  <div className="flex items-center gap-3 text-ui-caption text-muted-foreground mt-1 flex-wrap">
                    {endDateLabel && <span>{dateLabel} – {endDateLabel}</span>}
                    {evt.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        {evt.start_time.slice(0, 5)} {evt.end_time ? `– ${evt.end_time.slice(0, 5)}` : ""}
                      </span>
                    )}
                    <span className="text-ui-overline text-muted-foreground/80">
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
                  className="h-8 px-2.5 text-xs rounded-xl cursor-pointer gap-1"
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
                  variant="destructive-ghost"
                  onClick={() => onDeleteEvent(evt)}
                  className="h-8 px-2 text-xs rounded-xl cursor-pointer"
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
