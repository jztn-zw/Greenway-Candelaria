import LoadingImage from "@/components/common/LoadingImage";
import { getActionErrorMessage } from "@/lib/feedbackMessages";
import ActionButtonLoader from "@/components/common/ActionButtonLoader";
import { SearchInput } from "@/components/common/SearchInput";
import { WasteReportDetailBodySkeleton } from "@/components/loading/PageLoadingSkeletons";
import { adminWasteReportStyles as styles } from "@/components/common/communityContentStyles";
import { getStatusBadgeStyle, badgeStyles } from "@/components/ui/badgeStyles";
import { AdminConfirmationDialog as ConfirmationDialog, AdminModal, AdminModalContent as DialogContent } from "@/components/admin/AdminModal";
import { formDialogStyles } from "@/components/dialogs/formDialogStyles";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminFetch } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fetchAdminReports, type AdminReportItem } from "@/services/reportsService";
import { AlertOctagon, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, X } from "lucide-react";
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
  onUpdateStatus?: (status: string) => Promise<void>;
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
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const statusOrder: ReportStatus[] = ["Submitted", "Under Review", "Dispatched", "Resolved"];
const invalidReasons = ["Insufficient evidence", "Outside service area", "No issue found", "Other"];

const ReportDetailPanel = ({
  report,
  isLoading = false,
  onClose,
  onUpdateStatus,
  onAddNote,
  onFlagReport,
  onFlagDialogOpenChange,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: ReportDetailPanelProps) => {
  const fetchAdmin = useAdminFetch();
  const [internalNote, setInternalNote] = useState("");  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagType, setFlagType] = useState<"duplicate" | "false" | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [invalidReason, setInvalidReason] = useState("");
  const [duplicateReference, setDuplicateReference] = useState("");
  const [selectedDuplicateCandidate, setSelectedDuplicateCandidate] = useState<AdminReportItem | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<AdminReportItem[]>([]);
  const [isSearchingDuplicates, setIsSearchingDuplicates] = useState(false);
  const [hasSearchedDuplicates, setHasSearchedDuplicates] = useState(false);
  const [duplicateSearchFailed, setDuplicateSearchFailed] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const reportId = report?.id;
  const previousReportId = useRef(reportId);
  useEffect(() => {
    if (previousReportId.current !== reportId) {
      setInternalNote("");
      previousReportId.current = reportId;
    }
  }, [reportId]);

  useEffect(() => {
    if (flagType !== "duplicate" || duplicateReference.trim().length < 2) {
      setDuplicateMatches([]);
      setIsSearchingDuplicates(false);
      setHasSearchedDuplicates(false);
      setDuplicateSearchFailed(false);
      return;
    }
    // Don't re-trigger search if the reference matches the currently selected candidate
    if (
      selectedDuplicateCandidate &&
      selectedDuplicateCandidate.reference_number.toLowerCase() === duplicateReference.trim().toLowerCase()
    ) {
      setDuplicateMatches([]);
      setIsSearchingDuplicates(false);
      setHasSearchedDuplicates(false);
      setDuplicateSearchFailed(false);
      return;
    }
    let active = true;
    const searchTerm = duplicateReference.trim();
    setDuplicateMatches([]);
    setIsSearchingDuplicates(true);
    setHasSearchedDuplicates(false);
    setDuplicateSearchFailed(false);
    const timer = window.setTimeout(async () => {
      try {
        const params = {
          search: searchTerm,
          barangay_id: report?.barangayId,
          limit: 50,
          sort: "date-desc",
        };
        const result = await fetchAdmin("reports", ["duplicate-search", params], () => fetchAdminReports(params));
        if (active) {
          const normalizedTerm = searchTerm.toLowerCase();
          setDuplicateMatches(result.reports.filter(
              (candidate) =>
                candidate.id !== report?.id &&
                candidate.reference_number.toLowerCase().includes(normalizedTerm) &&
                candidate.status !== "RESOLVED" &&
                !candidate.is_duplicate &&
                !candidate.is_false &&
                candidate.barangay_id === report?.barangayId,
            ).slice(0, 8));
          setHasSearchedDuplicates(true);
        }
      } catch {
        if (active) {
          setDuplicateMatches([]);
          setDuplicateSearchFailed(true);
          setHasSearchedDuplicates(true);
        }
      } finally {
        if (active) setIsSearchingDuplicates(false);
      }
    }, 200);
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
      await onUpdateStatus(backendStatus);
      toast.success(`Status updated to ${newStatus}`);
      return true;
    } catch (error) {
      toast.error("Could not update report status", { description: getActionErrorMessage(error) });
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

  const handleNoteSubmit = async () => {
    if (!onAddNote || !internalNote.trim() || isSavingNote) return;
    setIsSavingNote(true);
    try {
      await onAddNote(internalNote.trim());
      setInternalNote("");
      toast.success("Internal note added");
    } catch (error) {
      toast.error("Could not add the internal note", { description: getActionErrorMessage(error) });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleFlag = async (payload: Parameters<NonNullable<ReportDetailPanelProps["onFlagReport"]>>[0]) => {
    if (!onFlagReport || isFlagging) return false;
    setIsFlagging(true);
    try {
      await onFlagReport(payload);
      toast.success(payload.is_false ? "Report closed as invalid" : payload.is_duplicate ? "Duplicate report closed" : "Report flag updated");
      return true;
    } catch (err) {
      toast.error("Failed to update flag", { description: getActionErrorMessage(err) });
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
    setInvalidReason(report.falseReason ? (invalidReasons.includes(report.falseReason) ? report.falseReason : "Other") : "");
    onFlagDialogOpenChange?.(true);
  };

  const handleFlagSubmit = async () => {
    if (!flagType) return;
    const reason = flagType === "false" && invalidReason !== "Other" ? invalidReason : flagReason.trim();
    if (flagType === "false" && !reason) {
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
            resolve: true,
          }
        : {
            is_false: true,
            false_reason: reason,
            resolve: true,
          };

    const saved = await handleFlag(payload);
    if (saved) {
      setFlagType(null);
      setSelectedDuplicateCandidate(null);
      onFlagDialogOpenChange?.(false);
    }
  };

  return (
    <div className={styles.drawer} aria-busy={isLoading}>
      {/* ── Inspector Header ── */}
      <div className="px-3 sm:px-5 py-3.5 border-b border-border/60 bg-muted/15 shrink-0">
        <div className="waste-report-detail-header flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Reference Number & Copy */}
            <div className="flex items-center gap-2">
              <span className="min-w-0 break-all text-sm font-semibold tracking-tight text-foreground">
                {report.referenceNumber}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(report.referenceNumber); toast.success("Reference copied"); }
                  catch { toast.error("Could not copy the report reference. Select it and copy it manually."); }
                }}
                className="gw-action-ghost shrink-0 p-1 rounded transition-colors cursor-pointer"
                title="Copy reference number"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {isLoading && (
                <ActionButtonLoader className="gw-action-loader--compact text-muted-foreground" />
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
                  Invalid Report
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
                  title="Previous Report"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="h-7 w-7 rounded-lg disabled:opacity-30 cursor-pointer"
                  title="Next Report"
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
      <div className={styles.detailBody}>
        {isLoading ? <WasteReportDetailBodySkeleton /> : <>
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
                    "flex min-h-8 flex-col items-center justify-center py-1.5 px-1 rounded-lg text-center transition-all border",
                    isCurrent && "bg-primary border-primary text-primary-foreground font-semibold shadow-xs cursor-default",
                    isPast && wasRecorded && "bg-primary/10 border-primary/20 text-primary font-medium cursor-not-allowed opacity-85",
                    isPast && !wasRecorded && "bg-muted/30 border-border/70 text-muted-foreground cursor-not-allowed",
                    isFuture && "bg-background border-border/70 text-foreground hover:border-primary/50 hover:bg-[var(--button-neutral-hover)] cursor-pointer shadow-2xs",
                  )}
                  title={isPast ? (wasRecorded ? "Recorded status" : "Stage skipped") : isCurrent ? "Current status" : `Move to ${st}`}
                >
                  <span className="text-ui-overline font-medium leading-tight whitespace-normal w-full px-0.5">
                    {st}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Unified Incident Details Card ── */}
        <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-1.5">
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
              <span className="font-semibold text-foreground block mt-0.5 text-sm break-words">
                {report.submitterName}
              </span>
              <span className="text-ui-caption text-muted-foreground block mt-0.5 [overflow-wrap:anywhere]">
                {report.submitterUsername ? `@${report.submitterUsername}` : "Username not set"}
              </span>
              {report.submitterId && (
                <Link
                  className="gw-action-link mt-2 inline-flex min-h-8 items-center gap-1 rounded-md text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  to={`/admin/residents?residentId=${encodeURIComponent(report.submitterId)}`}
                >
                  View Resident Profile
                  <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
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
              <span className="text-ui-overline text-muted-foreground font-normal">Click to Enlarge</span>
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
                  <LoadingImage
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

        {/* ── Internal Staff Notes ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Internal Notes</span>
            <Badge variant="secondary" className="text-ui-overline px-2 py-0.5 rounded-md font-medium">
              Staff Only
            </Badge>
          </div>

          {report.internalNotes && report.internalNotes.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
              {report.internalNotes.map((note, idx) => (
                <div
                  key={note.id || idx}
                  className="bg-muted/30 rounded-xl p-3 border border-border/60 space-y-1 break-words"
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
        </>}
      </div>

      {/* ── Pinned Bottom Action Bar ── */}
      <div className={styles.footer}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {!report.isFalseReport && (
            <Button
              variant={report.isDuplicate ? "warning-outline" : "outline"}
              size="sm"
              disabled={isLoading || isFlagging || report.status === "Resolved"}
              onClick={() => openFlagDialog("duplicate")}
              className={"h-8 text-xs px-3 rounded-xl cursor-pointer font-semibold"}
            >
              {report.isDuplicate ? "Duplicate Report" : "Flag Duplicate"}
            </Button>
          )}

          {!report.isDuplicate && (
            <Button
              variant={report.isFalseReport ? "destructive-outline" : "outline"}
              size="sm"
              disabled={isLoading || isFlagging || report.status === "Resolved"}
              onClick={() => openFlagDialog("false")}
              className={"h-8 text-xs px-3 rounded-xl cursor-pointer font-semibold"}
            >
              {report.isFalseReport ? "Invalid Report" : "Mark Invalid"}
            </Button>
          )}

          {/* Quick Clear button if flagged */}
          {(report.isDuplicate || report.isFalseReport) && report.status !== "Resolved" && (
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || isFlagging}
              onClick={() => handleFlag(report.isDuplicate ? { is_duplicate: false } : { is_false: false })}
              className="h-8 text-xs px-3 rounded-xl font-semibold cursor-pointer"
            >
              Clear Flag
            </Button>
          )}
        </div>

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
          <div className="relative min-h-48 py-2">
            {previewPhoto && (
              <LoadingImage
                src={previewPhoto}
                alt="Evidence preview"
                className="w-full max-h-[70vh] object-contain rounded-xl bg-muted/40"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Simple Flag Modal (Duplicate & False Report) ── */}
      <AdminModal
        open={!!flagType}
        pending={isFlagging}
        className="z-[200]"
        title={flagType === "duplicate" ? "Flag as Duplicate" : "Mark as Invalid Report"}
        description={<>Report {report.referenceNumber} • {report.barangay}</>}
        icon={flagType === "duplicate" ? <Copy /> : <AlertOctagon />}
        tone={flagType === "duplicate" ? "warning" : "danger"}
        closeLabel="Close report review"
        onOpenChange={(open) => {
          if (!open) {
            setFlagType(null);
            setSelectedDuplicateCandidate(null);
          }
          onFlagDialogOpenChange?.(open);
        }}
        footer={<>
          <Button type="button" variant="outline" disabled={isFlagging} className={formDialogStyles.cancelButton}
            onClick={() => { setFlagType(null); setSelectedDuplicateCandidate(null); onFlagDialogOpenChange?.(false); }}>
            Cancel
          </Button>
          <Button type="button" onClick={handleFlagSubmit} disabled={isFlagging}
            variant={flagType === "false" ? "destructive" : "warning"} className={formDialogStyles.primaryButton}
            loading={isFlagging} loadingLabel={flagType === "duplicate" ? "Flagging duplicate…" : "Flagging report…"}>
            {flagType === "duplicate" ? "Close Duplicate & Notify" : "Close Report & Notify"}
          </Button>
        </>}
      >
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
                  id="duplicate-report-search"
                  aria-label="Original report reference"
                  placeholder="Search by report reference…" compactPlaceholder="Report reference…"
                  value={duplicateReference}
                  onChange={(value) => {
                    setDuplicateReference(value);
                    setDuplicateMatches([]);
                    setHasSearchedDuplicates(false);
                    setDuplicateSearchFailed(false);
                    if (selectedDuplicateCandidate && value !== selectedDuplicateCandidate.reference_number) {
                      setSelectedDuplicateCandidate(null);
                    }
                  }}
                  className="tabular-nums placeholder:font-sans"
                  loading={isSearchingDuplicates}
                />

                {duplicateReference.trim().length < 2 && !selectedDuplicateCandidate && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Type at least 2 characters to find matching reports in this barangay.
                  </p>
                )}

                {duplicateMatches.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-border/80 bg-popover shadow-lg">
                    <p className="sticky top-0 z-10 bg-popover px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                      Matching reports in {report.barangay}
                    </p>
                    <div id="duplicate-report-matches" role="group" aria-label="Matching original reports" className="max-h-52 overflow-y-auto divide-y divide-border/60">
                      {duplicateMatches.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          aria-label={`${candidate.reference_number}, ${candidate.violation_type.replace(/_/g, " ")}${candidate.landmark ? `, ${candidate.landmark}` : ""}`}
                          onClick={() => {
                            setDuplicateReference(candidate.reference_number);
                            setSelectedDuplicateCandidate(candidate);
                            setDuplicateMatches([]);
                          }}
                          className="w-full px-3 py-2.5 text-left hover:bg-[var(--button-neutral-hover)] focus-visible:bg-[var(--button-neutral-hover)] focus-visible:outline-none transition-colors text-xs cursor-pointer"
                        >
                          <span className="block min-w-0">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="tabular-nums font-semibold text-foreground">{candidate.reference_number}</span>
                              <span className="shrink-0 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                                {candidate.status.toLowerCase().replace(/_/g, " ")}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] capitalize text-muted-foreground">
                              {candidate.violation_type.replace(/_/g, " ")}
                              {candidate.landmark ? ` · ${candidate.landmark}` : ""}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {hasSearchedDuplicates && !isSearchingDuplicates && duplicateMatches.length === 0 && !selectedDuplicateCandidate && (
                  <div id="duplicate-report-matches" role="status" className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-border/80 bg-popover px-3 py-2.5 text-xs text-muted-foreground shadow-lg">
                    {duplicateSearchFailed
                      ? "Could not load matching reports. Try searching again."
                      : `No matching open reports found in ${report.barangay}.`}
                  </div>
                )}
              </div>
            )}

            {flagType === "false" && <div className="space-y-1.5">
              <label htmlFor="flag-reason" className="text-xs font-medium text-foreground">Reason</label>
              <Select value={invalidReason} onValueChange={(value) => { setInvalidReason(value); setFlagReason(""); }}>
                <SelectTrigger id="flag-reason" fieldSize="compact"><SelectValue placeholder="Select a review reason" /></SelectTrigger>
                <SelectContent>{invalidReasons.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent>
              </Select>
              {invalidReason === "Other" && <Textarea aria-label="Other review reason" value={flagReason} onChange={event => setFlagReason(event.target.value)} maxLength={250} placeholder="Briefly explain the review outcome…" className="min-h-[80px] text-xs resize-none" />}
            </div>}
            <p className="admin-modal-notice">
              {flagType === "duplicate"
                ? "This duplicate will be closed and its resident notified. The original report will keep its current status."
                : "This report will be closed as invalid. The resident will receive your review reason."}
            </p>
      </AdminModal>

      <ConfirmationDialog
        kind="dialog"
        open={showResolveModal}
        onOpenChange={(open) => !open && setShowResolveModal(false)}
        className="z-[200]"
        title="Resolve This Report?"
        icon={<Check />}
        description="This finalizes the report. Its status cannot be changed again, and the resident will be notified."
        confirmLabel="Yes, Resolve Report"
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

    </div>
  );
};

export default ReportDetailPanel;
