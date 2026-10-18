import { getCategoryBadgeColors,getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import React from "react";
import { AdminModalContent as DialogContent } from "@/components/admin/AdminModal";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogHeader } from "@/components/dialogs/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
CalendarDays,
Lock,
Users,
Truck,
SquarePen,
Trash2,
User,
Info,
} from "lucide-react";
import { CalendarEvent,EventType,EventStatus } from "@/services/scheduleService";

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
    badge: getCategoryBadgeColors("MENRO Private Event").className,
    icon: Lock,
  },
  COMMUNITY_EVENT: {
    label: "Public Community Event",
    badge: getCategoryBadgeColors("Public Community Event").className,
    icon: Users,
  },
  COLLECTION_SCHEDULE: {
    label: "Collection Route Schedule",
    badge: getCategoryBadgeColors("Collection Route Schedule").className,
    icon: Truck,
  },
};

const statusMeta: Record<EventStatus, { label: string; badge: string }> = {
  UPCOMING: { label: "Upcoming", badge: getStatusBadgeStyle("Upcoming").className },
  ONGOING: { label: "In Progress", badge: getStatusBadgeStyle("In Progress").className },
  COMPLETED: { label: "Completed", badge: getStatusBadgeStyle("Completed").className },
  CANCELLED: { label: "Cancelled", badge: getStatusBadgeStyle("Cancelled").className },
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
  const endDateObj = event.end_date
    ? new Date(event.end_date.includes("T") ? event.end_date : `${event.end_date}T00:00:00`)
    : null;
  const formattedEndDate = endDateObj && !isNaN(endDateObj.getTime())
    ? endDateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 text-left sm:max-w-lg [&>button:last-child]:hidden">
        {/* Header */}
        <FormDialogHeader title="Schedule Details" description="Full overview of the scheduled event and visibility status."
          icon={<CalendarDays />} onClose={onClose} closeLabel="Close schedule details" />

        {/* Content */}
        <div className="gw-modal-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
          {/* Status & Title Card */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-ui-caption font-semibold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${meta.badge}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.label}</span>
              </Badge>

              <Badge
                variant="outline"
                className={`text-ui-caption font-semibold px-2 py-0.5 rounded-md border ${status.badge}`}
              >
                {status.label}
              </Badge>

              <span className="text-ui-caption text-muted-foreground ml-auto">
                {event.visibility === "PRIVATE" ? "MENRO Only" : event.visibility === "SHARED" ? "MENRO & Residents" : "Residents Only"}
              </span>
            </div>

            <h3 className="gw-heading text-base sm:text-lg text-foreground leading-snug">
              {event.title}
            </h3>
          </div>

          {/* Date range */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs">
            <div className="space-y-1">
              <span className="text-ui-overline font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                 <span>{formattedEndDate ? "Date Range" : "Scheduled Date"}</span>
              </span>
               <p className="font-semibold text-foreground">{formattedDate}{formattedEndDate ? ` – ${formattedEndDate}` : ""}</p>
             </div>
          </div>

          {/* Description */}
          {event.description ? (
            <div className="space-y-1.5 text-xs">
              <span className="text-ui-overline font-semibold text-muted-foreground uppercase tracking-wider">
                Notes & Agenda
              </span>
              <p className="text-xs text-foreground/90 leading-relaxed p-3 rounded-xl bg-background border border-border/80 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
            <div className="flex items-center gap-2 text-ui-caption text-muted-foreground pt-1 border-t border-border/60">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Created by: <strong className="text-foreground">{event.creator_name}</strong></span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gw-modal-footer flex shrink-0 flex-wrap items-center justify-between border-t border-border/60 gap-2">
          <Button
            type="button"
            variant="destructive-outline"
            onClick={() => onDelete(event)}
            className="h-8 max-w-full px-2 sm:h-9 sm:px-3 text-xs gap-1 [&_svg]:size-3.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </Button>

          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 max-w-full px-2 sm:h-9 sm:px-3 rounded-xl text-xs font-semibold"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                onClose();
                onEdit(event);
              }}
              className="h-8 max-w-full px-2 sm:h-9 sm:px-3 rounded-xl text-xs font-semibold gap-1 [&_svg]:size-3.5"
            >
              <SquarePen className="w-3.5 h-3.5" />
              <span>Edit Schedule</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
