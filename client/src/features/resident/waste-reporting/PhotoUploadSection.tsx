import { useCallback } from "react";
import { Plus, X, Camera } from "lucide-react";
import type { ReportPhoto } from "./types";
import { toast } from "@/lib/toast";

const MAX_REPORT_PHOTOS = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface PhotoUploadSectionProps {
  photos: ReportPhoto[];
  onPhotosChange: (photos: ReportPhoto[]) => void;
  showError?: boolean;
}

const PhotoUploadSection = ({ photos, onPhotosChange, showError = false }: PhotoUploadSectionProps) => {
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const remainingSlots = Math.max(0, MAX_REPORT_PHOTOS - photos.length);
      if (remainingSlots <= 0) {
        toast.error(`Maximum limit of ${MAX_REPORT_PHOTOS} photos reached.`);
        return;
      }

      const newPhotos: ReportPhoto[] = [];
      let rejectedTypeCount = 0;
      let rejectedSizeCount = 0;

      let skippedForLimitCount = 0;
      Array.from(files).forEach((file) => {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
          rejectedTypeCount += 1;
          return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          rejectedSizeCount += 1;
          return;
        }
        if (newPhotos.length >= remainingSlots) {
          skippedForLimitCount += 1;
          return;
        }
        newPhotos.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          annotations: [],
        });
      });

      if (skippedForLimitCount > 0) {
        toast.info(
          `Only ${remainingSlots} photo${remainingSlots === 1 ? "" : "s"} added. Maximum limit is ${MAX_REPORT_PHOTOS}.`
        );
      }
      if (rejectedTypeCount > 0) {
        toast.error("Only JPG, PNG, and WebP images are allowed.");
      }
      if (rejectedSizeCount > 0) {
        toast.error("Each photo must be 10MB or smaller.");
      }
      onPhotosChange([...photos, ...newPhotos].slice(0, MAX_REPORT_PHOTOS));
    },
    [photos, onPhotosChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (photos.length >= MAX_REPORT_PHOTOS) {
        toast.info(`Maximum limit of ${MAX_REPORT_PHOTOS} photos reached.`);
        return;
      }
      handleFileSelect(e.dataTransfer.files);
    },
    [photos.length, handleFileSelect]
  );

  const removePhoto = (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.preview);
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  const openFilePicker = () => {
    if (photos.length >= MAX_REPORT_PHOTOS) {
      toast.info(`Maximum limit of ${MAX_REPORT_PHOTOS} photos reached.`);
      return;
    }
    document.getElementById("photo-upload-input")?.click();
  };

  const uploadDropzone = (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center gap-3 select-none ${
        showError
          ? "border-destructive/80 bg-destructive/5 hover:bg-destructive/10"
          : "border-border/80 hover:border-primary/50 hover:bg-primary/5 bg-muted/20"
      }`}
      onClick={openFilePicker}
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 shadow-2xs">
        <Camera className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <p className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
          Click to upload or drag & drop photos
        </p>
        <p className="text-[11px] text-muted-foreground">
          JPG, PNG, or WebP · Max 5 photos (10MB each) · At least 1 photo required
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold font-display text-foreground tracking-tight">
            Evidence Photos
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Attach clear photos showing the waste issue or surrounding landmark.
          </p>
        </div>

        <span className="text-[11px] font-medium shrink-0">
          {photos.length >= MAX_REPORT_PHOTOS ? (
            <span className="text-foreground font-semibold px-2 py-0.5 rounded-md bg-muted border border-border/80">
              5/5 (Max reached)
            </span>
          ) : photos.length > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {photos.length}/{MAX_REPORT_PHOTOS} attached
            </span>
          ) : (
            <span className="text-muted-foreground font-normal">
              1 to {MAX_REPORT_PHOTOS} required
            </span>
          )}
        </span>
      </div>

      {photos.length === 0 ? (
        uploadDropzone
      ) : (
        <div className="flex items-start gap-3 overflow-x-auto pb-1.5 pt-0.5">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative size-28 sm:size-32 shrink-0 rounded-xl overflow-hidden border border-border/80 shadow-2xs group bg-muted/20"
            >
              <img
                src={photo.preview}
                alt="Upload preview"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(photo.id);
                }}
                className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full border border-border/80 bg-background/90 backdrop-blur-xs text-muted-foreground shadow-xs flex items-center justify-center transition-all hover:border-destructive hover:bg-destructive hover:text-destructive-foreground hover:scale-105 cursor-pointer"
                title="Remove photo"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ))}

          {photos.length < MAX_REPORT_PHOTOS && (
            <button
              type="button"
              onClick={openFilePicker}
              className="group size-28 sm:size-32 shrink-0 rounded-xl border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-[0.98] bg-muted/20 shadow-2xs"
              aria-label={`Add more photos (${photos.length} of ${MAX_REPORT_PHOTOS})`}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-2xs">
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col items-center text-center px-1">
                <span className="text-xs font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                  Add photo
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {photos.length}/{MAX_REPORT_PHOTOS} max
                </span>
              </div>
            </button>
          )}
        </div>
      )}
      {showError && (
        <p className="text-[11px] font-medium text-destructive">Please add at least one photo.</p>
      )}

      <input
        id="photo-upload-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files);
          // Allow selecting the same file again after it has been removed.
          e.currentTarget.value = "";
        }}
      />
    </div>
  );
};

export default PhotoUploadSection;
