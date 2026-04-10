import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Camera, EyeOff, FileText, Send } from "lucide-react";
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
              <p className="text-sm font-medium text-foreground">{form.barangay}</p>
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

      {/* Anonymous Status */}
      {form.isAnonymous && (
        <Card className="border border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3">
            <EyeOff className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Submitting Anonymously</p>
              <p className="text-xs text-muted-foreground">Your identity will be hidden from this report.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="sm:flex-1 h-12 rounded-xl text-sm font-semibold">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back & Edit
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="sm:flex-1 h-12 rounded-xl text-sm font-semibold gap-2 shadow-lg shadow-primary/20"
        >
          <Send className="w-4 h-4" />
          Submit Report
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-4">
        Your report will be reviewed by MENRO staff. False reports may result in account penalties.
      </p>
    </div>
  );
};

export default ReviewScreen;
