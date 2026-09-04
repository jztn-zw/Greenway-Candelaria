import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Copy,
  Archive,
  ArchiveRestore,
  Send,
  Clock,
  Pin,
  PinOff,
  RotateCcw,
  BarChart3,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const typeBadges: Record<AnnouncementType, string> = announcementTypeStyles;

const priorityBadges: Record<AnnouncementPriority, string> = announcementPriorityStyles;

const statusBadges: Record<AnnouncementStatus, string> = {
  Draft:
    "bg-background/95 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 border-zinc-400/40 dark:border-zinc-700 backdrop-blur-md shadow-2xs",
  Scheduled:
    "bg-background/95 dark:bg-zinc-900/90 text-amber-700 dark:text-amber-300 border-amber-500/40 dark:border-amber-400/40 backdrop-blur-md shadow-2xs",
  Active:
    "bg-background/95 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 backdrop-blur-md shadow-2xs",
  Archived:
    "bg-background/95 dark:bg-zinc-900/90 text-muted-foreground border-border/80 backdrop-blur-md shadow-2xs",
};

interface AnnouncementListViewProps {
  announcements: Announcement[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
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

const AnnouncementListView = ({
  announcements,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
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
}: AnnouncementListViewProps) => {
  const isAllSelected =
    announcements.length > 0 && selectedIds.size === announcements.length;

  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
              <TableHead className="w-12 pl-4">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onToggleSelectAll}
                  className="rounded-md border-border"
                />
              </TableHead>
              <TableHead className="w-[34%] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Notice Details
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Type
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Priority
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Audience
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Read Rate
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Date
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-4 w-[70px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((ann) => {
              const isSelected = selectedIds.has(ann.id);
              const readPct =
                ann.totalRecipients > 0
                  ? Math.round((ann.readCount / ann.totalRecipients) * 100)
                  : 0;

              return (
                <TableRow
                  key={ann.id}
                  onClick={() => onPreview(ann)}
                  className={`cursor-pointer hover:bg-muted/40 dark:hover:bg-muted/25 transition-colors group border-b border-border/50 last:border-0 ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Selection Checkbox */}
                  <TableCell
                    className="pl-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(ann.id)}
                      className="rounded-md border-border"
                    />
                  </TableCell>

                  {/* Title & Preview */}
                  <TableCell className="py-3">
                    <div className="space-y-0.5 min-w-0 max-w-[340px]">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {ann.title}
                        </p>
                        {ann.pinned && (
                          <div
                            className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0"
                            title="Pinned Notice"
                          >
                            <Pin className="w-2.5 h-2.5 fill-primary text-primary" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {ann.body}
                      </p>
                    </div>
                  </TableCell>

                  {/* Type Pill */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs whitespace-nowrap pointer-events-none ${
                        typeBadges[ann.type] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ann.type}
                    </Badge>
                  </TableCell>

                  {/* Priority Pill */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs whitespace-nowrap pointer-events-none ${
                        priorityBadges[ann.priority] ||
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ann.priority}
                    </Badge>
                  </TableCell>

                  {/* Target Audience */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                      <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-medium">
                        {ann.targetAudience === "All Residents"
                          ? "All Residents"
                          : ann.targetPreset ||
                            `${ann.targetBarangays.length} Barangay${
                              ann.targetBarangays.length !== 1 ? "s" : ""
                            }`}
                      </span>
                    </div>
                  </TableCell>

                  {/* Read Rate Progress */}
                  <TableCell className="py-3">
                    {ann.status === "Draft" || ann.status === "Scheduled" ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onReadReceipt(ann);
                        }}
                        className="space-y-1 max-w-[130px] hover:text-primary transition-colors cursor-pointer"
                        title="Click to view read breakdown"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold tabular-nums text-foreground">
                            {readPct}%
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {ann.readCount}/{ann.totalRecipients}
                          </span>
                        </div>
                        <Progress value={readPct} className="h-1.5 rounded-full" />
                      </div>
                    )}
                  </TableCell>

                  {/* Date */}
                  <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {ann.sentDate ||
                      (ann.scheduledDate
                        ? new Date(ann.scheduledDate).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )
                        : "—")}
                  </TableCell>

                  {/* Status Pill */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs whitespace-nowrap pointer-events-none ${
                        statusBadges[ann.status] ||
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ann.status}
                    </Badge>
                  </TableCell>

                  {/* Actions Dropdown */}
                  <TableCell
                    className="pr-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-muted cursor-pointer rounded-xl"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {ann.status === "Draft" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => onEdit(ann)}
                                className="gap-2 text-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDuplicate(ann)}
                                className="gap-2 text-xs"
                              >
                                <Copy className="w-3.5 h-3.5" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onSendNow(ann)}
                                className="gap-2 text-xs"
                              >
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
                          )}
                          {ann.status === "Scheduled" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => onEdit(ann)}
                                className="gap-2 text-xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDuplicate(ann)}
                                className="gap-2 text-xs"
                              >
                                <Copy className="w-3.5 h-3.5" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onCancelSchedule(ann)}
                                className="gap-2 text-xs"
                              >
                                <Clock className="w-3.5 h-3.5" /> Cancel
                                Schedule
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-xs"
                                onClick={() => onDelete(ann)}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {ann.status === "Active" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => onReadReceipt(ann)}
                                className="gap-2 text-xs"
                              >
                                <BarChart3 className="w-3.5 h-3.5" /> Read Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onDuplicate(ann)}
                                className="gap-2 text-xs"
                              >
                                <Copy className="w-3.5 h-3.5" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onTogglePin(ann)}
                                className="gap-2 text-xs"
                              >
                                {ann.pinned ? (
                                  <>
                                    <PinOff className="w-3.5 h-3.5" /> Unpin
                                    from Top
                                  </>
                                ) : (
                                  <>
                                    <Pin className="w-3.5 h-3.5" /> Pin to Top
                                  </>
                                )}
                              </DropdownMenuItem>
                              {ann.readCount < ann.totalRecipients && (
                                <DropdownMenuItem
                                  onClick={() => onResend(ann)}
                                  className="gap-2 text-xs"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Resend
                                  to Unread
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onArchive(ann)}
                                className="gap-2 text-xs"
                              >
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
                          )}
                          {ann.status === "Archived" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => onReadReceipt(ann)}
                                className="gap-2 text-xs"
                              >
                                <BarChart3 className="w-3.5 h-3.5" /> Read Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onArchive(ann)}
                                className="gap-2 text-xs"
                              >
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
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AnnouncementListView;
