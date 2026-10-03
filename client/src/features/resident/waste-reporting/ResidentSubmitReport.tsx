import { useResidentQuery, useResidentMutation } from "@/lib/residentQuery";
import useAuthStore from "@/store/authStore";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import { Send, RotateCcw } from "lucide-react";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { reportStyles } from "./reportStyles";
import ViolationTypeSelector from "./ViolationTypeSelector";
import LocationSection from "./LocationSection";
import DescriptionSection from "./DescriptionSection";
import PhotoUploadSection from "./PhotoUploadSection";
import DuplicateWarning from "./DuplicateWarning";
import SuccessScreen from "./SuccessScreen";
import ReviewModal from "./ReviewModal";
import { compressReportImages } from "./imageCompression";
import { prepareReportDescription } from "./reportDescription";
import type { ReportFormData } from "./types";
import { VIOLATION_TYPE_MAP } from "./types";
import {
  checkSimilarReport,
  submitReport,
  uploadReportPhotos,
} from "@/services/reportsService";
type SubmissionStage = "compressing" | "uploading" | "creating" | null;

const revokePhotoPreviews = (photos: ReportFormData["photos"]) => {
  photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
};

const ResidentSubmitReport = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const draftStorageKey = `greenway_report_draft_v2:${userId}`;
  const createReport = useResidentMutation(submitReport, "reports");
  const uploadPhotos = useResidentMutation(uploadReportPhotos);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<SubmissionStage>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const [form, setForm] = useState<ReportFormData>(() => {
    try {
      const saved = localStorage.getItem(draftStorageKey);
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
        localStorage.setItem(draftStorageKey, JSON.stringify(draftData));
      } else {
        localStorage.removeItem(draftStorageKey);
      }
    } catch {
      // Ignore storage errors
    }
  }, [
    draftStorageKey,
    form.violationType,
    form.barangayId,
    form.barangayName,
    form.streetOrLandmark,
    form.pinLocation,
    form.description,
  ]);

  const similarQuery = useResidentQuery("reports", ["similar", form.barangayId, form.violationType],
    () => checkSimilarReport(form.barangayId, VIOLATION_TYPE_MAP[form.violationType!]),
    { enabled: !!form.barangayId && !!form.violationType });
  const hasSimilarReport = similarQuery.data ?? false;

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

  const preparedDescription = prepareReportDescription(form.description);
  const canSubmit = Boolean(
    form.violationType &&
      form.barangayId &&
      form.streetOrLandmark.trim() &&
      preparedDescription.length >= 10 &&
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
    if (isSubmitting) return;
    if (!canSubmit || !form.violationType || !form.barangayId || !form.streetOrLandmark.trim()) {
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
        photoUrls = await uploadPhotos(
          optimizedPhotos,
          setUploadProgress,
        );
      }

      // Step 2: Clean and submit report to backend
      setSubmissionStage("creating");
      const created = await createReport({
        barangay_id: form.barangayId,
        violation_type: VIOLATION_TYPE_MAP[form.violationType],
        landmark: form.streetOrLandmark.trim(),
        description: preparedDescription,
        pin_lat: form.pinLocation?.[0],
        pin_lng: form.pinLocation?.[1],
        photos: photoUrls,
      });

      // Step 3: Clear saved draft from localStorage
      try {
        localStorage.removeItem(draftStorageKey);
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
      localStorage.removeItem(draftStorageKey);
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

  if (submitted) {
    return (
      <SuccessScreen referenceNumber={referenceNumber} onSubmitAnother={resetForm} />
    );
  }

  return (
    <div className={reportStyles.page}>
      {/* ── Page Header ── */}
      <ResidentPageHeader
        title="Submit a waste report"
        description="Report waste issues in your area to MENRO Candelaria."
        actions={hasDraft && (
          <Button
            type="button"
            onClick={resetForm}
            variant="destructive-outline"
            className="h-8 gap-1.5 px-2.5 text-xs [&_svg]:size-3"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear draft</span>
          </Button>
        )}
      />

      {/* Main Form Container */}
      <div className="min-w-0 w-full">
        <div className={reportStyles.form}>
          <div className={reportStyles.section}>
            <ViolationTypeSelector
              value={form.violationType}
              onChange={(v) => update("violationType", v)}
              showError={showValidation && !form.violationType}
            />
          </div>
          <div className={reportStyles.section}>
            <LocationSection
              barangayId={form.barangayId}
              barangayName={form.barangayName}
              streetOrLandmark={form.streetOrLandmark}
              onBarangayChange={handleBarangayChange}
              onStreetChange={(v) => update("streetOrLandmark", v)}
              showError={showValidation && !form.barangayId}
              showStreetError={showValidation && !form.streetOrLandmark.trim()}
            />
          </div>
          {hasSimilarReport && (
            <div className={reportStyles.section}>
              <DuplicateWarning barangay={form.barangayName} />
            </div>
          )}
          {similarQuery.isError && (
            <div className={reportStyles.section}>
              <DataRefreshNotice
                message={similarQuery.data === undefined
                  ? "Couldn't check for similar reports. You can still submit, but a matching report may already exist."
                  : "Couldn't refresh the similar-report check. The last result may be outdated."}
                onRetry={() => void similarQuery.refetch()}
                retrying={similarQuery.isFetching}
              />
            </div>
          )}
          <div className={reportStyles.section}>
            <DescriptionSection
              value={form.description}
              onChange={(v) => update("description", v)}
              violationType={form.violationType}
              showError={showValidation && preparedDescription.length < 10}
            />
          </div>
          <div className={reportStyles.section}>
            <PhotoUploadSection
              photos={form.photos}
              onPhotosChange={(v) => update("photos", v)}
              showError={showValidation && form.photos.length === 0}
            />
          </div>
        </div>

        <div className={reportStyles.footer}>
          <Button
            onClick={handleReview}
            disabled={isSubmitting}
            className={reportStyles.submit}
          >
            <Send className="w-4 h-4" />
            <span className="min-w-0 truncate">Review report</span>
          </Button>
        </div>
      </div>

      {/* Review Modal Dialog */}
      <ReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        form={{ ...form, description: preparedDescription }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submissionStage={submissionStage}
        uploadProgress={uploadProgress}
      />
    </div>
  );
};

export default ResidentSubmitReport;
