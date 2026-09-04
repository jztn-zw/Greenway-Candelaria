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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Camera, FileText, Send, Loader2, ShieldCheck } from "lucide-react";
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
      <DialogContent className="max-w-lg w-[95vw] sm:w-full rounded-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1 pb-2 border-b border-border/60">
          <DialogTitle className="text-xl font-bold font-display text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Review Your Report
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Please verify the details before sending your report to MENRO Candelaria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Violation Type */}
          {violation && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <violation.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Violation Type</p>
                <p className="text-sm font-bold text-foreground truncate">{violation.label}</p>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
              <p className="text-sm font-bold text-foreground">Barangay {form.barangayName}</p>
              {form.streetOrLandmark && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{form.streetOrLandmark}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Description
            </p>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
              {form.description}
            </p>
          </div>

          {/* Photo Preview Strip */}
          {form.photos.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  Attached Evidence
                </span>
                <span className="font-semibold text-primary">
                  {form.photos.length} photo{form.photos.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {form.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border shrink-0 bg-black/20"
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

        <DialogFooter className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50 sm:space-x-0 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full min-h-[48px] rounded-2xl text-sm font-bold gap-1.5 border-border hover:bg-muted/80"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Back & Edit</span>
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full min-h-[48px] rounded-2xl text-sm font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 shrink-0" />
            )}
            <span>{isSubmitting ? "Submitting…" : "Confirm"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
