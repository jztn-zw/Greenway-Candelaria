import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import React from "react";
import {
  Calendar,
  Clock,
  Send,
  AlertTriangle,
  Megaphone,
  Shield,
  SquarePen,
  Trash2,
  Copy,
  Archive,
  ArchiveRestore,
  RotateCcw,
  MoreHorizontal,
  Eye,
  Users,
  BarChart3,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Announcement,
  AnnouncementType,
  AnnouncementStatus,
  announcementTypeStyles,
  isAnnouncementExpired,
} from "./types";

/* ─── Type Configuration ─── */
const typeConfig: Record<
  AnnouncementType,
  {
    badge: string;
    surface: string;
    icon: React.ElementType;
  }
> = {
  "Schedule Change": {
    badge: announcementTypeStyles["Schedule Change"],
    surface: "bg-emerald-900",
    icon: Calendar,
  },
  "Holiday Reminder": {
    badge: announcementTypeStyles["Holiday Reminder"],
    surface: "bg-amber-900",
    icon: Calendar,
  },
  "Emergency Advisory": {
    badge: announcementTypeStyles["Emergency Advisory"],
    surface: "bg-red-900",
    icon: AlertTriangle,
  },
  "General Notice": {
    badge: announcementTypeStyles["General Notice"],
    surface: "bg-forest",
    icon: Megaphone,
  },
  "System Maintenance": {
    badge: announcementTypeStyles["System Maintenance"],
    surface: "bg-slate-800",
    icon: Shield,
  },
  "Community Event": {
    badge: announcementTypeStyles["Community Event"],
    surface: "bg-slate-800",
    icon: Calendar,
  },
};

const statusConfig: Record<
  AnnouncementStatus,
  { badge: string; icon: React.ElementType }
> = {
  Draft: {
    badge: getStatusBadgeStyle("Draft").className,
    icon: Lock,
  },
  Scheduled: {
    badge: getStatusBadgeStyle("Scheduled").className,
    icon: Clock,
  },
  Active: {
    badge: getStatusBadgeStyle("Active").className,
    icon: Globe,
  },
  Archived: {
    badge: getStatusBadgeStyle("Archived").className,
    icon: Archive,
  },
};

const formatScheduledDateTime = (value: string) => {
  const normalized = /^\d{4}-\d{2}-\d{2}/.test(value) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "Asia/Manila",
  });
};

interface Props {
  compact?: boolean;
  ann: Announcement;
  onPreview: (ann: Announcement) => void;
  onEdit: (ann: Announcement) => void;
  onDuplicate: (ann: Announcement) => void;
  onResend: (ann: Announcement) => void;
  onSendNow: (ann: Announcement) => void;
  onArchive: (ann: Announcement) => void;
  onDelete: (ann: Announcement) => void;
  onCancelSchedule: (ann: Announcement) => void;
  onReadReceipt: (ann: Announcement) => void;
}

const AnnouncementCard = ({
  compact = false,
  ann,
  onPreview,
  onEdit,
  onDuplicate,
  onResend,
  onSendNow,
  onArchive,
  onDelete,
  onCancelSchedule,
  onReadReceipt,
}: Props) => {
  const typeStyle = typeConfig[ann.type] || typeConfig["General Notice"];
  const TypeIcon = typeStyle.icon;
  const statusStyle = statusConfig[ann.status] || statusConfig.Draft;
  const readPct =
    ann.totalRecipients > 0
      ? Math.round((ann.readCount / ann.totalRecipients) * 100)
      : 0;
  const needsExpiryUpdateBeforeRestore =
    ann.status === "Archived" && isAnnouncementExpired(ann.expiryDate);

  const renderMenuItems = () => {
    switch (ann.status) {
      case "Draft":
        return (
          <>
            <DropdownMenuItem
              onClick={() => onEdit(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <SquarePen className="size-3.5 shrink-0" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDuplicate(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <Copy className="size-3.5 shrink-0" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSendNow(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <Send className="size-3.5 shrink-0" /> Send Now
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
              onClick={() => onDelete(ann)}
            >
              <Archive className="size-3.5 shrink-0" /> Archive
            </DropdownMenuItem>
          </>
        );
      case "Scheduled":
        return (
          <>
            <DropdownMenuItem
              onClick={() => onEdit(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <SquarePen className="size-3.5 shrink-0" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDuplicate(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <Copy className="size-3.5 shrink-0" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => onCancelSchedule(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <RotateCcw className="size-3.5 shrink-0" /> Cancel Schedule
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
              onClick={() => onDelete(ann)}
            >
              <Archive className="size-3.5 shrink-0" /> Archive
            </DropdownMenuItem>
          </>
        );
      case "Active":
        return (
          <>
            <DropdownMenuItem
              onClick={() => onReadReceipt(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <BarChart3 className="size-3.5 shrink-0" /> Read Analytics
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <SquarePen className="size-3.5 shrink-0" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDuplicate(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <Copy className="size-3.5 shrink-0" /> Duplicate
            </DropdownMenuItem>
            {ann.readCount < ann.totalRecipients && (
              <DropdownMenuItem
                onClick={() => onResend(ann)}
                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
              >
                <Send className="size-3.5 shrink-0" /> Resend to Unread
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
              onClick={() => onDelete(ann)}
            >
              <Archive className="size-3.5 shrink-0" /> Archive
            </DropdownMenuItem>
          </>
        );
      case "Archived":
        return (
          <>
            <DropdownMenuItem
              onClick={() => onReadReceipt(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              <BarChart3 className="size-3.5 shrink-0" /> Read Analytics
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => needsExpiryUpdateBeforeRestore ? onEdit(ann) : onArchive(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
            >
              {needsExpiryUpdateBeforeRestore ? <SquarePen className="size-3.5 shrink-0" /> : <ArchiveRestore className="size-3.5 shrink-0" />}
              {needsExpiryUpdateBeforeRestore ? "Edit & Restore" : "Restore Notice"}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => onDelete(ann)}
            >
              <Trash2 className="size-3.5 shrink-0" /> Delete
            </DropdownMenuItem>
          </>
        );
    }
  };  return (
    <div
      onClick={() => onPreview(ann)}
      className="min-w-0 bg-card border border-border/80 rounded-2xl overflow-hidden flex flex-col group hover:border-primary/30 transition-all duration-300 cursor-pointer shadow-2xs"
    >
      {/* Announcement category */}
      {!compact && <div className="h-28 relative overflow-hidden select-none border-b border-border/40">
        <div
          className={`absolute inset-0 ${typeStyle.surface}`}
        >
          {/* Category icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <TypeIcon className="w-12 h-12 text-white/40" strokeWidth={1.5} />
          </div>
        </div>

        {/* Top-left type badge */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10 pointer-events-none">
          <Badge
            variant="outline"
            className={`min-w-0 max-w-full whitespace-normal break-words text-ui-caption font-semibold border rounded-md px-2.5 py-0.5 shadow-2xs backdrop-blur-md pointer-events-none ${typeStyle.badge}`}
          >
            {ann.type}
          </Badge>
        {/* Top-right Status Pill: Shown only for Draft and Scheduled (without icon) */}
        {(ann.status === "Draft" || ann.status === "Scheduled") && (
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className={`text-ui-caption font-semibold border rounded-md px-2.5 py-0.5 shadow-2xs backdrop-blur-md pointer-events-none ${statusStyle.badge}`}
            >
              <span>{ann.status}</span>
            </Badge>
          </div>
        )}
        </div>
      </div>}

      {/* ── Card Body ── */}
      <div className={`${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"} min-w-0 flex flex-col flex-1 space-y-3.5`}>
        {compact && <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={`max-w-full whitespace-normal text-ui-caption pointer-events-none ${typeStyle.badge}`}>{ann.type}</Badge>
          <Badge variant="outline" className={`text-ui-caption pointer-events-none ${statusStyle.badge}`}>{ann.status}</Badge>
        </div>}
        {/* Title & Body */}
        <div className="space-y-1 flex-1 min-w-0">
          <h3 className="gw-heading text-base text-foreground leading-snug line-clamp-2 break-words [overflow-wrap:anywhere] group-hover:text-primary transition-colors">
            <button type="button" aria-label={`Preview announcement: ${ann.title}`} onClick={(event) => { event.stopPropagation(); onPreview(ann); }}
              className="block w-full min-w-0 text-left break-words [overflow-wrap:anywhere] cursor-pointer rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
              {ann.title}
            </button>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 break-words [overflow-wrap:anywhere]">
            {ann.body}
          </p>
        </div>

        {/* Target Audience & Optional Read Stat */}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate font-medium">
              {ann.targetAudience === "All Residents"
                ? "All Residents"
                : `${ann.targetBarangays.length} Barangay${
                    ann.targetBarangays.length !== 1 ? "s" : ""
                  }`}
            </span>
          </div>

          {ann.totalRecipients > 0 && (
            <button
              type="button"
              aria-label={`View read analytics for ${ann.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onReadReceipt(ann);
              }}
              className="gw-action-primary-ghost h-8 rounded-lg px-2 text-ui-caption font-semibold cursor-pointer shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              title="Click to view read analytics breakdown"
            >
              {readPct}% read
            </button>
          )}
        </div>

        {/* Footer Meta Row: Dates & 3-dot Action Menu */}
        <div
          className="flex min-w-0 items-center justify-between gap-2 text-ui-caption text-muted-foreground pt-2.5 mt-auto border-t border-border/60"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
            {ann.sentDate && (
              <span className="flex min-w-0 items-center gap-1 break-words">
                <Send className="w-3 h-3 text-muted-foreground shrink-0" /> {ann.sentDate}
              </span>
            )}
            {ann.status === "Scheduled" && ann.scheduledDate && (
              <span className="flex items-center gap-1 min-w-0 break-words" title={formatScheduledDateTime(ann.scheduledDate)}>
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />{" "}
                {formatScheduledDateTime(ann.scheduledDate)}
              </span>
            )}
            {ann.expiryDate && (
              <span className="flex min-w-0 items-center gap-1 break-words">
                <Calendar className="w-3 h-3 text-muted-foreground shrink-0" /> Exp:{" "}
                {ann.expiryLabel || ann.expiryDate}
              </span>
            )}
            {!ann.sentDate && !(ann.status === "Scheduled" && ann.scheduledDate) && !ann.expiryDate && (
              <span className="text-muted-foreground">Draft Notice</span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Actions for ${ann.title}`}
                className="h-7 w-7 p-0 rounded-lg shrink-0 cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border/80 p-1 shadow-md">
              <DropdownMenuItem
                onClick={() => onPreview(ann)}
                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 gap-2"
              >
                <Eye className="size-3.5 shrink-0" /> View
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              {renderMenuItems()}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
