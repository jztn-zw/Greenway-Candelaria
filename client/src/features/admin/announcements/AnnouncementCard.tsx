import React from "react";
import {
  Calendar,
  Clock,
  Send,
  AlertTriangle,
  Megaphone,
  Shield,
  Pin,
  PinOff,
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
import { Checkbox } from "@/components/ui/checkbox";
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
  AnnouncementPriority,
  AnnouncementStatus,
  announcementTypeStyles,
  announcementPriorityStyles,
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
};

const priorityConfig: Record<
  AnnouncementPriority,
  { badge: string }
> = {
  Normal: {
    badge: announcementPriorityStyles.Normal,
  },
  Urgent: {
    badge: announcementPriorityStyles.Urgent,
  },
  Emergency: {
    badge: announcementPriorityStyles.Emergency,
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

interface Props {
  ann: Announcement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPreview: (ann: Announcement) => void;
  onEdit: (ann: Announcement) => void;
  onDuplicate: (ann: Announcement) => void;
  onTogglePin: (ann: Announcement) => void;
  onResend: (ann: Announcement) => void;
  onSendNow: (ann: Announcement) => void;
  onArchive: (ann: Announcement) => void;
  onDelete: (ann: Announcement) => void;
  onCancelSchedule: (ann: Announcement) => void;
  onReadReceipt: (ann: Announcement) => void;
}

const AnnouncementCard = ({
  ann,
  isSelected,
  onSelect,
  onPreview,
  onEdit,
  onDuplicate,
  onTogglePin,
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
  const StatusIcon = statusStyle.icon;
  const readPct =
    ann.totalRecipients > 0
      ? Math.round((ann.readCount / ann.totalRecipients) * 100)
      : 0;

  const renderMenuItems = () => {
    switch (ann.status) {
      case "Draft":
        return (
          <>
            <DropdownMenuItem onClick={() => onEdit(ann)} className="gap-2 text-xs">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(ann)} className="gap-2 text-xs">
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSendNow(ann)} className="gap-2 text-xs">
              <Send className="w-3.5 h-3.5" /> Send Now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-xs"
              onClick={() => onDelete(ann)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </DropdownMenuItem>
          </>
        );
      case "Scheduled":
        return (
          <>
            <DropdownMenuItem onClick={() => onEdit(ann)} className="gap-2 text-xs">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(ann)} className="gap-2 text-xs">
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onCancelSchedule(ann)} className="gap-2 text-xs">
              <Clock className="w-3.5 h-3.5" /> Cancel Schedule
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-xs"
              onClick={() => onDelete(ann)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </DropdownMenuItem>
          </>
        );
      case "Active":
        return (
          <>
            <DropdownMenuItem onClick={() => onReadReceipt(ann)} className="gap-2 text-xs">
              <BarChart3 className="w-3.5 h-3.5 text-primary" /> Read Analytics
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(ann)} className="gap-2 text-xs">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(ann)} className="gap-2 text-xs">
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTogglePin(ann)} className="gap-2 text-xs">
              {ann.pinned ? (
                <>
                  <PinOff className="w-3.5 h-3.5" /> Unpin from Top
                </>
              ) : (
                <>
                  <Pin className="w-3.5 h-3.5" /> Pin to Top
                </>
              )}
            </DropdownMenuItem>
            {ann.readCount < ann.totalRecipients && (
              <DropdownMenuItem onClick={() => onResend(ann)} className="gap-2 text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Resend to Unread
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onArchive(ann)} className="gap-2 text-xs">
              <Archive className="w-3.5 h-3.5" /> Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-xs"
              onClick={() => onDelete(ann)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </DropdownMenuItem>
          </>
        );
      case "Archived":
        return (
          <>
            <DropdownMenuItem onClick={() => onReadReceipt(ann)} className="gap-2 text-xs">
              <BarChart3 className="w-3.5 h-3.5 text-primary" /> Read Analytics
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchive(ann)} className="gap-2 text-xs">
              <ArchiveRestore className="w-3.5 h-3.5" /> Restore Notice
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-xs"
              onClick={() => onDelete(ann)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </DropdownMenuItem>
          </>
        );
    }
  };

  const isSent = ann.status === "Active" || ann.status === "Archived";

  return (
    <div
      onClick={() => onPreview(ann)}
      className={`bg-card border rounded-2xl overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300 cursor-pointer shadow-2xs ${
        ann.pinned
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-border/80 hover:border-primary/30"
      } ${isSelected ? "ring-2 ring-primary/60" : ""}`}
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

        {/* Top-left Badges (Type & Priority) */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10 pointer-events-none">
          <Badge
            variant="outline"
            className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs backdrop-blur-md pointer-events-none ${typeStyle.badge}`}
          >
            {ann.type}
          </Badge>
          {ann.priority !== "Normal" && (
            <Badge
              variant="outline"
              className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs backdrop-blur-md pointer-events-none ${
                priorityConfig[ann.priority]?.badge || ""
              }`}
            >
              {ann.priority}
            </Badge>
          )}
        </div>

        {/* Top-right Status Pill, Pin, Checkbox */}
        <div
          className="absolute top-3 right-3 flex items-center gap-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Badge
            variant="outline"
            className={`text-[11px] font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs backdrop-blur-md gap-1 pointer-events-none ${statusStyle.badge}`}
          >
            <StatusIcon className="w-3 h-3" />
            <span>{ann.status}</span>
          </Badge>

          {ann.pinned && (
            <div
              className="w-6 h-6 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center backdrop-blur-md"
              title="Pinned Notice"
            >
              <Pin className="w-3 h-3 fill-primary text-primary" />
            </div>
          )}

          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(ann.id)}
            className="w-5 h-5 rounded-md bg-background/90 border-border/80 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
        </div>
      </div>

      {/* ── Card Body ── */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 space-y-3.5">
        {/* Title & Body */}
        <div className="space-y-1 flex-1">
          <h3 className="font-display text-base font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {ann.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {ann.body}
          </p>
        </div>

        {/* Target Audience & Optional Read Stat */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <Users className="w-3.5 h-3.5 text-primary shrink-0" />
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
          <div className="flex items-center gap-3 truncate">
            {ann.sentDate && (
              <span className="flex items-center gap-1">
                <Send className="w-3 h-3 text-primary shrink-0" /> {ann.sentDate}
              </span>
            )}
            {ann.scheduledDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />{" "}
                {new Date(ann.scheduledDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {ann.expiryDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground shrink-0" /> Exp:{" "}
                {ann.expiryDate}
              </span>
            )}
            {!ann.sentDate && !ann.scheduledDate && !ann.expiryDate && (
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
            <DropdownMenuContent align="end" className="w-48 rounded-xl border border-border">
              {renderMenuItems()}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
