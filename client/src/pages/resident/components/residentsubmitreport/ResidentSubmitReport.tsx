import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Send, AlertTriangle } from "lucide-react";
import ViolationTypeSelector from "./ViolationTypeSelector";
import LocationSection from "./LocationSection";
import DescriptionSection from "./DescriptionSection";
import PhotoUploadSection from "./PhotoUploadSection";
import FormProgressSidebar from "./FormProgressSidebar";
import DuplicateWarning from "./DuplicateWarning";
import SuccessScreen from "./SuccessScreen";
import ReviewScreen from "./ReviewScreen";
import type { ReportFormData } from "./types";
import { PageHeaderSkeleton, ReportFormSkeleton } from "@/components/PageLoadingSkeletons";

const DUPLICATE_BARANGAYS = ["Candelaria Proper", "Pahinga Norte"];

const generateRefNumber = () => {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 99999) + 1).padStart(5, "0");
  return `RPT-${year}-${num}`;
};

const ResidentSubmitReport = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<ReportFormData>({
    violationType: null,
    barangay: "",
    streetOrLandmark: "",
    pinLocation: null,
    description: "",
    photos: [],
    isAnonymous: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");

  const update = <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showDuplicate = useMemo(
    () => form.violationType && form.barangay && DUPLICATE_BARANGAYS.includes(form.barangay),
    [form.violationType, form.barangay]
  );

  const canSubmit = form.violationType && form.barangay && form.description.trim().length >= 10 && form.photos.length > 0;

  const handleReview = () => {
    if (!canSubmit) {
      toast.error("Please fill in all required fields including at least one photo.");
      return;
    }
    setReviewing(true);
  };

  const handleSubmit = () => {
    const ref = generateRefNumber();
    setReferenceNumber(ref);
    setSubmitted(true);
    setReviewing(false);
    toast.success("Report submitted successfully!");
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved! You can continue later from My Reports.");
  };

  const resetForm = () => {
    setForm({
      violationType: null,
      barangay: "",
      streetOrLandmark: "",
      pinLocation: null,
      description: "",
      photos: [],
      isAnonymous: false,
    });
    setSubmitted(false);
    setReviewing(false);
    setReferenceNumber("");
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (submitted) {
    return <SuccessScreen referenceNumber={referenceNumber} onSubmitAnother={resetForm} />;
  }

  if (reviewing) {
    return <ReviewScreen form={form} onBack={() => setReviewing(false)} onSubmit={handleSubmit} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-1">
        <PageHeaderSkeleton />
        <ReportFormSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Submit a Report</h1>
            <p className="text-sm text-muted-foreground">Report waste-related issues to the MENRO office of Candelaria.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Main Form */}
        <div className="flex-1 space-y-4 sm:space-y-5">
          {/* Section 1: Violation Type */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <ViolationTypeSelector
              value={form.violationType}
              onChange={(v) => update("violationType", v)}
            />
          </div>

          {/* Section 2: Location */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <LocationSection
              barangay={form.barangay}
              streetOrLandmark={form.streetOrLandmark}
              pinLocation={form.pinLocation}
              onBarangayChange={(v) => update("barangay", v)}
              onStreetChange={(v) => update("streetOrLandmark", v)}
              onPinLocationChange={(v) => update("pinLocation", v)}
            />
          </div>

          {/* Duplicate Warning */}
          {showDuplicate && (
            <DuplicateWarning barangay={form.barangay} />
          )}

          {/* Section 3: Description */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <DescriptionSection
              value={form.description}
              onChange={(v) => update("description", v)}
            />
          </div>

          {/* Section 4: Photos */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <PhotoUploadSection
              photos={form.photos}
              onPhotosChange={(v) => update("photos", v)}
            />
          </div>

          {/* Anonymous toggle */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Submit Anonymously</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your identity will be hidden from the report.
                </p>
              </div>
              <Switch
                checked={form.isAnonymous}
                onCheckedChange={(v) => update("isAnonymous", v)}
              />
            </div>
          </div>

          {/* Submit buttons */}
          <div className="space-y-3 pb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                className="sm:w-auto h-12 rounded-xl text-sm font-semibold gap-2"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </Button>
              <Button
                onClick={handleReview}
                disabled={!canSubmit}
                className="flex-1 h-12 rounded-xl text-sm font-semibold gap-2 shadow-lg shadow-primary/20"
                size="lg"
              >
                <Send className="w-4 h-4" />
                Review and Submit
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Your report will be reviewed by MENRO staff. False reports may result in account penalties.
            </p>
          </div>
        </div>

        {/* Sidebar - Hidden on mobile, shown at bottom on tablet */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-6">
            <FormProgressSidebar
              violationTypeSelected={!!form.violationType}
              barangaySelected={!!form.barangay}
              descriptionFilled={form.description.trim().length >= 10}
              photosAdded={form.photos.length > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentSubmitReport;
