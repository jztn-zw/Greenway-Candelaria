import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { VIOLATION_OPTIONS, type ReportFormData } from "./types";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReportFormData;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  open,
  onOpenChange,
  form,
  onSubmit,
  isSubmitting,
}) => {
  const violation = VIOLATION_OPTIONS.find((v) => v.value === form.violationType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1 pb-3 border-b border-border/60">
          <DialogTitle className="text-lg sm:text-xl font-bold font-display text-foreground tracking-tight">
            Review Your Report
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Please verify all details before submitting to MENRO Candelaria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Summary Box */}
          <div className="rounded-xl border border-border/80 bg-muted/20 divide-y divide-border/60">
            {/* Violation Type */}
            {violation && (
              <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Violation Type
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground text-right">
                  {violation.label}
                </span>
              </div>
            )}

            {/* Location */}
            <div className="p-3 sm:p-3.5 flex items-start justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                Location
              </span>
              <div className="text-right min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  Brgy. {form.barangayName}
                </p>
                {form.streetOrLandmark && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {form.streetOrLandmark}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground block">
              Incident Description
            </span>
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 text-xs sm:text-sm text-foreground/90 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
              {form.description}
            </div>
          </div>

          {/* Photo Preview Strip */}
          {form.photos.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Attached Photos</span>
                <span className="font-semibold text-foreground">
                  {form.photos.length} {form.photos.length === 1 ? "photo" : "photos"}
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {form.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden border border-border/80 shrink-0 bg-muted/30"
                  >
                    <img
                      src={photo.preview}
                      alt="Evidence thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="grid grid-cols-2 gap-3 pt-4 border-t border-border/60 sm:space-x-0 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold border-border/80 hover:bg-muted/80 cursor-pointer active:scale-[0.99] transition-all"
          >
            Back & Edit
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs active:scale-[0.99] transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            <span>{isSubmitting ? "Submitting…" : "Confirm & Submit"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
