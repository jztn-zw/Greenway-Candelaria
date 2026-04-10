import React from "react";
import {
  Calendar, Clock, Send, AlertTriangle, Megaphone, Shield,
  Pin, PinOff, Edit2, Trash2, Copy, Archive, ArchiveRestore,
  RotateCcw, MoreHorizontal, Users, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Announcement, AnnouncementType, AnnouncementPriority, AnnouncementStatus } from "./types";

/* ─── Style maps ─── */
const typeConfig: Record<AnnouncementType, { bg: string; text: string; chipBg: string; chipText: string; icon: React.ElementType }> = {
  "Schedule Change": { bg: "bg-[hsl(var(--leaf))]/10", text: "text-[hsl(var(--leaf))]", chipBg: "bg-emerald-100 dark:bg-emerald-950", chipText: "text-emerald-700 dark:text-emerald-300", icon: Calendar },
  "Holiday Reminder": { bg: "bg-primary/10", text: "text-primary", chipBg: "bg-pink-100 dark:bg-pink-950", chipText: "text-pink-700 dark:text-pink-300", icon: Calendar },
  "Emergency Advisory": { bg: "bg-destructive/10", text: "text-destructive", chipBg: "bg-red-100 dark:bg-red-950", chipText: "text-red-700 dark:text-red-300", icon: AlertTriangle },
  "General Notice": { bg: "bg-[hsl(var(--forest))]/10", text: "text-[hsl(var(--forest))]", chipBg: "bg-violet-100 dark:bg-violet-950", chipText: "text-violet-700 dark:text-violet-300", icon: Megaphone },
  "System Maintenance": { bg: "bg-muted", text: "text-muted-foreground", chipBg: "bg-blue-100 dark:bg-blue-950", chipText: "text-blue-700 dark:text-blue-300", icon: Shield },
};

const priorityColors: Record<AnnouncementPriority, string> = {
  Normal: "bg-muted text-muted-foreground",
  Urgent: "bg-[hsl(var(--earth))]/60 text-[hsl(var(--earth-dark))]",
  Emergency: "bg-destructive/10 text-destructive",
};

const statusColors: Record<AnnouncementStatus, string> = {
  Draft: "bg-muted text-muted-foreground",
  Scheduled: "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20",
  Active: "bg-primary/10 text-primary border-primary/20",
  Archived: "bg-muted/60 text-muted-foreground border-muted",
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
  ann, isSelected, onSelect, onPreview, onEdit, onDuplicate,
  onTogglePin, onResend, onSendNow, onArchive, onDelete, onCancelSchedule, onReadReceipt,
}: Props) => {
  const typeStyle = typeConfig[ann.type];
  const TypeIcon = typeStyle.icon;
  const readPct = ann.totalRecipients > 0 ? Math.round((ann.readCount / ann.totalRecipients) * 100) : 0;

  const typeGradients: Record<AnnouncementType, string> = {
    "Schedule Change": "from-[hsl(145_65%_38%)] via-[hsl(170_55%_42%)]/70 to-[hsl(120_40%_50%)]/30",
    "Holiday Reminder": "from-[hsl(330_80%_55%)] via-[hsl(280_70%_58%)]/70 to-[hsl(310_60%_50%)]/30",
    "Emergency Advisory": "from-[hsl(0_75%_50%)] via-[hsl(20_85%_52%)]/70 to-[hsl(35_80%_55%)]/30",
    "General Notice": "from-[hsl(260_65%_55%)] via-[hsl(220_60%_52%)]/70 to-[hsl(280_55%_48%)]/30",
    "System Maintenance": "from-[hsl(215_60%_48%)] via-[hsl(230_55%_52%)]/70 to-[hsl(200_50%_45%)]/30",
  };
  const headerGradient = ann.priority === "Emergency"
    ? "from-[hsl(0_80%_48%)] via-[hsl(15_85%_50%)]/80 to-[hsl(35_75%_52%)]/40"
    : ann.priority === "Urgent"
      ? "from-[hsl(35_90%_50%)] via-[hsl(20_85%_48%)]/80 to-[hsl(45_80%_55%)]/40"
      : typeGradients[ann.type];

  /* Status-based menu actions */
  const renderMenuItems = () => {
    switch (ann.status) {
      case "Draft":
        return (
          <>
            <DropdownMenuItem onClick={() => onEdit(ann)}>
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(ann)}>
              <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSendNow(ann)}>
              <Send className="w-3.5 h-3.5 mr-2" /> Send Now
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => onDelete(ann)}>
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </>
        );
      case "Scheduled":
        return (
          <>
            <DropdownMenuItem onClick={() => onEdit(ann)}>
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(ann)}>
              <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onCancelSchedule(ann)}>
              <Clock className="w-3.5 h-3.5 mr-2" /> Cancel Schedule
            </DropdownMenuItem>
          </>
        );
      case "Active":
        return (
          <>
            <DropdownMenuItem onClick={() => onDuplicate(ann)}>
              <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTogglePin(ann)}>
              {ann.pinned ? <PinOff className="w-3.5 h-3.5 mr-2" /> : <Pin className="w-3.5 h-3.5 mr-2" />}
              {ann.pinned ? "Unpin" : "Pin to Top"}
            </DropdownMenuItem>
            {ann.readCount < ann.totalRecipients && (
              <DropdownMenuItem onClick={() => onResend(ann)}>
                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Resend to Unread
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onArchive(ann)}>
              <Archive className="w-3.5 h-3.5 mr-2" /> Archive
            </DropdownMenuItem>
          </>
        );
      case "Archived":
        return (
          <>
            <DropdownMenuItem onClick={() => onArchive(ann)}>
              <ArchiveRestore className="w-3.5 h-3.5 mr-2" /> Restore
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => onDelete(ann)}>
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </>
        );
    }
  };

  const isSent = ann.status === "Active" || ann.status === "Archived";

  return (
    <div
      onClick={() => onPreview(ann)}
      className={`bg-card border rounded-xl overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-300 cursor-pointer ${
        ann.pinned ? "border-primary/40 ring-1 ring-primary/20" : "border-border hover:border-primary/15"
      } ${isSelected ? "ring-2 ring-primary/50" : ""}`}
    >
      {/* Visual header band */}
      <div className="h-24 sm:h-28 relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${headerGradient}`}>
          <div className="absolute -right-6 -top-6 w-24 h-40 bg-white/10 dark:bg-white/[0.08] rotate-[30deg] rounded-2xl" />
          <div className="absolute -right-2 -top-4 w-16 h-36 bg-white/[0.07] dark:bg-white/[0.05] rotate-[30deg] rounded-2xl" />
          <div className="absolute -left-4 bottom-0 w-20 h-20 bg-white/[0.06] dark:bg-white/[0.04] rounded-full blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center">
            <TypeIcon className="w-10 h-10 text-white/15 dark:text-white/10" strokeWidth={1.5} />
          </div>
        </div>

        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <Badge variant="outline" className={`text-[10px] font-semibold border-0 shadow-sm ${typeStyle.chipBg} ${typeStyle.chipText}`}>
            {ann.type}
          </Badge>
          {ann.priority !== "Normal" && (
            <Badge variant="outline" className={`text-[10px] font-semibold border-0 shadow-sm ${
              ann.priority === "Emergency" ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300" 
              : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
            }`}>
              {ann.priority}
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Badge variant="outline" className={`text-[10px] font-semibold backdrop-blur-sm bg-background/80 ${statusColors[ann.status]}`}>
            {ann.status}
          </Badge>
          {ann.pinned && <Pin className="w-3.5 h-3.5 text-primary fill-primary drop-shadow" />}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(ann.id)}
            className="bg-background/80 border-border"
          />
        </div>

        {ann.edited && (
          <div className="absolute bottom-2 right-3">
            <span className="text-[9px] font-medium text-muted-foreground bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded">Edited</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1 space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {ann.title}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">{ann.body}</p>

        {/* Audience chip */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Users className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {ann.targetAudience === "All Residents"
              ? "All Residents"
              : ann.targetPreset || `${ann.targetBarangays.length} Barangay${ann.targetBarangays.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Read progress — clickable for breakdown */}
        {ann.status !== "Draft" && ann.status !== "Scheduled" && (
          <button
            onClick={(e) => { e.stopPropagation(); onReadReceipt(ann); }}
            className="w-full text-left space-y-1.5 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group/read cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Read Rate
              </span>
              <span className="font-semibold text-foreground">
                {ann.readCount.toLocaleString()} / {ann.totalRecipients.toLocaleString()} <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${readPct >= 75 ? "bg-primary/10 text-primary" : readPct >= 50 ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"}`}>{readPct}%</span>
              </span>
            </div>
            <Progress value={readPct} className="h-2 group-hover/read:h-2.5 transition-all" />
            <p className="text-[9px] text-muted-foreground/70 group-hover/read:text-primary transition-colors">
              Click for per-barangay breakdown →
            </p>
          </button>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-2 border-t border-border">
          {ann.sentDate && <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {ann.sentDate}</span>}
          {ann.scheduledDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ann.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
          {ann.expiryDate && <span className="flex items-center gap-1 ml-auto"><Calendar className="w-3 h-3" /> Exp: {ann.expiryDate}</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
          {isSent ? (
            <Button variant="outline" size="sm" className="h-7 text-[11px] flex-1 gap-1 opacity-60 cursor-default" disabled>
              <Send className="w-3 h-3" /> Already Sent
            </Button>
          ) : (
            <Button variant="default" size="sm" className="h-7 text-[11px] flex-1 gap-1" onClick={() => onSendNow(ann)}>
              <Send className="w-3 h-3" /> Send
            </Button>
          )}
          {ann.status !== "Archived" && (
            <Button variant="outline" size="sm" className="h-7 text-[11px] flex-1 gap-1" onClick={() => onEdit(ann)}>
              <Edit2 className="w-3 h-3" /> Edit
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 shrink-0">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {renderMenuItems()}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
