import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import { Send, RotateCcw } from "lucide-react";
import ViolationTypeSelector from "./ViolationTypeSelector";
import LocationSection from "./LocationSection";
import DescriptionSection from "./DescriptionSection";
import PhotoUploadSection from "./PhotoUploadSection";
import DuplicateWarning from "./DuplicateWarning";
import SuccessScreen from "./SuccessScreen";
import ReviewModal from "./ReviewModal";
import { compressReportImages } from "./imageCompression";
import type { ReportFormData } from "./types";
import { VIOLATION_TYPE_MAP } from "./types";
import { ReportFormSkeleton } from "@/components/PageLoadingSkeletons";
import {
  checkSimilarReport,
  submitReport,
  uploadReportPhotos,
} from "@/services/reportsService";
const DRAFT_STORAGE_KEY = "greenway_report_draft_v1";
type SubmissionStage = "compressing" | "uploading" | "creating" | null;

const revokePhotoPreviews = (photos: ReportFormData["photos"]) => {
  photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
};

const ResidentSubmitReport = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<SubmissionStage>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [hasSimilarReport, setHasSimilarReport] = useState(false);

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

  const photoPreviewsRef = useRef(form.photos);

  useEffect(() => {
    photoPreviewsRef.current = form.photos;
  }, [form.photos]);

  useEffect(() => {
    return () => revokePhotoPreviews(photoPreviewsRef.current);
  }, []);

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
      const hasPersistableDraft = Boolean(
        form.violationType ||
          form.barangayId ||
          form.streetOrLandmark.trim() ||
          form.description.trim() ||
          form.pinLocation,
      );

      if (hasPersistableDraft) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
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

  useEffect(() => {
    if (!form.barangayId || !form.violationType) {
      setHasSimilarReport(false);
      return;
    }

    // Do not leave a warning from the previously selected barangay/type on
    // screen while the debounced check for the new selection is in progress.
    setHasSimilarReport(false);

    let isCurrent = true;
    void (async () => {
      try {
        const hasSimilar = await checkSimilarReport(
          form.barangayId,
          VIOLATION_TYPE_MAP[form.violationType],
        );
        if (isCurrent) setHasSimilarReport(hasSimilar);
      } catch {
        // This is advisory only. A transient check failure must not block reports.
        if (isCurrent) setHasSimilarReport(false);
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [form.barangayId, form.violationType]);

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

  const canSubmit = Boolean(
    form.violationType &&
      form.barangayId &&
      form.description.trim().length >= 10 &&
      form.photos.length > 0,
  );

  const handleReview = () => {
    if (!canSubmit) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    setReviewModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !form.violationType || !form.barangayId) {
      setShowValidation(true);
      setReviewModalOpen(false);
      return;
    }
    setIsSubmitting(true);
    setSubmissionStage("compressing");
    setUploadProgress(0);

    try {
      // Step 1: Upload photos to Cloudinary
      let photoUrls: string[] = [];
      if (form.photos.length > 0) {
        const optimizedPhotos = await compressReportImages(
          form.photos.map((photo) => photo.file),
          (completed, total) => setUploadProgress(Math.round((completed / total) * 100)),
        );
        setSubmissionStage("uploading");
        setUploadProgress(0);
        photoUrls = await uploadReportPhotos(
          optimizedPhotos,
          setUploadProgress,
        );
      }

      // Step 2: Clean and submit report to backend
      setSubmissionStage("creating");
      const cleanedDescription = form.description
        .split(/\n\s*\n/)
        .map((b) => b.trim())
        .filter(Boolean)
        .filter((block, _, arr) => {
          if (/^[^\n?]+\?\s*$/.test(block) && arr.length > 1) {
            return false;
          }
          return true;
        })
        .join("\n\n");

      const created = await submitReport({
        barangay_id: form.barangayId,
        violation_type: VIOLATION_TYPE_MAP[form.violationType],
        landmark: form.streetOrLandmark || undefined,
        description: cleanedDescription || form.description,
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
      revokePhotoPreviews(form.photos);
      setForm((previous) => ({ ...previous, photos: [] }));
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
      setSubmissionStage(null);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    revokePhotoPreviews(form.photos);
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
    setShowValidation(false);
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
      <div className="hidden max-w-3xl mx-auto mb-6 sm:flex sm:items-center sm:justify-between sm:gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
            Submit a Waste Report
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Report waste-related violations and hazards directly to MENRO Candelaria.
          </p>
        </div>

        {hasDraft && (
          <button
            type="button"
            onClick={resetForm}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border/80 hover:border-destructive/30 rounded-xl px-3 py-1.5 font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear draft</span>
          </button>
        )}
      </div>

      {/* Main Form Container */}
      <div className="max-w-3xl mx-auto w-full space-y-5">
        <div className="space-y-6 divide-y divide-border/60 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-7">
          <div>
            <ViolationTypeSelector
              value={form.violationType}
              onChange={(v) => update("violationType", v)}
              showError={showValidation && !form.violationType}
              onClearDraft={hasDraft ? resetForm : undefined}
            />
          </div>
          <div className="pt-6">
            <LocationSection
              barangayId={form.barangayId}
              barangayName={form.barangayName}
              streetOrLandmark={form.streetOrLandmark}
              onBarangayChange={handleBarangayChange}
              onStreetChange={(v) => update("streetOrLandmark", v)}
              showError={showValidation && !form.barangayId}
            />
          </div>
          {hasSimilarReport && (
            <div className="pt-6">
              <DuplicateWarning barangay={form.barangayName} />
            </div>
          )}
          <div className="pt-6">
            <DescriptionSection
              value={form.description}
              onChange={(v) => update("description", v)}
              violationType={form.violationType}
              showError={showValidation && form.description.trim().length < 10}
            />
          </div>
          <div className="pt-6">
            <PhotoUploadSection
              photos={form.photos}
              onPhotosChange={(v) => update("photos", v)}
              showError={showValidation && form.photos.length === 0}
            />
          </div>
        </div>

        <div className="pb-3 sm:pb-8">
          <Button
            onClick={handleReview}
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl text-sm font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-sm active:scale-[0.99] disabled:cursor-not-allowed"
            size="lg"
          >
            <Send className="w-4 h-4" />
            <span>Review and Submit Report</span>
          </Button>
        </div>
      </div>

      {/* Review Modal Dialog */}
      <ReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        form={form}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submissionStage={submissionStage}
        uploadProgress={uploadProgress}
      />
    </div>
  );
};

export default ResidentSubmitReport;
