import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Send,
  Loader2,
  MapPin,
  FileText,
  Camera,
  ArrowLeft,
  ShieldCheck,
  Navigation,
  Trash2,
  X,
} from "lucide-react";
import { VIOLATION_OPTIONS, type ReportFormData } from "./types";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReportFormData;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submissionStage?: "compressing" | "uploading" | "creating" | null;
  uploadProgress?: number;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  open,
  onOpenChange,
  form,
  onSubmit,
  isSubmitting,
  submissionStage,
  uploadProgress = 0,
}) => {
  const violation = VIOLATION_OPTIONS.find((v) => v.value === form.violationType);
  const ViolationIcon = violation?.icon || Trash2;
  const submissionLabel = submissionStage === "compressing"
    ? "Optimizing photos…"
    : submissionStage === "uploading"
      ? `Uploading photos… ${uploadProgress}%`
      : submissionStage === "creating"
        ? "Creating report…"
        : "Submitting…";
  const recoveredPreviewsRef = useRef<Record<string, string>>({});
  const [, setPreviewRevision] = useState(0);

  useEffect(() => {
    const activePhotoIds = new Set(form.photos.map((photo) => photo.id));

    Object.entries(recoveredPreviewsRef.current).forEach(([photoId, previewUrl]) => {
      if (activePhotoIds.has(photoId)) return;
      URL.revokeObjectURL(previewUrl);
      delete recoveredPreviewsRef.current[photoId];
    });
  }, [form.photos]);

  useEffect(() => () => {
    Object.values(recoveredPreviewsRef.current).forEach((previewUrl) =>
      URL.revokeObjectURL(previewUrl),
    );
  }, []);

  const recoverPreview = (photo: ReportFormData["photos"][number]) => {
    if (recoveredPreviewsRef.current[photo.id]) return;

    recoveredPreviewsRef.current[photo.id] = URL.createObjectURL(photo.file);
    setPreviewRevision((revision) => revision + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Modal Header */}
        <DialogHeader className="px-5 py-4 border-b border-border/60 flex flex-row items-center justify-between gap-3 text-left shrink-0 space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm sm:text-base font-bold font-display text-foreground tracking-tight truncate">
                Review Your Report
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                Please verify all details before submitting to MENRO Candelaria.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {/* Modal Body */}
        <div className="px-5 py-4 space-y-3.5 text-left overflow-y-auto max-h-[calc(85vh-130px)] scrollbar-thin">
          {/* Key Details Summary Card */}
          <div className="rounded-xl border border-border/80 bg-muted/25 divide-y divide-border/60 overflow-hidden shadow-2xs">
            {/* Violation Type */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
                  <ViolationIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">Violation Type</p>
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {violation ? violation.label : "General Waste Issue"}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">Incident Location</p>
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    Brgy. {form.barangayName || "Candelaria"}
                  </p>
                  {form.streetOrLandmark && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {form.streetOrLandmark}
                    </p>
                  )}
                </div>
              </div>

              {form.pinLocation && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted border border-border/70 px-2 py-0.5 rounded-full shrink-0">
                  <Navigation className="w-2.5 h-2.5" /> Pinned
                </span>
              )}
            </div>
          </div>

          {/* Incident Description */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold text-foreground">Incident Description</span>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 text-xs sm:text-sm text-foreground/90 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap break-words scrollbar-thin">
              {form.description && form.description.trim() ? (
                form.description
              ) : (
                <span className="italic text-muted-foreground text-xs">No additional description provided.</span>
              )}
            </div>
          </div>

          {/* Photo Evidence (Compact 5-Slot Square Grid) */}
          {form.photos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">Attached Photo Evidence</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/70">
                  {form.photos.length} Photo{form.photos.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                {form.photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-border/80 bg-muted/30 shadow-2xs group"
                  >
                    <img
                      src={recoveredPreviewsRef.current[photo.id] || photo.preview}
                      alt={`Evidence photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={() => recoverPreview(photo)}
                    />
                    <span className="absolute bottom-1 right-1 text-[9px] font-bold text-white/95 drop-shadow-sm bg-black/65 px-1.5 py-0.5 rounded-md leading-none backdrop-blur-xs">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MENRO Dispatch Reassurance Banner */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-muted/30 border border-border/70 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Submitted reports are logged and immediately forwarded to MENRO Candelaria officers.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center shrink-0">
          <div className="grid grid-cols-2 gap-3 w-full sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full h-10 sm:h-10.5 rounded-xl text-xs sm:text-sm font-semibold border-border/80 hover:bg-muted/80 cursor-pointer active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back & Edit</span>
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="w-full h-10 sm:h-10.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{submissionLabel}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirm & Submit</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
