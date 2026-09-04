import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Camera, FileText, Send, Loader2 } from "lucide-react";
import { VIOLATION_OPTIONS, type ReportFormData } from "./types";
import { cn } from "@/lib/utils";

interface ReviewScreenProps {
  form: ReportFormData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

const ReviewScreen = ({ form, onBack, onSubmit, isSubmitting }: ReviewScreenProps) => {
  const violation = VIOLATION_OPTIONS.find((v) => v.value === form.violationType);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground">Review Your Report</h2>
          <p className="text-sm text-muted-foreground">Please review the details before submitting.</p>
        </div>
      </div>

      {/* Violation Type */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Violation Type</p>
          {violation && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <violation.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{violation.label}</p>
                <p className="text-xs text-muted-foreground">{violation.description}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Location</p>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{form.barangayName}</p>
              {form.streetOrLandmark && (
                <p className="text-xs text-muted-foreground mt-0.5">{form.streetOrLandmark}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Description</p>
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/80 leading-relaxed">{form.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
            Photo Evidence
          </p>
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">{form.photos.length} photo{form.photos.length !== 1 ? "s" : ""} attached</span>
          </div>
          {form.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {form.photos.map((photo) => (
                <div key={photo.id} className="rounded-xl overflow-hidden border border-border">
                  <img src={photo.preview} alt="Evidence" className="w-full h-20 sm:h-24 object-cover" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="sm:flex-1 min-h-[50px] sm:min-h-[54px] rounded-2xl text-sm sm:text-base font-bold gap-2"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Go Back & Edit</span>
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="sm:flex-1 min-h-[50px] sm:min-h-[54px] rounded-2xl text-sm sm:text-base font-bold gap-2.5 shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span>{isSubmitting ? "Submitting…" : "Submit Report"}</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-4">
        Your report will be reviewed by MENRO staff. False reports may result in account penalties.
      </p>
    </div>
  );
};

export default ReviewScreen;
