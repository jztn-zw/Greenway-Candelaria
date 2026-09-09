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
import SuccessScreen from "./SuccessScreen";
import ReviewModal from "./ReviewModal";
import type { ReportFormData } from "./types";
import { VIOLATION_TYPE_MAP } from "./types";
import { ReportFormSkeleton } from "@/components/PageLoadingSkeletons";
import { uploadReportPhotos, submitReport } from "@/services/reportsService";
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
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm">
            <ViolationTypeSelector value={form.violationType} onChange={(v) => update("violationType", v)} />
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm">
            <LocationSection barangayId={form.barangayId} barangayName={form.barangayName} streetOrLandmark={form.streetOrLandmark} onBarangayChange={handleBarangayChange} onStreetChange={(v) => update("streetOrLandmark", v)} />
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm">
            <DescriptionSection value={form.description} onChange={(v) => update("description", v)} violationType={form.violationType} />
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm">
            <PhotoUploadSection photos={form.photos} onPhotosChange={(v) => update("photos", v)} />
          </div>

          <div className="space-y-3 pb-6 pt-2">
            <Button onClick={handleReview} disabled={!canSubmit || isSubmitting} className="w-full min-h-[52px] rounded-2xl text-sm font-bold gap-2 shadow-xl shadow-primary/20" size="lg">
              <Send className="w-4 h-4" /> Review and Submit
            </Button>
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
