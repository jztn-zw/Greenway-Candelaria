import { FormDialogHeader } from "@/components/FormDialog";
import { formDialogStyles as modalStyles } from "@/components/formDialogStyles";
import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Send,
  MapPin,
  FileText,
  Camera,
  ArrowLeft,
  ShieldCheck,
  Navigation,
  Trash2,
} from "lucide-react";
import { VIOLATION_OPTIONS, type ReportFormData } from "./types";
import { reportStyles } from "./reportStyles";

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
}) => {
  const violation = VIOLATION_OPTIONS.find((v) => v.value === form.violationType);
  const ViolationIcon = violation?.icon || Trash2;
  const submissionLabel = submissionStage === "compressing"
    ? "Optimizing photos…"
    : submissionStage === "uploading"
      ? "Uploading photos…"
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
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isSubmitting) onOpenChange(nextOpen); }}>
      <DialogContent className={`${modalStyles.content} resident-report-review-dialog sm:max-w-lg`}>
        <FormDialogHeader title="Review Your Report" description="Check the details before submitting." icon={<ShieldCheck />} onClose={() => onOpenChange(false)} disabled={isSubmitting} />
        {/* Modal Body */}
        <div className={modalStyles.body}>
          {/* Key Details Summary Card */}
          <div className="rounded-md border border-border/80 bg-muted/25 divide-y divide-border/60 overflow-hidden shadow-2xs">
            {/* Violation Type */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs">
                  <ViolationIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-ui-caption font-medium text-muted-foreground">Violation Type</p>
                  <p className="text-xs lg:text-sm font-bold text-foreground break-words">
                    {violation ? violation.label : "General Waste Issue"}
                  </p>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="p-3.5 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground shrink-0 shadow-2xs mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-ui-caption font-medium text-muted-foreground">Incident Location</p>
                  <p className="text-xs lg:text-sm font-bold text-foreground">
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
                <span className="inline-flex items-center gap-1 text-ui-overline font-semibold text-muted-foreground bg-muted border border-border/70 px-2 py-0.5 rounded-md shrink-0">
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
            <div className="p-3.5 rounded-md border border-border/70 bg-muted/20 text-xs lg:text-sm text-foreground/90 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap break-words scrollbar-thin">
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
                <span className="px-2 py-0.5 rounded-md text-ui-overline font-bold bg-muted text-muted-foreground border border-border/70">
                  {form.photos.length} Photo{form.photos.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className={reportStyles.review}>
                {form.photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-md overflow-hidden border border-border/80 bg-muted/30 shadow-2xs group"
                  >
                    <img
                      src={recoveredPreviewsRef.current[photo.id] || photo.preview}
                      alt={`Evidence photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 "
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
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-md bg-muted/30 border border-border/70 text-ui-caption text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Submitted reports are logged and immediately forwarded to MENRO Candelaria officers.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={modalStyles.footer}>
          <div className="grid w-full min-w-0 grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className={`${modalStyles.cancelButton} min-w-0 gap-1.5 px-2 text-[11px] [&_svg]:size-3`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="truncate">Back</span>
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingLabel={submissionLabel}
              className={`${modalStyles.primaryButton} min-w-0 px-2 text-[11px] [&_svg]:size-3`}
            >
              <Send className="w-4 h-4" />
              <span className="truncate">Submit report</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
