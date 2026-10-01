import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { FormDialogHeader } from "@/components/FormDialog";
import { formDialogStyles as modalStyles } from "@/components/formDialogStyles";
import { useResidentQuery, useResidentMutation } from "@/lib/residentQuery";
import React, { useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
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
  const targetId = announcementId || (notification?.ref_module === "announcements" ? notification.ref_id : null);
  const query = useResidentQuery("announcements", ["detail", targetId], () => fetchAnnouncementById(targetId!),
    { enabled: open && !!targetId && !disableReadTracking });
  const displayAnnouncement = (query.data as unknown as AnnouncementDetail | undefined) ?? (initialAnnouncement?.id === targetId ? initialAnnouncement : null);
  const markRead = useResidentMutation(markAnnouncementAsRead);
  const readId = useRef<string | null>(null);
  const notificationReadId = useRef<string | null>(null);
  useEffect(() => {
    if (!open) { readId.current = null; notificationReadId.current = null; return; }
    if (disableReadTracking) return;
    if (targetId && query.isSuccess && readId.current !== targetId) {
      readId.current = targetId;
      void markRead(targetId).catch(() => { readId.current = null; });
    }
    if (notification && !notification.is_read && onMarkRead && notificationReadId.current !== notification.id) {
      notificationReadId.current = notification.id;
      onMarkRead(notification.id);
    }
  }, [open, targetId, disableReadTracking, markRead, notification, onMarkRead, query.isSuccess]);
  useEffect(() => {
    const status = (query.error as { response?: { status?: number } } | null)?.response?.status;
    if (open && (status === 403 || status === 404)) {
      toast.info("This announcement is no longer available.");
      onOpenChange(false);
    }
  }, [query.error, open, onOpenChange]);

  if (!open) return null;

  // Resolve display values
  const title = (displayAnnouncement?.title || notification?.title || "Official Announcement")
    .replace(/🚨|⚠️|⚠/g, "")
    .trim();
  const body = displayAnnouncement?.body || notification?.body || "";
  const createdAt = displayAnnouncement?.sent_at || displayAnnouncement?.created_at || notification?.created_at;

  // A notification has no announcement category. Do not temporarily label it
  // as "General Notice" while the full announcement is loading.
  const hasLoadedDetails = Boolean(displayAnnouncement && displayAnnouncement.id === targetId);
  const loadingDetails = !disableReadTracking && !hasLoadedDetails && query.isLoading;
  const detailsError = !disableReadTracking && query.isError;
  const mappedType = hasLoadedDetails
    ? mapToAnnouncementType(displayAnnouncement?.type)
    : null;

  const announcementTime = formatAnnouncementTime(createdAt);
  const activeCategory = mappedType ? categoryConfig[mappedType] : null;
  const CategoryIcon = activeCategory?.icon || Megaphone;
  const iconText = activeCategory?.iconText || "text-primary";

  const handleClose = () => {
    if (!disableReadTracking && notification && !notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={modalStyles.content}>
        <FormDialogHeader title={headerTitle} description={headerDescription} icon={<CategoryIcon className={iconText} />} onClose={handleClose} />
        {/* Modal Body */}
        <div className={modalStyles.body}>
          {loadingDetails && <p role="status" className="text-xs text-muted-foreground">Loading announcement…</p>}
          {detailsError && <div role="alert" className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3.5">
            <p className="text-xs leading-relaxed text-destructive">Announcement details could not be loaded. Please try again.</p>
            <Button type="button" variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()} className={modalStyles.cancelButton}>Retry</Button>
          </div>}
          {/* Title, Category & Date Lockup (No container) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="gw-heading text-base text-foreground leading-snug tracking-tight break-words [overflow-wrap:anywhere]">
                {title}
              </h3>
              {mappedType ? (
                <Badge
                  variant="outline"
                  className={`text-ui-overline font-semibold rounded-md px-2 py-0.5 border shrink-0 ${
                    announcementTypeStyles[mappedType]
                  }`}
                >
                  {mappedType}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={"text-ui-overline font-semibold rounded-md px-2 py-0.5 border shrink-0 " + getCategoryBadgeColors("Official Notice").className}
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
          {(body || (!loadingDetails && !detailsError)) && <div className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-muted/20 border border-border/60 rounded-md p-3.5 max-h-[38vh] overflow-y-auto scrollbar-thin">
            {body || "No additional details or instructions provided."}
          </div>}
        </div>

        {footerDetails && (
          <div className="px-5 pb-3.5 text-left shrink-0">{footerDetails}</div>
        )}

        {/* Modal Footer */}
        <div className={modalStyles.footer}>
          <Button
            type="button"
            onClick={handleClose}
            className={modalStyles.primaryButton}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResidentAnnouncementModal;
