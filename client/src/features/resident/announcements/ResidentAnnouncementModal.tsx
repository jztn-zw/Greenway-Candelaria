import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  X,
  CalendarClock,
  CalendarDays,
  Sparkles,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { toast } from "@/lib/toast";
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
  disableReadTracking?: boolean;
  headerTitle?: string;
  headerDescription?: string;
  showExactTime?: boolean;
  footerDetails?: React.ReactNode;
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

const formatAnnouncementTime = (dateStr?: string | null) => {
  if (!dateStr) return { relative: "Official Notice", full: "" };
  try {
    const normalized = /^\d{4}-\d{2}-\d{2}/.test(dateStr) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateStr)
      ? `${dateStr.replace(" ", "T")}Z`
      : dateStr;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return { relative: dateStr, full: dateStr };
    const datePart = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    });
    const full = `${datePart} at ${timePart}`;

    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 0) return { relative: full, full };
    if (diffSec < 60) return { relative: "Just now", full };

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return { relative: `${diffMin} ${diffMin === 1 ? "min" : "mins"} ago`, full };

    const diffHours = Math.floor(diffSec / 3600);
    if (diffHours < 24) return { relative: `${diffHours} ${diffHours === 1 ? "hr" : "hrs"} ago`, full };

    const diffDays = Math.floor(diffSec / 86400);
    if (diffDays === 1) return { relative: "Yesterday", full };
    if (diffDays < 7) return { relative: `${diffDays} days ago`, full };

    return { relative: datePart, full };
  } catch {
    return { relative: dateStr, full: dateStr };
  }
};

const categoryConfig: Record<
  AnnouncementType,
  {
    icon: React.ElementType;
    iconBg: string;
    iconText: string;
    iconBorder: string;
  }
> = {
  "Schedule Change": {
    icon: CalendarClock,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    iconText: "text-emerald-600 dark:text-emerald-400",
    iconBorder: "border-emerald-500/25",
  },
  "Holiday Reminder": {
    icon: CalendarDays,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconText: "text-amber-600 dark:text-amber-400",
    iconBorder: "border-amber-500/25",
  },
  "Community Event": {
    icon: Sparkles,
    iconBg: "bg-violet-500/10 dark:bg-violet-500/20",
    iconText: "text-violet-600 dark:text-violet-400",
    iconBorder: "border-violet-500/25",
  },
  "Emergency Advisory": {
    icon: AlertTriangle,
    iconBg: "bg-rose-500/10 dark:bg-rose-500/20",
    iconText: "text-rose-600 dark:text-rose-400",
    iconBorder: "border-rose-500/25",
  },
  "System Maintenance": {
    icon: Wrench,
    iconBg: "bg-sky-500/10 dark:bg-sky-500/20",
    iconText: "text-sky-600 dark:text-sky-400",
    iconBorder: "border-sky-500/25",
  },
  "General Notice": {
    icon: Megaphone,
    iconBg: "bg-primary/10",
    iconText: "text-primary",
    iconBorder: "border-primary/20",
  },
};

const ResidentAnnouncementModal: React.FC<ResidentAnnouncementModalProps> = ({
  open,
  onOpenChange,
  announcementId,
  initialAnnouncement,
  notification,
  onMarkRead,
  disableReadTracking = false,
  headerTitle = "Announcement",
  headerDescription = "MENRO Candelaria Official Notice",
  showExactTime = false,
  footerDetails,
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

    if (!disableReadTracking && notification && !notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }

    if (initialAnnouncement?.id === targetId) {
      // The notification page preloads this detail before opening the modal.
      // This avoids a second request and lets every field render immediately.
      setAnnouncement(initialAnnouncement);
      if (!disableReadTracking && targetId) {
        void markAnnouncementAsRead(targetId).catch(() => {});
      }
    } else if (targetId) {
      // Render the notification's title and body immediately. The full
      // announcement only adds metadata, so it can load in the background.
      setAnnouncement(null);
      void (async () => {
        try {
          if (!disableReadTracking) {
            void markAnnouncementAsRead(targetId).catch(() => {});
          }
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
  }, [open, announcementId, initialAnnouncement, notification, onMarkRead, targetId, disableReadTracking]);

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

  const announcementTime = formatAnnouncementTime(createdAt);
  const activeCategory = mappedType ? categoryConfig[mappedType] : null;
  const CategoryIcon = activeCategory?.icon || Megaphone;
  const iconBg = activeCategory?.iconBg || "bg-primary/10";
  const iconText = activeCategory?.iconText || "text-primary";
  const iconBorder = activeCategory?.iconBorder || "border-primary/20";

  const handleClose = () => {
    if (!disableReadTracking && notification && !notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 text-left shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl ${iconBg} ${iconText} border ${iconBorder} flex items-center justify-center shrink-0 shadow-2xs`}
            >
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm sm:text-base font-bold font-display text-foreground tracking-tight truncate">
                {headerTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                {headerDescription}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 py-4 space-y-3 text-left overflow-y-auto max-h-[calc(85vh-130px)] scrollbar-thin">
          {/* Title, Category & Date Lockup (No container) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold font-display text-foreground leading-snug tracking-tight break-words [overflow-wrap:anywhere]">
                {title}
              </h3>
              {mappedType ? (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border shrink-0 ${
                    announcementTypeStyles[mappedType]
                  }`}
                >
                  {mappedType}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold rounded-md px-2 py-0.5 border shrink-0 border-primary/30 text-primary bg-primary/10"
                >
                  Official Notice
                </Badge>
              )}
            </div>
            <p
              className="text-xs text-muted-foreground font-normal cursor-default"
              title={announcementTime.full}
            >
              <span>{showExactTime ? announcementTime.full : announcementTime.relative}</span>
            </p>
          </div>

          {/* Description container */}
          <div className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-muted/20 border border-border/60 rounded-xl p-3.5 sm:p-4 max-h-[38vh] overflow-y-auto scrollbar-thin">
            {body || "No additional details or instructions provided."}
          </div>
        </div>

        {footerDetails && (
          <div className="px-5 pb-3.5 text-left shrink-0">{footerDetails}</div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
          <Button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto h-9 px-6 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResidentAnnouncementModal;
