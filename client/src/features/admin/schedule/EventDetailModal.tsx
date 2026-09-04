import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  User,
  Info,
  X,
} from "lucide-react";
import { CalendarEvent, EventType, EventStatus } from "@/services/scheduleService";

interface EventDetailModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}

const categoryMeta: Record<EventType, { label: string; badge: string; icon: React.ElementType }> = {
  PRIVATE_EVENT: {
    label: "MENRO Private Event",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    icon: Lock,
  },
  COMMUNITY_EVENT: {
    label: "Public Community Event",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    icon: Users,
  },
  COLLECTION_SCHEDULE: {
    label: "Collection Route Schedule",
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

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!event) return null;

  const meta = categoryMeta[event.event_type] || categoryMeta.PRIVATE_EVENT;
  const Icon = meta.icon;
  const status = statusMeta[event.status] || statusMeta.UPCOMING;

  const eventDateObj = new Date(
    typeof event.event_date === "string" && !event.event_date.includes("T")
      ? event.event_date + "T00:00:00"
      : event.event_date
  );

  const formattedDate = !isNaN(eventDateObj.getTime())
    ? eventDateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : String(event.event_date);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-lg p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                Schedule Details
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Full overview of the scheduled event and visibility status.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 py-3">
          {/* Status & Title Card */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${meta.badge}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.label}</span>
              </Badge>

              <Badge
                variant="outline"
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${status.badge}`}
              >
                {status.label}
              </Badge>

              <span className="text-[11px] text-muted-foreground ml-auto">
                {event.visibility === "PRIVATE" ? "Hidden from Residents" : "Public on Resident Portal"}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-foreground font-display leading-snug">
              {event.title}
            </h3>
          </div>

          {/* Date & Time Bento Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span>Scheduled Date</span>
              </span>
              <p className="font-semibold text-foreground">{formattedDate}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Time Window</span>
              </span>
              <p className="font-semibold text-foreground">
                {event.start_time
                  ? `${event.start_time.slice(0, 5)} ${event.end_time ? `– ${event.end_time.slice(0, 5)}` : ""}`
                  : "All Day Schedule"}
              </p>
            </div>
          </div>

          {/* Location & Sector */}
          {(event.location || event.barangay_name) && (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Venue & Sector</span>
              </span>
              <p className="font-semibold text-foreground">
                {event.location || "Venue specified"}
                {event.barangay_name && ` · ${event.barangay_name}`}
              </p>
            </div>
          )}

          {/* Description */}
          {event.description ? (
            <div className="space-y-1.5 text-xs">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Notes & Agenda
              </span>
              <p className="text-xs text-foreground/90 leading-relaxed p-3 rounded-xl bg-background border border-border/80 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-background border border-border/60 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              <span>No additional description provided.</span>
            </div>
          )}

          {/* Creator Tag */}
          {event.creator_name && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/60">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Created by: <strong className="text-foreground">{event.creator_name}</strong></span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-border/60 gap-2">
          <Button
            type="button"
            variant="destructive-outline"
            onClick={() => onDelete(event)}
            className="h-10 px-4 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Delete</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                onClose();
                onEdit(event);
              }}
              className="h-10 px-5 rounded-xl text-xs font-semibold cursor-pointer gap-1.5 active:scale-95 shadow-xs"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Schedule</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
