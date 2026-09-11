import React from "react";
import {
  Calendar,
  Clock,
  Send,
  AlertTriangle,
  Megaphone,
  Shield,
  Edit2,
  Trash2,
  Copy,
  Archive,
  ArchiveRestore,
  RotateCcw,
  MoreHorizontal,
  Users,
  BarChart3,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
    gradient: string;
    icon: React.ElementType;
  }
> = {
  "Schedule Change": {
    badge: announcementTypeStyles["Schedule Change"],
    gradient: "from-emerald-700/80 via-teal-800/60 to-emerald-950/90",
    icon: Calendar,
  },
  "Holiday Reminder": {
    badge: announcementTypeStyles["Holiday Reminder"],
    gradient: "from-amber-700/80 via-orange-800/60 to-emerald-950/90",
    icon: Calendar,
  },
  "Emergency Advisory": {
    badge: announcementTypeStyles["Emergency Advisory"],
    gradient: "from-red-800/90 via-rose-900/70 to-zinc-950/95",
    icon: AlertTriangle,
  },
  "General Notice": {
    badge: announcementTypeStyles["General Notice"],
    gradient: "from-emerald-800/80 via-teal-900/60 to-slate-950/90",
    icon: Megaphone,
  },
  "System Maintenance": {
    badge: announcementTypeStyles["System Maintenance"],
    gradient: "from-blue-800/80 via-cyan-900/60 to-slate-950/90",
    icon: Shield,
  },
  "Community Event": {
    badge: announcementTypeStyles["Community Event"],
    gradient: "from-violet-800/80 via-purple-900/60 to-slate-950/90",
    icon: Calendar,
  },
};

const statusConfig: Record<
  AnnouncementStatus,
  { badge: string; icon: React.ElementType }
> = {
  Draft: {
    badge: "bg-background/95 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 border-zinc-400/40 dark:border-zinc-700 backdrop-blur-md shadow-2xs",
    icon: Lock,
  },
  Scheduled: {
    badge: "bg-background/95 dark:bg-zinc-900/90 text-amber-700 dark:text-amber-300 border-amber-500/40 dark:border-amber-400/40 backdrop-blur-md shadow-2xs",
    icon: Clock,
  },
  Active: {
    badge: "bg-background/95 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 backdrop-blur-md shadow-2xs",
    icon: Globe,
  },
  Archived: {
    badge: "bg-background/95 dark:bg-zinc-900/90 text-muted-foreground border-border/80 backdrop-blur-md shadow-2xs",
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
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDuplicate(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSendNow(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Send Now
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
              onClick={() => onDelete(ann)}
            >
              Archive
            </DropdownMenuItem>
          </>
        );
      case "Scheduled":
        return (
          <>
            <DropdownMenuItem
              onClick={() => onEdit(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDuplicate(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => onCancelSchedule(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Cancel Schedule
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
              onClick={() => onDelete(ann)}
            >
              Archive
            </DropdownMenuItem>
          </>
        );
      case "Active":
        return (
          <>
            <DropdownMenuItem
              onClick={() => onReadReceipt(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Read Analytics
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDuplicate(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Duplicate
            </DropdownMenuItem>
            {ann.readCount < ann.totalRecipients && (
              <DropdownMenuItem
                onClick={() => onResend(ann)}
                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
              >
                Resend to Unread
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
              onClick={() => onDelete(ann)}
            >
              Archive
            </DropdownMenuItem>
          </>
        );
      case "Archived":
        return (
          <>
            <DropdownMenuItem
              onClick={() => onReadReceipt(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              Read Analytics
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => needsExpiryUpdateBeforeRestore ? onEdit(ann) : onArchive(ann)}
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
            >
              {needsExpiryUpdateBeforeRestore ? "Edit & Restore" : "Restore Notice"}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
              onClick={() => onDelete(ann)}
            >
              Delete
            </DropdownMenuItem>
          </>
        );
    }
  };

  const isSent = ann.status === "Active" || ann.status === "Archived";

  return (
    <div
      onClick={() => onPreview(ann)}
      className="bg-card border border-border/80 rounded-2xl overflow-hidden flex flex-col group hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer shadow-2xs"
    >
      {/* ── Top Ambient Visual Band ── */}
      <div className="h-28 relative overflow-hidden select-none border-b border-border/40">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${typeStyle.gradient} transition-transform duration-700 ease-out group-hover:scale-105`}
        >
          {/* Radial light blooms */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-black/20 blur-2xl pointer-events-none" />

          {/* Organic topography hills SVG */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 400 250"
            preserveAspectRatio="none"
          >
            <path
              d="M-50,150 C80,80 180,240 280,120 C360,40 420,180 470,100 L470,270 L-50,270 Z"
              fill="#ffffff"
            />
          </svg>

          {/* Centered watermark icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <TypeIcon className="w-12 h-12 text-white/15 drop-shadow-md" strokeWidth={1.5} />
          </div>
        </div>

        {/* Top-left type badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10 pointer-events-none">
          <Badge
            variant="outline"
            className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs backdrop-blur-md pointer-events-none ${typeStyle.badge}`}
          >
            {ann.type}
          </Badge>
        </div>

        {/* Top-right Status Pill: Shown only for Draft and Scheduled (without icon) */}
        {(ann.status === "Draft" || ann.status === "Scheduled") && (
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <Badge
              variant="outline"
              className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs backdrop-blur-md pointer-events-none ${statusStyle.badge}`}
            >
              <span>{ann.status}</span>
            </Badge>
          </div>
        )}
      </div>

      {/* ── Card Body ── */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 space-y-3.5">
        {/* Title & Body */}
        <div className="space-y-1 flex-1 min-w-0">
          <h3 className="font-display text-base font-bold text-foreground leading-snug line-clamp-2 break-words [overflow-wrap:anywhere] group-hover:text-primary transition-colors">
            {ann.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 break-words [overflow-wrap:anywhere]">
            {ann.body}
          </p>
        </div>

        {/* Target Audience & Optional Read Stat */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
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
            <span
              onClick={(e) => {
                e.stopPropagation();
                onReadReceipt(ann);
              }}
              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer shrink-0 ml-2"
              title="Click to view read analytics breakdown"
            >
              {readPct}% read
            </span>
          )}
        </div>

        {/* Footer Meta Row: Dates & 3-dot Action Menu */}
        <div
          className="flex items-center justify-between text-[11px] text-muted-foreground pt-2.5 mt-auto border-t border-border/60"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 min-w-0 truncate">
            {ann.sentDate && (
              <span className="flex items-center gap-1">
                <Send className="w-3 h-3 text-muted-foreground shrink-0" /> {ann.sentDate}
              </span>
            )}
            {ann.status === "Scheduled" && ann.scheduledDate && (
              <span className="flex items-center gap-1 min-w-0 truncate" title={formatScheduledDateTime(ann.scheduledDate)}>
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />{" "}
                {formatScheduledDateTime(ann.scheduledDate)}
              </span>
            )}
            {ann.expiryDate && (
              <span className="flex items-center gap-1">
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
                className="h-7 w-7 p-0 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl border border-border/80 p-1 shadow-md">
              {renderMenuItems()}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
