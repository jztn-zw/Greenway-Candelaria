import { SearchInput } from "@/components/common/SearchInput";
import { getStatusBadgeStyle, badgeStyles } from "@/components/ui/badgeStyles";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
Dialog,
DialogContent,
DialogDescription,
DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAdminFetch } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fetchAdminReports, type AdminReportItem } from "@/services/reportsService";
import { AlertOctagon, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
ReportStatus,
safeFormatDate,
STATUS_LABEL_TO_BACKEND,
violationBadgeStyles,
WasteReport,
} from "./types";

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
  const fetchAdmin = useAdminFetch();
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
  const reportId = report?.id;
  const reportStatus = report?.status;
  const reportResponse = report?.officialResponse;

  const previousReport = useRef({ id: reportId, status: reportStatus, response: reportResponse || "" });
  useEffect(() => {
    if (!reportId || !reportStatus) return;
    const previous = previousReport.current;
    if (previous.id !== reportId) {
      setSelectedStatus(reportStatus);
      setOfficialResponse(reportResponse || "");
      setInternalNote("");
    } else {
      // Refresh untouched fields, preserving text and status choices being edited.
      setSelectedStatus((current) => current === previous.status ? reportStatus : current);
      setOfficialResponse((current) => current === previous.response ? reportResponse || "" : current);
    }
    previousReport.current = { id: reportId, status: reportStatus, response: reportResponse || "" };
  }, [reportId, reportStatus, reportResponse]);

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
        const params = {
          search: duplicateReference.trim(),
          barangay_id: report?.barangayId,
          limit: 8,
          sort: "date-desc",
        };
        const result = await fetchAdmin("reports", ["duplicate-search", params], () => fetchAdminReports(params));
        if (active) {
          setDuplicateMatches(
            result.reports.filter(
              (candidate) =>
                candidate.id !== report?.id &&
                candidate.status !== "RESOLVED" &&
                !candidate.is_duplicate &&
                !candidate.is_false &&
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
  }, [duplicateReference, flagType, report?.id, report?.barangayId, selectedDuplicateCandidate, fetchAdmin]);

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
      return true;
    } catch {
      toast.error("Failed to update status");
      return false;
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
      <div className="px-5 py-3.5 border-b border-border/60 bg-muted/15 shrink-0">
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
                className="gw-action-ghost p-1 rounded transition-colors cursor-pointer"
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
                className={`text-ui-overline font-medium px-2 py-0.5 rounded-md border ${vc}`}
              >
                {report.violationType}
              </Badge>
              {report.isDuplicate && (
                <Badge
                  variant="outline"
                  className={"text-ui-overline font-medium px-2 py-0.5 rounded-md " + getStatusBadgeStyle("Duplicate").className}
                >
                  Duplicate
                </Badge>
              )}
              {report.isFalseReport && (
                <Badge
                  variant="outline"
                  className={"text-ui-overline font-medium px-2 py-0.5 rounded-md " + badgeStyles.error.className}
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
                  className="h-7 w-7 rounded-lg disabled:opacity-30 cursor-pointer"
                  title="Previous report"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="h-7 w-7 rounded-lg disabled:opacity-30 cursor-pointer"
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
                className="gw-action-ghost w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable Inspector Body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 scrollbar-thin">
        {/* ── Review Reason ── */}
        {(report.duplicateReason || report.falseReason) && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {report.isDuplicate ? "Duplicate Report Note" : "Review Reason"}
              </span>
              {report.isDuplicate && (report.duplicateOfReference || report.duplicateOfId) && (
                <span className="text-ui-caption text-muted-foreground font-medium">
                  Linked: {report.duplicateOfReference || report.duplicateOfId}
                </span>
              )}
            </div>
            <div className="bg-muted/20 border border-border/70 rounded-xl p-3.5 text-xs text-foreground/90 leading-relaxed font-normal">
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
              const wasRecorded = report.statusHistory?.some((entry) => entry.status === st);

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => isFuture && handleStatusChange(st)}
                  disabled={isUpdatingStatus || isCurrent || isPast}
                  className={cn(
                    "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all border",
                    isCurrent && "bg-primary border-primary text-primary-foreground font-semibold shadow-xs cursor-default",
                    isPast && wasRecorded && "bg-primary/10 border-primary/20 text-primary font-medium cursor-not-allowed opacity-85",
                    isPast && !wasRecorded && "bg-muted/30 border-border/70 text-muted-foreground cursor-not-allowed",
                    isFuture && "bg-background border-border/70 text-foreground hover:border-primary/50 hover:bg-[var(--button-neutral-hover)] cursor-pointer shadow-2xs",
                  )}
                  title={isPast ? (wasRecorded ? "Recorded status" : "Stage skipped") : isCurrent ? "Current status" : `Move to ${st}`}
                >
                  <span className="text-ui-overline font-medium leading-tight truncate w-full px-0.5">
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
            <span className="text-xs font-semibold text-foreground">
              Incident Details
            </span>
            <span className="text-ui-caption text-muted-foreground font-medium">
              {safeFormatDate(report.submittedAt, "MMM d, yyyy · h:mm a")}
            </span>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <span className="text-ui-overline uppercase font-semibold tracking-wider text-muted-foreground block">
                Barangay & Street
              </span>
              <span className="font-semibold text-foreground block mt-0.5 text-xs">
                {report.barangay}
              </span>
              {report.street && (
                <span className="text-ui-caption text-muted-foreground block mt-0.5">
                  {report.street}
                </span>
              )}
            </div>

            <div>
              <span className="text-ui-overline uppercase font-semibold tracking-wider text-muted-foreground block">
                Reporter Information
              </span>
              <span className="font-semibold text-foreground block mt-0.5 text-xs">
                {report.submitterName}
              </span>
              {report.submitterEmail && (
                <span className="text-ui-caption text-muted-foreground block mt-0.5 truncate">
                  {report.submitterEmail}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Resident Description ── */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-foreground block">
            Resident Description
          </span>
          <div className="bg-muted/20 border border-border/70 rounded-xl p-3.5 text-xs text-foreground/90 leading-relaxed font-normal">
            {report.description || "No description provided."}
          </div>
        </div>

        {/* ── Evidence Photos ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Evidence Photos ({report.photos?.length || 0})</span>
            {report.photos && report.photos.length > 0 && (
              <span className="text-ui-overline text-muted-foreground font-normal">Click to enlarge</span>
            )}
          </div>

          {report.photos && report.photos.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {report.photos.map((photo, idx) => (
                <button
                  key={photo.id || idx}
                  type="button"
                  onClick={() => setPreviewPhoto(photo.url)}
                  className="relative w-20 h-20 rounded-xl bg-muted/30 border border-border/80 overflow-hidden group block cursor-pointer hover:border-primary/50 transition-all shadow-2xs shrink-0"
                  title="Click to view full photo"
                >
                  <img
                    src={photo.url}
                    alt={`Evidence photo ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-muted/20 border border-dashed border-border/80 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">No photos attached to this report.</p>
            </div>
          )}
        </div>

        {/* ── Official Response to Resident ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Official Resident Response
            </span>
            <span className="text-ui-caption text-muted-foreground font-medium">
              Visible to resident
            </span>
          </div>

          <Textarea
            placeholder="Type official notification message to be sent to the resident..."
            value={officialResponse}
            onChange={(e) => setOfficialResponse(e.target.value)}
            className="text-xs min-h-[80px] bg-muted/20 border border-border/70 rounded-xl p-3.5 resize-none leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/20 shadow-2xs"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleResponseSubmit}
              disabled={isSavingResponse || !officialResponse.trim() || (!!report.officialResponse && officialResponse.trim() === report.officialResponse)}
              className="h-8 text-xs px-3.5 rounded-xl font-semibold cursor-pointer shadow-xs disabled:opacity-40"
              loading={isSavingResponse}
              loadingLabel="Saving response…"
            >

              {report.officialResponse && officialResponse.trim() === report.officialResponse
                ? "Saved"
                : "Save Response"}
            </Button>
          </div>
        </div>

        {/* ── Internal Staff Notes ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Internal Notes</span>
            <Badge variant="secondary" className="text-ui-overline px-2 py-0.5 rounded-md font-medium">
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
                  <p className="text-ui-overline text-muted-foreground font-medium">
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
              className="h-8 text-xs px-4 rounded-xl font-semibold cursor-pointer shadow-2xs disabled:opacity-40"
              loading={isSavingNote}
              loadingLabel="Adding note…"
            >

              Add Note
            </Button>
          </div>
        </div>
      </div>

      {/* ── Pinned Bottom Action Bar ── */}
      <div className="px-5 py-3 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!report.isFalseReport && (
            <Button
              variant={report.isDuplicate ? "warning-outline" : "outline"}
              size="sm"
              disabled={isFlagging}
              onClick={() => openFlagDialog("duplicate")}
              className={"h-8 text-xs px-3 rounded-xl cursor-pointer font-semibold"}
            >
              {report.isDuplicate ? "Edit Duplicate" : "Flag Duplicate"}
            </Button>
          )}

          {!report.isDuplicate && (
            <Button
              variant={report.isFalseReport ? "destructive-outline" : "outline"}
              size="sm"
              disabled={isFlagging}
              onClick={() => openFlagDialog("false")}
              className={"h-8 text-xs px-3 rounded-xl cursor-pointer font-semibold"}
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
              className="h-8 text-xs px-3 rounded-xl font-semibold cursor-pointer"
            >
              Clear Flag
            </Button>
          )}
        </div>

        {onDeleteReport && (
          <Button
            variant="destructive-ghost"
            size="sm"
            disabled={isDeleting}
            onClick={() => setShowDeleteModal(true)}
            className="h-8 text-xs px-3 rounded-xl font-semibold border cursor-pointer ml-auto transition-colors"
          >
            Delete
          </Button>
        )}
      </div>

      {/* ── Photo Lightbox Modal ── */}
      <Dialog open={!!previewPhoto} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-[95vw] sm:max-w-2xl p-4 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <DialogTitle className="gw-heading text-sm text-foreground ">
              Evidence Photo Preview
            </DialogTitle>
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="gw-action-ghost w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
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
              <DialogTitle className="gw-heading text-base text-foreground">
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
              className="gw-action-ghost w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4 py-4">
            {/* If Duplicate: Clean Reference Search */}
            {flagType === "duplicate" && (
              <div className="space-y-1.5 relative">
                <label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span>Original Report Reference</span>
                  {selectedDuplicateCandidate && (
                    <span className="text-ui-overline text-emerald-600 dark:text-emerald-400 font-medium">
                      Linked
                    </span>
                  )}
                </label>
                <SearchInput
                  aria-label="Original report reference"
                  placeholder="e.g. RPT-2026-00012"
                  value={duplicateReference}
                  onChange={(value) => {
                    setDuplicateReference(value);
                    if (selectedDuplicateCandidate && value !== selectedDuplicateCandidate.reference_number) {
                      setSelectedDuplicateCandidate(null);
                    }
                  }}
                  className="tabular-nums placeholder:font-sans"
                  loading={isSearchingDuplicates}
                />

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
                        className="w-full px-3 py-2 text-left hover:bg-[var(--button-neutral-hover)] transition-colors flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="tabular-nums font-semibold text-foreground">
                          {candidate.reference_number}
                        </span>
                        <span className="text-ui-caption text-muted-foreground truncate max-w-[180px]">
                          {candidate.violation_type.replace(/_/g, " ")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Reason</label>
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
                    <span className="text-ui-overline px-1.5 py-0.2 rounded-md font-semibold bg-primary/20 text-primary">
                      Will Resolve
                    </span>
                  )}
                </div>
                <p className="text-ui-caption text-muted-foreground leading-relaxed">
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
              variant={flagType === "false" ? "destructive" : "warning"}
              className={"rounded-xl h-9 text-xs px-4 font-semibold cursor-pointer"}
              loading={isFlagging}
              loadingLabel={flagType === "duplicate" ? "Flagging duplicate…" : "Flagging report…"}
            >
              {flagType === "duplicate" ? (
                "Flag as Duplicate"
              ) : (
                "Mark Invalid"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        kind="dialog"
        open={showResolveModal}
        onOpenChange={(open) => !open && setShowResolveModal(false)}
        className="z-[200]"
        title="Resolve this report?"
        icon={<Check />}
        description="This finalizes the report. Its status cannot be changed again, and the resident will be notified."
        confirmLabel="Yes, resolve report"
        isPending={isUpdatingStatus}
        pendingLabel="Resolving..."
        onConfirm={async () => {
          const ok = await handleStatusSubmit("Resolved");
          if (ok) setShowResolveModal(false);
          return ok;
        }}
      >
        <p>Confirm only after the issue has been fully handled. To prevent incorrect records, resolved reports cannot be reopened or moved to another status.</p>
      </ConfirmationDialog>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmationDialog
        kind="dialog"
        open={showDeleteModal}
        onOpenChange={(open) => !open && setShowDeleteModal(false)}
        title="Remove Waste Report?"
        icon={<Trash2 />}
        variant="destructive"
        description={<>Are you sure you want to remove report <strong className="font-semibold text-foreground">{report.referenceNumber}</strong>? It will be removed from active lists, and the action will be recorded in the Audit Log.</>}
        confirmLabel="Remove Report"
        isPending={isDeleting}
        pendingLabel="Removing..."
        onConfirm={async () => {
          if (!onDeleteReport) return;
          try {
            setIsDeleting(true);
            await onDeleteReport(report.id);
            setShowDeleteModal(false);
            if (onClose) onClose();
          } catch {
            // The parent displays the error; keep the confirmation open for retry.
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </div>
  );
};

export default ReportDetailPanel;
