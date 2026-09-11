import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Send, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatRelativeTime } from "@/utils/date";
import {
  fetchAnnouncementById,
  markAsRead as markAnnouncementAsRead,
} from "@/services/announcementsService";
import {
  announcementTypeStyles,
  AnnouncementType,
} from "@/features/admin/announcements/types";
import type { NotificationRow } from "@/services/notificationsService";

interface ResidentAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcementId?: string | null;
  initialAnnouncement?: AnnouncementDetail | null;
  notification?: NotificationRow | null;
  onMarkRead?: (id: string) => void;
}

export interface AnnouncementDetail {
  id: string;
  title: string;
  body: string;
  type: string;
  target_all?: boolean;
  barangays?: { id: string; name: string }[];
  pinned?: boolean;
  created_at?: string;
  sent_at?: string | null;
  expires_at?: string | null;
  created_by_name?: string;
}

const mapToAnnouncementType = (rawType?: string): AnnouncementType => {
  const t = (rawType || "").toUpperCase().replace(/\s+/g, "_");
  switch (t) {
    case "SCHEDULE_CHANGE":
      return "Schedule Change";
    case "HOLIDAY_REMINDER":
      return "Holiday Reminder";
    case "COMMUNITY_EVENT":
      return "Community Event";
    case "EMERGENCY_ADVISORY":
      return "Emergency Advisory";
    case "SYSTEM_MAINTENANCE":
      return "System Maintenance";
    case "GENERAL_NOTICE":
    default:
      return "General Notice";
  }
};

const formatDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    const normalized = /^\d{4}-\d{2}-\d{2}/.test(dateStr) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateStr)
      ? `${dateStr.replace(" ", "T")}Z`
      : dateStr;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
  } catch {
    return dateStr;
  }
};

const ResidentAnnouncementModal: React.FC<ResidentAnnouncementModalProps> = ({
  open,
  onOpenChange,
  announcementId,
  initialAnnouncement,
  notification,
  onMarkRead,
}) => {
  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const targetId =
    announcementId ||
    (notification?.ref_module === "announcements" ? notification.ref_id : null);
  const displayAnnouncement =
    initialAnnouncement?.id === targetId ? initialAnnouncement : announcement;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    if (notification && !notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }

    if (initialAnnouncement?.id === targetId) {
      // The notification page preloads this detail before opening the modal.
      // This avoids a second request and lets every field render immediately.
      setAnnouncement(initialAnnouncement);
      if (targetId) void markAnnouncementAsRead(targetId).catch(() => {});
    } else if (targetId) {
      // Render the notification's title and body immediately. The full
      // announcement only adds metadata, so it can load in the background.
      setAnnouncement(null);
      void (async () => {
        try {
          void markAnnouncementAsRead(targetId).catch(() => {});
          const data = await fetchAnnouncementById(targetId);
          if (!cancelled) {
            setAnnouncement(data as unknown as AnnouncementDetail);
          }
        } catch {
          if (cancelled) return;
          setAnnouncement(null);
          toast.info("This announcement is no longer available.");
          onOpenChange(false);
        }
      })();
    } else {
      setAnnouncement(null);
    }

    return () => {
      cancelled = true;
    };
  }, [open, announcementId, initialAnnouncement, notification, onMarkRead, targetId]);

  if (!open) return null;

  // Resolve display values
  const title = (displayAnnouncement?.title || notification?.title || "Official Announcement")
    .replace(/[🚨⚠️]/g, "")
    .trim();
  const body = displayAnnouncement?.body || notification?.body || "";
  const createdAt = displayAnnouncement?.sent_at || displayAnnouncement?.created_at || notification?.created_at;

  // A notification has no announcement category. Do not temporarily label it
  // as "General Notice" while the full announcement is loading.
  const hasLoadedDetails = Boolean(displayAnnouncement && displayAnnouncement.id === targetId);
  const mappedType = hasLoadedDetails
    ? mapToAnnouncementType(displayAnnouncement?.type)
    : null;

  const formattedSent = formatDateOnly(createdAt);
  const relativeTime = formatRelativeTime(createdAt, {
    dateOptions: { month: "short", day: "numeric", year: "numeric" },
  });

  const formatTargetAudience = (
    targetAll?: boolean,
    barangays?: { id: string; name: string }[],
  ) => {
    if (targetAll || !barangays || barangays.length === 0) {
      return {
        text: "All Residents",
        extraCount: 0,
        full: "All Residents",
      };
    }
    const names = barangays.map((b) => b.name);
    if (names.length <= 2) {
      return {
        text: names.join(", "),
        extraCount: 0,
        full: names.join(", "),
      };
    }
    const firstTwo = names.slice(0, 2).join(", ");
    const remaining = names.length - 2;
    return {
      text: firstTwo,
      extraCount: remaining,
      full: names.join(", "),
    };
  };

  const targetAudience = formatTargetAudience(
    displayAnnouncement?.target_all,
    displayAnnouncement?.barangays,
  );

  const handleClose = () => {
    if (notification && !notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-md max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-background [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header - Identical to Admin Announcement Modal */}
        <div className="p-4 sm:p-5 pb-3.5 border-b border-border/60 flex items-center justify-between gap-3 text-left shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight truncate">
                Announcement Details
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                MENRO Candelaria Official Notice
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 pt-3 sm:pt-3.5 space-y-3 text-left overflow-y-auto max-h-[calc(90vh-80px)] scrollbar-thin">
            {/* Notice Card simulating resident feed item */}
            <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 space-y-2.5 shadow-2xs min-w-0 overflow-hidden break-words">
              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                {mappedType && (
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${
                      announcementTypeStyles[mappedType]
                    }`}
                  >
                    {mappedType}
                  </Badge>
                )}


              </div>

              {/* Title & Body */}
              <h3 className="text-base sm:text-lg font-bold font-display text-foreground leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word]">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] max-h-[45vh] overflow-y-auto scrollbar-thin">
                {body}
              </p>

              {/* Sent Timestamp */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2.5 border-t border-border/60 min-w-0">
                <Send className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {formattedSent
                    ? `Broadcast on ${formattedSent}${relativeTime ? ` • ${relativeTime}` : ""}`
                    : "Official Broadcast"}
                </span>
              </div>
            </div>

            {/* Delivery Metadata Strip */}
            <div className="rounded-xl bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground shrink-0">Target Audience:</span>
                <div
                  className="flex items-center gap-1.5 min-w-0 max-w-[240px] justify-end"
                  title={targetAudience.full}
                >
                  <span className="text-foreground/85 font-medium truncate">
                    {targetAudience.text}
                  </span>
                  {targetAudience.extraCount > 0 && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0 leading-none shadow-2xs">
                      +{targetAudience.extraCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-0.5">
              <Button
                type="button"
                onClick={handleClose}
                className="w-full h-9 rounded-xl text-xs font-semibold cursor-pointer active:scale-[0.98]"
              >
                Close
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResidentAnnouncementModal;
