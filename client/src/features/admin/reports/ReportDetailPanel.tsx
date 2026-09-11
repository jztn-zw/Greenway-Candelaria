import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertOctagon,
  AlertTriangle,
  Copy,
  Loader2,
  ExternalLink,
  Trash2,
  X,
  Check,
  Search,
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
  STATUS_LABEL_TO_BACKEND,
  violationBadgeStyles,
  safeFormatDate,
} from "./types";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { fetchAdminReports, type AdminReportItem } from "@/services/reportsService";

interface ReportDetailPanelProps {
  report: WasteReport | null;
  isLoading?: boolean;
  onClose?: () => void;
  onUpdateStatus?: (status: string, officialResponse?: string) => Promise<void>;
  onAddNote?: (note: string) => Promise<void>;
  onFlagReport?: (payload: {
    is_false?: boolean;
    is_duplicate?: boolean;
    duplicate_of_reference?: string;
    duplicate_reason?: string;
    false_reason?: string;
    resolve?: boolean;
  }) => Promise<void>;
  onFlagDialogOpenChange?: (open: boolean) => void;
  onDeleteReport?: (id: string) => Promise<void>;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const statusOrder: ReportStatus[] = ["Submitted", "Under Review", "Dispatched", "Resolved"];

const ReportDetailPanel = ({
  report,
  isLoading = false,
  onClose,
  onUpdateStatus,
  onAddNote,
  onFlagReport,
  onFlagDialogOpenChange,
  onDeleteReport,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: ReportDetailPanelProps) => {
  const [officialResponse, setOfficialResponse] = useState(report?.officialResponse || "");
  const [internalNote, setInternalNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>(report?.status || "Submitted");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagType, setFlagType] = useState<"duplicate" | "false" | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [duplicateReference, setDuplicateReference] = useState("");
  const [resolveOnFlag, setResolveOnFlag] = useState(false);
  const [selectedDuplicateCandidate, setSelectedDuplicateCandidate] = useState<AdminReportItem | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<AdminReportItem[]>([]);
  const [isSearchingDuplicates, setIsSearchingDuplicates] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);

  useEffect(() => {
    if (report) {
      setSelectedStatus(report.status);
      setOfficialResponse(report.officialResponse || "");
      setInternalNote("");
    }
  }, [report?.id, report?.status, report?.officialResponse]);

  useEffect(() => {
    if (flagType !== "duplicate" || duplicateReference.trim().length < 2) {
      setDuplicateMatches([]);
      return;
    }
    // Don't re-trigger search if the reference matches the currently selected candidate
    if (
      selectedDuplicateCandidate &&
      selectedDuplicateCandidate.reference_number.toLowerCase() === duplicateReference.trim().toLowerCase()
    ) {
      setDuplicateMatches([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setIsSearchingDuplicates(true);
      try {
        const result = await fetchAdminReports({
          search: duplicateReference.trim(),
          barangay_id: report?.barangayId,
          limit: 8,
          sort: "date-desc",
        });
        if (active) {
          setDuplicateMatches(
            result.reports.filter(
              (candidate) =>
                candidate.id !== report?.id &&
                candidate.status !== "RESOLVED" &&
                candidate.barangay_id === report?.barangayId,
            ),
          );
        }
      } catch {
        if (active) setDuplicateMatches([]);
      } finally {
        if (active) setIsSearchingDuplicates(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [duplicateReference, flagType, report?.id, report?.barangayId, selectedDuplicateCandidate]);

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

  const vc = violationBadgeStyles[report.violationType] || violationBadgeStyles.Other;

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

  const handleStatusChange = (newStatus: ReportStatus) => {
    if (newStatus === "Resolved" && report.status !== "Resolved") {
      setShowResolveModal(true);
      return;
    }
    void handleStatusSubmit(newStatus);
  };

  const handleResponseSubmit = async () => {
    if (!onUpdateStatus || isSavingResponse) return;
    setIsSavingResponse(true);
    try {
      const backendStatus = STATUS_LABEL_TO_BACKEND[report.status] || "SUBMITTED";
      await onUpdateStatus(backendStatus, officialResponse.trim());
      toast.success("Official response saved");
    } catch {
      toast.error("Failed to save response");
    } finally {
      setIsSavingResponse(false);
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

  const handleFlag = async (payload: Parameters<NonNullable<ReportDetailPanelProps["onFlagReport"]>>[0]) => {
    if (!onFlagReport || isFlagging) return false;
    setIsFlagging(true);
    try {
      await onFlagReport(payload);
      toast.success("Report flag updated");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update flag");
      return false;
    } finally {
      setIsFlagging(false);
    }
  };

  const openFlagDialog = (type: "duplicate" | "false") => {
    setFlagType(type);
    setFlagReason(type === "duplicate" ? report.duplicateReason || "" : report.falseReason || "");
    setDuplicateReference(type === "duplicate" ? report.duplicateOfReference || "" : "");
    setSelectedDuplicateCandidate(null);
    setResolveOnFlag(type === "false");
    onFlagDialogOpenChange?.(true);
  };

  const handleFlagSubmit = async () => {
    if (!flagType) return;
    if (!flagReason.trim()) {
      toast.error("Please provide a review reason explaining this decision.");
      return;
    }
    if (flagType === "duplicate" && !duplicateReference.trim()) {
      toast.error("Please specify the original report reference number.");
      return;
    }

    const payload =
      flagType === "duplicate"
        ? {
            is_duplicate: true,
            duplicate_of_reference: duplicateReference.trim(),
            duplicate_reason: flagReason.trim(),
            resolve: resolveOnFlag,
          }
        : {
            is_false: true,
            false_reason: flagReason.trim(),
            resolve: resolveOnFlag,
          };

    const saved = await handleFlag(payload);
    if (saved) {
      setFlagType(null);
      setSelectedDuplicateCandidate(null);
      onFlagDialogOpenChange?.(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-card overflow-hidden">
      {/* ── Inspector Header ── */}
      <div className="px-4 py-2.5 sm:py-3 sm:px-5 border-b border-border/70 bg-muted/15 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Reference Number & Copy */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {report.referenceNumber}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(report.referenceNumber);
                  toast.success("Reference copied");
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/70 p-1 rounded transition-colors cursor-pointer"
                title="Copy reference number"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {isLoading && (
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge
                variant="outline"
                className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${vc}`}
              >
                {report.violationType}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] font-medium px-2 py-0.5 rounded-md border-border/70 bg-muted/40 text-foreground"
              >
                {report.priority} Priority
              </Badge>
              {report.isDuplicate && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-2 py-0.5 rounded-md"
                >
                  Duplicate
                </Badge>
              )}
              {report.isFalseReport && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium bg-destructive/10 text-destructive border-destructive/20 px-2 py-0.5 rounded-md"
                >
                  Invalid / False
                </Badge>
              )}
            </div>
          </div>

          {/* Navigation & Close Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(onPrevious || onNext) && (
              <div className="flex items-center rounded-xl border border-border/80 bg-background/80 p-0.5 shadow-2xs">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                  title="Previous report"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                  title="Next report"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable Inspector Body ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* ── Review Reason ── */}
        {(report.duplicateReason || report.falseReason) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {report.isDuplicate ? "Duplicate Report Note" : "Review Reason"}
              </span>
              {report.isDuplicate && (report.duplicateOfReference || report.duplicateOfId) && (
                <span className="text-[11px] text-muted-foreground font-medium">
                  Linked: {report.duplicateOfReference || report.duplicateOfId}
                </span>
              )}
            </div>
            <div className="bg-muted/25 border border-border/70 rounded-xl p-3.5 text-xs text-foreground/90 leading-relaxed font-normal">
              {report.isDuplicate ? report.duplicateReason : report.falseReason}
            </div>
          </div>
        )}

        {/* ── Status Stepper ── */}
        <div className="space-y-2 bg-muted/20 p-3 rounded-xl border border-border/70">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Status
          </span>

          <div className="grid grid-cols-4 gap-1.5">
            {statusOrder.map((st, idx) => {
              const isCurrent = report.status === st;
              const isPast = idx < currentStepIndex;
              const isFuture = idx > currentStepIndex;

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => isFuture && handleStatusChange(st)}
                  disabled={isUpdatingStatus || isCurrent || isPast}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all border",
                    isCurrent && "bg-primary border-primary text-primary-foreground font-semibold shadow-xs cursor-default",
                    isPast && "bg-primary/10 border-primary/20 text-primary font-medium cursor-not-allowed opacity-85",
                    isFuture && "bg-background border-border/70 text-foreground hover:border-primary/50 hover:bg-muted/50 cursor-pointer shadow-2xs",
                  )}
                  title={isPast ? "Completed step" : isCurrent ? "Current status" : `Move to ${st}`}
                >
                  <span className="text-[10px] font-medium leading-tight truncate w-full px-0.5">
                    {st}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Unified Incident Details Card ── */}
        <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Incident Details
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              {safeFormatDate(report.submittedAt, "MMM d, yyyy · h:mm a")}
            </span>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Barangay & Street
              </span>
              <span className="font-semibold text-foreground block mt-0.5 text-xs">
                {report.barangay}
              </span>
              {report.street && (
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  {report.street}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Reporter Information
              </span>
              <span className="font-semibold text-foreground block mt-0.5 text-xs">
                {report.submitterName}
              </span>
              {report.submitterEmail && (
                <span className="text-[11px] text-muted-foreground block mt-0.5 truncate">
                  {report.submitterEmail}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Resident Description ── */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-foreground block">
            Resident Description
          </span>
          <div className="bg-muted/25 border border-border/70 rounded-xl p-3.5 text-xs text-foreground/90 leading-relaxed font-normal">
            {report.description || "No description provided."}
          </div>
        </div>

        {/* ── Evidence Photos ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span>Evidence Photos ({report.photos?.length || 0})</span>
          </div>

          {report.photos && report.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5">
              {report.photos.map((photo, idx) => (
                <button
                  key={photo.id || idx}
                  type="button"
                  onClick={() => setPreviewPhoto(photo.url)}
                  className="relative aspect-square rounded-xl bg-muted border border-border/80 overflow-hidden group block cursor-pointer hover:border-primary/50 transition-all shadow-2xs"
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
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Official Resident Response
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Visible to resident
            </span>
          </div>

          <Textarea
            placeholder="Type official notification message to be sent to the resident..."
            value={officialResponse}
            onChange={(e) => setOfficialResponse(e.target.value)}
            className="text-xs min-h-[80px] bg-muted/25 border border-border/70 rounded-xl p-3.5 resize-none leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/20"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleResponseSubmit}
              disabled={isSavingResponse || !officialResponse.trim() || (!!report.officialResponse && officialResponse.trim() === report.officialResponse)}
              className="h-8 text-xs px-4 rounded-xl font-semibold cursor-pointer shadow-xs active:scale-95 disabled:opacity-40"
            >
              {isSavingResponse && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {report.officialResponse && officialResponse.trim() === report.officialResponse
                ? "Saved"
                : "Save Response"}
            </Button>
          </div>
        </div>

        {/* ── Internal Staff Notes ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Internal Notes</span>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full font-medium">
              Staff only
            </Badge>
          </div>

          {report.internalNotes && report.internalNotes.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {report.internalNotes.map((note, idx) => (
                <div
                  key={note.id || idx}
                  className="bg-muted/30 rounded-xl p-3 border border-border/60 space-y-1"
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

          <Textarea
            placeholder="Add internal investigation note..."
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            className="text-xs min-h-[64px] bg-muted/25 border border-border/70 rounded-xl p-3.5 resize-none leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/20"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleNoteSubmit}
              disabled={isSavingNote || !internalNote.trim()}
              className="h-8 text-xs px-4 rounded-xl font-semibold cursor-pointer shadow-2xs active:scale-95 disabled:opacity-40"
            >
              {isSavingNote && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Add Note
            </Button>
          </div>
        </div>
      </div>

      {/* ── Pinned Bottom Action Bar ── */}
      <div className="p-3 sm:px-5 border-t border-border/70 bg-card/95 backdrop-blur-sm shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!report.isFalseReport && (
            <Button
              variant="outline"
              size="sm"
              disabled={isFlagging}
              onClick={() => openFlagDialog("duplicate")}
              className={cn(
                "h-8 text-xs px-3 rounded-xl cursor-pointer font-medium",
                report.isDuplicate && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
              )}
            >
              {report.isDuplicate ? "Edit Duplicate" : "Flag Duplicate"}
            </Button>
          )}

          {!report.isDuplicate && (
            <Button
              variant="outline"
              size="sm"
              disabled={isFlagging}
              onClick={() => openFlagDialog("false")}
              className={cn(
                "h-8 text-xs px-3 rounded-xl cursor-pointer font-medium",
                report.isFalseReport
                  ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                  : "text-foreground hover:bg-muted",
              )}
            >
              {report.isFalseReport ? "Edit Flag" : "Flag as False"}
            </Button>
          )}

          {/* Quick Clear button if flagged */}
          {(report.isDuplicate || report.isFalseReport) && (
            <Button
              variant="outline"
              size="sm"
              disabled={isFlagging}
              onClick={() => handleFlag(report.isDuplicate ? { is_duplicate: false } : { is_false: false })}
              className="h-8 text-xs px-3 rounded-xl font-medium text-muted-foreground hover:text-foreground hover:bg-muted border-border/70 cursor-pointer"
            >
              Clear Flag
            </Button>
          )}
        </div>

        {onDeleteReport && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            onClick={() => setShowDeleteModal(true)}
            className="h-8 text-xs px-3 rounded-xl font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 cursor-pointer ml-auto transition-colors"
          >
            Delete
          </Button>
        )}
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

      {/* ── Simple Flag Modal (Duplicate & False Report) ── */}
      <Dialog
        open={!!flagType}
        onOpenChange={(open) => {
          if (!open) {
            setFlagType(null);
            setSelectedDuplicateCandidate(null);
          }
          onFlagDialogOpenChange?.(open);
        }}
      >
        <DialogContent className="z-[200] w-[92vw] sm:max-w-md rounded-2xl p-5 sm:p-6 bg-background border border-border/80 shadow-2xl [&>button:last-child]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
            <div>
              <DialogTitle className="text-base font-bold font-display text-foreground">
                {flagType === "duplicate" ? "Flag as Duplicate" : "Mark as Invalid Report"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Report {report.referenceNumber} • {report.barangay}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => {
                setFlagType(null);
                setSelectedDuplicateCandidate(null);
                onFlagDialogOpenChange?.(false);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4 py-4">
            {/* If Duplicate: Clean Reference Search */}
            {flagType === "duplicate" && (
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Original Report Reference</span>
                  {selectedDuplicateCandidate && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Linked
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={duplicateReference}
                    onChange={(e) => {
                      setDuplicateReference(e.target.value);
                      if (selectedDuplicateCandidate && e.target.value !== selectedDuplicateCandidate.reference_number) {
                        setSelectedDuplicateCandidate(null);
                      }
                    }}
                    placeholder="e.g. RPT-2026-00012"
                    className="h-10 text-xs font-mono placeholder:font-sans rounded-xl pl-9 pr-8"
                  />
                  {isSearchingDuplicates && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {duplicateMatches.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-popover shadow-lg divide-y divide-border/60">
                    {duplicateMatches.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => {
                          setDuplicateReference(candidate.reference_number);
                          setSelectedDuplicateCandidate(candidate);
                          setDuplicateMatches([]);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted/60 transition-colors flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="font-mono font-bold text-foreground">
                          {candidate.reference_number}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                          {candidate.violation_type.replaceAll("_", " ")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Reason</label>
              <Textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder={
                  flagType === "duplicate"
                    ? "Explain why this is duplicate..."
                    : "Explain why this report could not be verified or is invalid..."
                }
                className="min-h-[80px] rounded-xl text-xs resize-none"
              />
            </div>

            {/* Resolve & Notify Circle Check Card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setResolveOnFlag(!resolveOnFlag)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setResolveOnFlag(!resolveOnFlag);
                }
              }}
              className={cn(
                "group flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                resolveOnFlag
                  ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                  : "bg-muted/30 border-border/70 hover:bg-muted/50 hover:border-primary/40",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all border",
                  resolveOnFlag
                    ? "bg-primary border-primary text-primary-foreground shadow-xs scale-100"
                    : "border-border/80 bg-background/60 group-hover:border-primary/60 group-hover:bg-primary/5",
                )}
              >
                {resolveOnFlag && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </div>

              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {flagType === "duplicate" ? "Resolve & Notify Resident" : "Close as Resolved & Notify"}
                  </span>
                  {resolveOnFlag && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-primary/20 text-primary">
                      Will Resolve
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {flagType === "duplicate"
                    ? resolveOnFlag
                      ? "Close this duplicate report and send an update to the resident."
                      : "Keep under review. Record flag for staff without notifying resident."
                    : resolveOnFlag
                      ? "Close this report and send the review outcome to the resident."
                      : "Keep under review. Record flag for staff without notifying resident."}
                </p>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-3.5 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFlagType(null);
                setSelectedDuplicateCandidate(null);
                onFlagDialogOpenChange?.(false);
              }}
              disabled={isFlagging}
              className="rounded-xl h-9 text-xs px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleFlagSubmit}
              disabled={isFlagging}
              variant={flagType === "false" ? "destructive" : "default"}
              className={cn(
                "rounded-xl h-9 text-xs px-4 font-semibold cursor-pointer",
                flagType === "duplicate" && "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700",
              )}
            >
              {isFlagging ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : flagType === "duplicate" ? (
                "Flag as Duplicate"
              ) : (
                "Mark Invalid"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResolveModal} onOpenChange={(open) => !open && setShowResolveModal(false)}>
        <DialogContent className="z-[200] w-[92vw] sm:max-w-md rounded-2xl p-5 sm:p-6 bg-background border-border/80 shadow-2xl [&>button:last-child]:hidden">
          <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
            <div>
              <DialogTitle className="text-base font-bold font-display">Resolve this report?</DialogTitle>
              <DialogDescription className="mt-1 text-xs text-muted-foreground">
                This finalizes the report. Its status cannot be changed again, and the resident will be notified.
              </DialogDescription>
            </div>
            <button type="button" onClick={() => setShowResolveModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2.5 py-4 text-xs leading-relaxed text-muted-foreground">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
            <p>Confirm only after the issue has been fully handled. To prevent incorrect records, resolved reports cannot be reopened or moved to another status.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/60 pt-3.5">
            <Button variant="outline" onClick={() => setShowResolveModal(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => { setShowResolveModal(false); void handleStatusSubmit("Resolved"); }} disabled={isUpdatingStatus} className="rounded-xl">
              {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, resolve report"}
            </Button>
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
