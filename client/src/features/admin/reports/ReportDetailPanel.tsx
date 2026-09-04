import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Clock,
  User,
  Camera,
  AlertTriangle,
  Copy,
  AlertOctagon,
  MessageSquare,
  StickyNote,
  Save,
  Loader2,
  ExternalLink,
  Trash2,
  X,
  CheckCircle2,
  Send,
  Flag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  WasteReport,
  ReportStatus,
  ReportPriority,
  STATUS_LABEL_TO_BACKEND,
  PRIORITY_LABEL_TO_BACKEND,
  statusBadgeStyles,
  priorityBadgeStyles,
  violationBadgeStyles,
  safeFormatDate,
} from "./types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReportDetailPanelProps {
  report: WasteReport | null;
  isLoading?: boolean;
  onClose?: () => void;
  onUpdateStatus?: (status: string, officialResponse?: string) => Promise<void>;
  onUpdatePriority?: (priority: "LOW" | "MEDIUM" | "HIGH") => Promise<void>;
  onAddNote?: (note: string) => Promise<void>;
  onFlagReport?: (payload: { is_false?: boolean; is_duplicate?: boolean }) => Promise<void>;
  onDeleteReport?: (id: string) => Promise<void>;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const statusOrder: ReportStatus[] = ["Submitted", "Under Review", "Dispatched", "Resolved"];
const priorityOrder: ReportPriority[] = ["High", "Medium", "Low"];

const ReportDetailPanel = ({
  report,
  isLoading = false,
  onClose,
  onUpdateStatus,
  onUpdatePriority,
  onAddNote,
  onFlagReport,
  onDeleteReport,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: ReportDetailPanelProps) => {
  const [officialResponse, setOfficialResponse] = useState(report?.officialResponse || "");
  const [internalNote, setInternalNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>(report?.status || "Submitted");
  const [selectedPriority, setSelectedPriority] = useState<ReportPriority>(report?.priority || "Medium");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (report) {
      setSelectedStatus(report.status);
      setSelectedPriority(report.priority);
      setOfficialResponse(report.officialResponse || "");
      setInternalNote("");
    }
  }, [report?.id, report?.status, report?.priority, report?.officialResponse]);

  if (!report) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-8 text-center shadow-2xs min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3 text-muted-foreground">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-foreground">Select a report</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto leading-relaxed">
          Click any report from the list to view its complete photo evidence, incident location, and management controls.
        </p>
      </div>
    );
  }

  const sc = statusBadgeStyles[report.status] || statusBadgeStyles.Submitted;
  const vc = violationBadgeStyles[report.violationType] || violationBadgeStyles.Other;
  const pc = priorityBadgeStyles[report.priority] || priorityBadgeStyles.Medium;

  const currentStepIndex = statusOrder.indexOf(report.status);

  const handleStatusSubmit = async (newStatus: ReportStatus) => {
    if (!onUpdateStatus || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const backendStatus = STATUS_LABEL_TO_BACKEND[newStatus] || "SUBMITTED";
      await onUpdateStatus(backendStatus, officialResponse.trim() || undefined);
      setSelectedStatus(newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResponseSubmit = async () => {
    if (!onUpdateStatus || isSavingResponse) return;
    setIsSavingResponse(true);
    try {
      const backendStatus = STATUS_LABEL_TO_BACKEND[report.status] || "SUBMITTED";
      await onUpdateStatus(backendStatus, officialResponse.trim());
      toast.success("Official response saved & sent to resident");
    } catch {
      toast.error("Failed to save response");
    } finally {
      setIsSavingResponse(false);
    }
  };

  const handlePrioritySubmit = async (newPriority: ReportPriority) => {
    setSelectedPriority(newPriority);
    if (!onUpdatePriority || isUpdatingPriority) return;
    setIsUpdatingPriority(true);
    try {
      const backendPriority = PRIORITY_LABEL_TO_BACKEND[newPriority] || "MEDIUM";
      await onUpdatePriority(backendPriority);
      toast.success(`Priority updated to ${newPriority}`);
    } catch {
      toast.error("Failed to update priority");
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleNoteSubmit = async () => {
    if (!onAddNote || !internalNote.trim() || isSavingNote) return;
    setIsSavingNote(true);
    try {
      await onAddNote(internalNote.trim());
      setInternalNote("");
      toast.success("Internal note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleFlag = async (payload: { is_false?: boolean; is_duplicate?: boolean }) => {
    if (!onFlagReport || isFlagging) return;
    setIsFlagging(true);
    try {
      await onFlagReport(payload);
      toast.success("Report flag updated");
    } catch {
      toast.error("Failed to update flag");
    } finally {
      setIsFlagging(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-card overflow-hidden">
      {/* ── Inspector Header ── */}
      <div className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-foreground">
                {report.referenceNumber}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(report.referenceNumber);
                  toast.success("Reference copied");
                }}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                title="Copy reference"
              >
                <Copy className="w-3 h-3" />
              </button>
              {isLoading && (
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${vc}`}
              >
                {report.violationType}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${pc}`}
              >
                {report.priority}
              </Badge>
              {report.isDuplicate && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 border-amber-500/20 px-2 py-0.5 rounded-full"
                >
                  Duplicate
                </Badge>
              )}
              {report.isFalseReport && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-destructive/10 text-destructive border-destructive/20 px-2 py-0.5 rounded-full"
                >
                  False Report
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(onPrevious || onNext) && (
              <div className="flex items-center rounded-lg border border-border/70 bg-background/50 p-0.5">
                <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!hasPrevious} className="h-7 w-7 rounded-md" title="Previous report">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onNext} disabled={!hasNext} className="h-7 w-7 rounded-md" title="Next report">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable Inspector Body ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* ── Resolution Pipeline Stepper ── */}
        <div className="space-y-2 bg-muted/40 p-3.5 rounded-xl border border-border/60">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Workflow Status</span>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border gap-1 shadow-2xs ${sc.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              {report.status}
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {statusOrder.map((st, idx) => {
              const isPastOrCurrent = idx <= currentStepIndex;
              const isCurrent = report.status === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusSubmit(st)}
                  disabled={isUpdatingStatus}
                  className={`flex flex-col items-center py-2 px-1 rounded-lg text-center transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-primary text-primary-foreground font-bold shadow-xs shadow-primary/20"
                      : isPastOrCurrent
                      ? "bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                      : "bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground"
                  }`}
                  title={`Move to ${st}`}
                >
                  <span className="text-[10px] leading-tight line-clamp-1">{st}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bento Incident & Location Card ── */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">Incident Location & Details</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Barangay</span>
              </div>
              <p className="text-xs font-bold text-foreground">{report.barangay}</p>
              {report.street && (
                <p className="text-[11px] text-muted-foreground truncate">{report.street}</p>
              )}
            </div>

            <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Reported On</span>
              </div>
              <p className="text-xs font-bold text-foreground">
                {safeFormatDate(report.submittedAt, "MMM d, yyyy")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {safeFormatDate(report.submittedAt, "h:mm a", "")}
              </p>
            </div>

            <div className="col-span-2 bg-card border border-border/80 rounded-xl p-3 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>Reporter Information</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">
                  {report.submitterName}
                </p>
                {report.submitterEmail && (
                  <span className="text-[11px] text-muted-foreground">
                    {report.submitterEmail}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Violation Description ── */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-foreground">Resident Description</p>
          <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5 text-xs text-foreground/90 leading-relaxed">
            {report.description || "No description provided."}
          </div>
        </div>

        {/* ── Evidence Photos ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-primary" />
              <span>Evidence Photos ({report.photos?.length || 0})</span>
            </span>
          </div>

          {report.photos && report.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {report.photos.map((photo, idx) => (
                <button
                  key={photo.id || idx}
                  type="button"
                  onClick={() => setPreviewPhoto(photo.url)}
                  className="relative aspect-square rounded-xl bg-muted border border-border/80 overflow-hidden group block cursor-pointer"
                >
                  <img
                    src={photo.url}
                    alt={`Evidence photo ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ExternalLink className="w-4 h-4 text-white" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-muted/20 border border-dashed border-border/80 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">No photos attached to this report.</p>
            </div>
          )}
        </div>

        {/* ── Official Response to Resident ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Official Resident Response</span>
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">
              Visible to resident
            </span>
          </div>
          <Textarea
            placeholder="Type official notification message to be sent to the resident..."
            value={officialResponse}
            onChange={(e) => setOfficialResponse(e.target.value)}
            className="text-xs min-h-[80px] bg-background border-border/80 rounded-xl resize-none focus-visible:ring-primary/20"
          />
          <Button
            size="sm"
            onClick={handleResponseSubmit}
            disabled={isSavingResponse || !officialResponse.trim()}
            className="h-8 text-xs rounded-xl font-semibold gap-1.5 cursor-pointer active:scale-95"
          >
            {isSavingResponse ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Save Response
          </Button>
        </div>

        {/* ── Internal Staff Notes ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-primary" />
              <span>Internal Notes</span>
            </span>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-semibold">
              Staff only
            </Badge>
          </div>

          {report.internalNotes && report.internalNotes.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {report.internalNotes.map((note, idx) => (
                <div
                  key={note.id || idx}
                  className="bg-muted/40 rounded-xl p-3 border border-border/60 space-y-1"
                >
                  <p className="text-xs text-foreground leading-relaxed">{note.text}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {note.adminName || "Admin"} ·{" "}
                    {safeFormatDate(note.timestamp, "MMM d, h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder="Add internal investigation note..."
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              className="text-xs min-h-[60px] bg-background border-border/80 rounded-xl resize-none focus-visible:ring-primary/20"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleNoteSubmit}
              disabled={isSavingNote || !internalNote.trim()}
              className="h-8 text-xs rounded-xl font-semibold gap-1.5 cursor-pointer active:scale-95"
            >
              {isSavingNote ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Add Note
            </Button>
          </div>
        </div>

        {/* ── Flag & Action Bar ── */}
        <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isFlagging || report.isDuplicate}
            onClick={() => handleFlag({ is_duplicate: !report.isDuplicate })}
            className={cn(
              "h-8 text-xs rounded-xl gap-1.5 cursor-pointer",
              report.isDuplicate && "bg-amber-500/10 text-amber-600 border-amber-500/30",
            )}
          >
            <Copy className="w-3 h-3" />
            {report.isDuplicate ? "Duplicate Flagged" : "Flag Duplicate"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isFlagging || report.isFalseReport}
            onClick={() => handleFlag({ is_false: !report.isFalseReport })}
            className={cn(
              "h-8 text-xs rounded-xl gap-1.5 cursor-pointer text-destructive border-destructive/30 hover:bg-destructive/10",
              report.isFalseReport && "bg-destructive/10 text-destructive",
            )}
          >
            <Flag className="w-3 h-3" />
            {report.isFalseReport ? "False Report Flagged" : "Flag False"}
          </Button>

          {onDeleteReport && (
            <Button
              variant="destructive-outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setShowDeleteModal(true)}
              className="h-8 text-xs gap-1.5 ml-auto"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* ── Photo Lightbox Modal ── */}
      <Dialog open={!!previewPhoto} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-[95vw] sm:max-w-2xl p-4 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <DialogTitle className="text-sm font-bold text-foreground font-display">
              Evidence Photo Preview
            </DialogTitle>
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="py-2">
            {previewPhoto && (
              <img
                src={previewPhoto}
                alt="Evidence preview"
                className="w-full max-h-[70vh] object-contain rounded-xl bg-muted/40"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ── */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => !open && setShowDeleteModal(false)}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
          <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight truncate">
                Delete Waste Report?
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-2.5">
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete report{" "}
              <strong className="text-foreground font-semibold">
                {report.referenceNumber}
              </strong>
              ? This action will soft-delete the report from active queues and record an entry in the Audit Log.
            </DialogDescription>
          </div>

          <div className="flex items-center justify-end pt-3.5 border-t border-border/60">
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                if (!onDeleteReport) return;
                try {
                  setIsDeleting(true);
                  await onDeleteReport(report.id);
                  setShowDeleteModal(false);
                  if (onClose) onClose();
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete Permanently"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportDetailPanel;
