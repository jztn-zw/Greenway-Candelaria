import { useCallback } from "react";
import { Upload, X, Pencil, Camera } from "lucide-react";
import type { ReportPhoto } from "./types";

interface PhotoUploadSectionProps {
  photos: ReportPhoto[];
  onPhotosChange: (photos: ReportPhoto[]) => void;
}

const PhotoUploadSection = ({ photos, onPhotosChange }: PhotoUploadSectionProps) => {
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newPhotos: ReportPhoto[] = [];
      Array.from(files).forEach((file) => {
        if (!["image/jpeg", "image/png"].includes(file.type)) return;
        if (file.size > 10 * 1024 * 1024) return;
        newPhotos.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          annotations: [],
        });
      });
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Photos</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Required
        </span>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-primary/20 rounded-2xl p-6 sm:p-8 text-center hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-200 cursor-pointer group"
        onClick={() => document.getElementById("photo-upload-input")?.click()}
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/15 transition-colors">
          <Camera className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Drag and drop or <span className="text-primary font-semibold">browse files</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG · Max 10MB each · At least 1 photo required</p>
        <input
          id="photo-upload-input"
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-2xl overflow-hidden border border-border shadow-sm">
              <img
                src={photo.preview}
                alt="Upload preview"
                className="w-full h-28 sm:h-32 object-cover"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  className="p-2 rounded-xl bg-card/95 text-foreground hover:bg-card shadow-lg transition-all"
                  title="Annotate photo"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                  className="p-2 rounded-xl bg-card/95 text-destructive hover:bg-card shadow-lg transition-all"
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {photo.annotations.length > 0 && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {photo.annotations.length}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploadSection;
