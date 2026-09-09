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
}

const PhotoUploadSection = ({ photos, onPhotosChange }: PhotoUploadSectionProps) => {
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const remainingSlots = MAX_REPORT_PHOTOS - photos.length;
      if (remainingSlots <= 0) {
        toast.error(`You can attach up to ${MAX_REPORT_PHOTOS} photos per report.`);
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
        toast.info(`Only ${remainingSlots} more photo${remainingSlots === 1 ? "" : "s"} could be added.`);
      }
      if (rejectedTypeCount > 0) {
        toast.error("Only JPG, PNG, and WebP images are allowed.");
      }
      if (rejectedSizeCount > 0) {
        toast.error("Each photo must be 10MB or smaller.");
      }
      onPhotosChange([...photos, ...newPhotos]);
    },
    [photos, onPhotosChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const removePhoto = (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.preview);
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  const openFilePicker = () => {
    document.getElementById("photo-upload-input")?.click();
  };

  const uploadDropzone = (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex-1 min-w-[220px] border-2 border-dashed border-primary/20 rounded-2xl p-6 sm:p-8 text-center hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center"
      onClick={openFilePicker}
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
        <Camera className="w-6 h-6 text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground">
        Drag and drop or <span className="text-primary font-semibold">browse files</span>
      </p>
      <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG, or WebP · Max 10MB each · Up to 5 photos · At least 1 photo required</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Photos</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Required
        </span>
      </div>

      {photos.length === 0 ? (
        uploadDropzone
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          <div className="flex gap-3 shrink-0">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group w-40 h-40 sm:w-44 sm:h-44 shrink-0 rounded-2xl overflow-hidden border border-border shadow-sm">
              <img
                src={photo.preview}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full border border-border/80 bg-card text-foreground shadow-md shadow-black/15 flex items-center justify-center transition-all hover:border-destructive hover:bg-destructive hover:text-destructive-foreground hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Remove photo"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
              {photo.annotations.length > 0 && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {photo.annotations.length}
                </div>
              )}
            </div>
          ))}
          {photos.length < MAX_REPORT_PHOTOS && (
            <button
              type="button"
              onClick={openFilePicker}
              className="w-40 h-40 sm:w-44 sm:h-44 shrink-0 rounded-2xl border-2 border-dashed border-primary/20 text-primary hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer flex items-center justify-center"
              aria-label="Add more photos"
            >
              <Plus className="w-8 h-8" />
            </button>
          )}
          </div>
        </div>
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
