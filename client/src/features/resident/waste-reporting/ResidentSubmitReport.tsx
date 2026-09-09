import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import { Send, AlertTriangle } from "lucide-react";
import ViolationTypeSelector from "./ViolationTypeSelector";
import LocationSection from "./LocationSection";
import DescriptionSection from "./DescriptionSection";
import PhotoUploadSection from "./PhotoUploadSection";
import FormProgressSidebar from "./FormProgressSidebar";
import DuplicateWarning from "./DuplicateWarning";
import SuccessScreen from "./SuccessScreen";
import ReviewModal from "./ReviewModal";
import type { ReportFormData } from "./types";
import { VIOLATION_TYPE_MAP } from "./types";
import { ReportFormSkeleton } from "@/components/PageLoadingSkeletons";
import { uploadReportPhotos, submitReport } from "@/services/reportsService";

// Barangay names known to have duplicate reports — used to show DuplicateWarning
const DUPLICATE_BARANGAY_NAMES = ["Candelaria Proper", "Pahinga Norte"];
const DRAFT_STORAGE_KEY = "greenway_report_draft_v1";

const ResidentSubmitReport = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const [form, setForm] = useState<ReportFormData>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          violationType: parsed.violationType || null,
          barangayId: parsed.barangayId || "",
          barangayName: parsed.barangayName || "",
          streetOrLandmark: parsed.streetOrLandmark || "",
          pinLocation: parsed.pinLocation || null,
          description: parsed.description || "",
          photos: [],
        };
      }
    } catch {
      // Fallback
    }
    return {
      violationType: null,
      barangayId: "",
      barangayName: "",
      streetOrLandmark: "",
      pinLocation: null,
      description: "",
      photos: [],
    };
  });

  const hasDraft = useMemo(() => {
    return Boolean(
      form.violationType ||
      form.barangayId ||
      form.streetOrLandmark.trim() ||
      form.description.trim() ||
      form.photos.length > 0
    );
  }, [
    form.violationType,
    form.barangayId,
    form.streetOrLandmark,
    form.description,
    form.photos.length,
  ]);

  // Auto-save form draft whenever text or selections change
  useEffect(() => {
    try {
      const draftData = {
        violationType: form.violationType,
        barangayId: form.barangayId,
        barangayName: form.barangayName,
        streetOrLandmark: form.streetOrLandmark,
        pinLocation: form.pinLocation,
        description: form.description,
      };
      if (form.description || form.violationType || form.barangayId) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      }
    } catch {
      // Ignore storage errors
    }
  }, [
    form.violationType,
    form.barangayId,
    form.barangayName,
    form.streetOrLandmark,
    form.pinLocation,
    form.description,
  ]);

  const [submitted, setSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");

  const update = <K extends keyof ReportFormData>(
    key: K,
    value: ReportFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBarangayChange = useCallback(
    (id: string, name: string) => {
      setForm((prev) => ({ ...prev, barangayId: id, barangayName: name }));
    },
    [],
  );

  const showDuplicate = useMemo(
    () =>
      form.violationType &&
      form.barangayName &&
      DUPLICATE_BARANGAY_NAMES.includes(form.barangayName),
    [form.violationType, form.barangayName],
  );

  const canSubmit =
    form.violationType &&
    form.barangayId &&
    form.description.trim().length >= 10 &&
    form.photos.length > 0;

  const handleReview = () => {
    if (!canSubmit) {
      toast.error(
        "Please fill in all required fields including at least one photo.",
      );
      return;
    }
    setReviewModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.violationType || !form.barangayId) return;
    setIsSubmitting(true);

    try {
      // Step 1: Upload photos to Cloudinary
      let photoUrls: string[] = [];
      if (form.photos.length > 0) {
        photoUrls = await uploadReportPhotos(
          form.photos.map((p) => p.file),
        );
      }

      // Step 2: Submit report to backend
      const created = await submitReport({
        barangay_id: form.barangayId,
        violation_type: VIOLATION_TYPE_MAP[form.violationType],
        landmark: form.streetOrLandmark || undefined,
        description: form.description,
        pin_lat: form.pinLocation?.[0],
        pin_lng: form.pinLocation?.[1],
        photos: photoUrls,
      });

      // Step 3: Clear saved draft from localStorage
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // Ignore
      }

      // Step 4: Show success with real reference number from backend
      setReferenceNumber(created.reference_number);
      setSubmitted(true);
      setReviewModalOpen(false);
      toast.success("Report submitted successfully!");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit report. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setForm({
      violationType: null,
      barangayId: "",
      barangayName: "",
      streetOrLandmark: "",
      pinLocation: null,
      description: "",
      photos: [],
    });
    setSubmitted(false);
    setReviewModalOpen(false);
    setReferenceNumber("");
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (submitted) {
    return (
      <SuccessScreen referenceNumber={referenceNumber} onSubmitAnother={resetForm} />
    );
  }

  if (isLoading) {
    return <ReportFormSkeleton />;
  }

  return (
    <div className="space-y-1">
      {/* ── Page Header ── */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display">
              Submit a Report
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Report waste-related issues to the MENRO office of Candelaria.
            </p>
          </div>
        </div>
      </div>

      {/* Top Action Row for Clear Draft */}
      {hasDraft && (
        <div className="flex justify-end items-center px-1 mb-2">
          <button
            type="button"
            onClick={resetForm}
            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded-lg px-2.5 py-1 font-medium transition-all cursor-pointer active:scale-95"
          >
            Clear draft
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
        {/* Main Form */}
        <div className="flex-1 w-full space-y-4 sm:space-y-5">
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
              barangayId={form.barangayId}
              barangayName={form.barangayName}
              streetOrLandmark={form.streetOrLandmark}
              onBarangayChange={handleBarangayChange}
              onStreetChange={(v) => update("streetOrLandmark", v)}
            />
          </div>

          {/* Duplicate Warning */}
          {showDuplicate && <DuplicateWarning barangay={form.barangayName} />}

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

          {/* Submit buttons */}
          <div className="space-y-3 pb-6 pt-2">
            <Button
              onClick={handleReview}
              disabled={!canSubmit || isSubmitting}
              className="w-full min-h-[52px] sm:min-h-[56px] py-3.5 px-6 rounded-2xl text-sm sm:text-base font-bold gap-2.5 shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Review and Submit</span>
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Your report will be reviewed by MENRO staff. False reports may
              result in account penalties.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            <FormProgressSidebar
              violationTypeSelected={!!form.violationType}
              barangaySelected={!!form.barangayId}
              descriptionFilled={form.description.trim().length >= 10}
              photosAdded={form.photos.length > 0}
            />
          </div>
        </div>
      </div>

      {/* Review Modal Dialog */}
      <ReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        form={form}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default ResidentSubmitReport;
