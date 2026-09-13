import { useState, useMemo, useEffect, useRef } from "react";
import {
  Tag,
  Eye,
  Trash2,
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Sparkles,
  UploadCloud,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { Post, PostCategory, PostStatus } from "./types";
import postsService from "@/services/postsService";

// ─── Types ─────────────────────────────────────────────────

interface EditorForm {
  title: string;
  body: string;
  source: string;
  category: PostCategory;
  status: PostStatus;
  featured: boolean;
  tags: string;
  scheduledDate: string;
  images: string[];
}

interface PostEditorProps {
  editingPost: Post | null;
  onBack: () => void;
  onSave: (form: EditorForm) => Promise<void>;
  onPreview?: (form: EditorForm) => void;
  isSaving: boolean;
}

// ─── Custom Dark/Light Mode Matched DateTime Picker ──────────

const CustomDateTimePicker = ({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const parsedDate = useMemo(() => {
    if (!value) return null;
    const normalized =
      value.includes("Z") || value.includes("+") ? value : value.replace(" ", "T");
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  const [selectedDay, setSelectedDay] = useState<Date | undefined>(
    parsedDate || new Date(),
  );

  const [selectedHour, setSelectedHour] = useState<string>(() => {
    if (!parsedDate) return "09";
    const h = parsedDate.getHours();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return String(h12).padStart(2, "0");
  });

  const [selectedMinute, setSelectedMinute] = useState<string>(() => {
    if (!parsedDate) return "00";
    return String(parsedDate.getMinutes()).padStart(2, "0");
  });

  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(() => {
    if (!parsedDate) return "AM";
    return parsedDate.getHours() >= 12 ? "PM" : "AM";
  });

  const updateDateTime = (
    day: Date | undefined,
    hourStr: string,
    minStr: string,
    period: "AM" | "PM",
  ) => {
    if (!day) return;
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, "0");
    const date = String(day.getDate()).padStart(2, "0");

    let h24 = parseInt(hourStr, 10);
    if (period === "PM" && h24 < 12) h24 += 12;
    if (period === "AM" && h24 === 12) h24 = 0;
    const hourFormatted = String(h24).padStart(2, "0");

    // Convert the date/time selected in the administrator's local timezone to
    // an unambiguous UTC instant before it is sent to the API.
    const localDate = new Date(
      year,
      Number.parseInt(month, 10) - 1,
      Number.parseInt(date, 10),
      h24,
      Number.parseInt(minStr, 10),
    );
    onChange(localDate.toISOString());
  };

  const handleDaySelect = (day: Date | undefined) => {
    setSelectedDay(day);
    if (day) {
      updateDateTime(day, selectedHour, selectedMinute, selectedPeriod);
    }
  };

  useEffect(() => {
    if (!parsedDate) return;
    setSelectedDay(parsedDate);
    const h = parsedDate.getHours();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    setSelectedHour(String(h12).padStart(2, "0"));
    setSelectedMinute(String(parsedDate.getMinutes()).padStart(2, "0"));
    setSelectedPeriod(h >= 12 ? "PM" : "AM");
  }, [value]);

  const handleHourInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") {
      setSelectedHour("");
      return;
    }
    const num = parseInt(raw, 10);
    if (num > 12) {
      setSelectedHour("12");
      updateDateTime(selectedDay, "12", selectedMinute || "00", selectedPeriod);
      return;
    }
    setSelectedHour(raw);
    if (num >= 1 && num <= 12) {
      updateDateTime(selectedDay, String(num).padStart(2, "0"), selectedMinute || "00", selectedPeriod);
    }
  };

  const handleHourBlur = () => {
    let num = parseInt(selectedHour, 10);
    if (isNaN(num) || num < 1) num = 12;
    if (num > 12) num = 12;
    const formatted = String(num).padStart(2, "0");
    setSelectedHour(formatted);
    updateDateTime(selectedDay, formatted, selectedMinute || "00", selectedPeriod);
  };

  const handleMinuteInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") {
      setSelectedMinute("");
      return;
    }
    const num = parseInt(raw, 10);
    if (num > 59) {
      setSelectedMinute("59");
      updateDateTime(selectedDay, selectedHour || "12", "59", selectedPeriod);
      return;
    }
    setSelectedMinute(raw);
    if (num >= 0 && num <= 59) {
      updateDateTime(selectedDay, selectedHour || "12", String(num).padStart(2, "0"), selectedPeriod);
    }
  };

  const handleMinuteBlur = () => {
    let num = parseInt(selectedMinute, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    const formatted = String(num).padStart(2, "0");
    setSelectedMinute(formatted);
    updateDateTime(selectedDay, selectedHour || "12", formatted, selectedPeriod);
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const current = parseInt(selectedHour, 10) || 12;
      const next = current >= 12 ? 1 : current + 1;
      const formatted = String(next).padStart(2, "0");
      setSelectedHour(formatted);
      updateDateTime(selectedDay, formatted, selectedMinute || "00", selectedPeriod);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const current = parseInt(selectedHour, 10) || 12;
      const prev = current <= 1 ? 12 : current - 1;
      const formatted = String(prev).padStart(2, "0");
      setSelectedHour(formatted);
      updateDateTime(selectedDay, formatted, selectedMinute || "00", selectedPeriod);
    }
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const current = parseInt(selectedMinute, 10) || 0;
      const next = current >= 59 ? 0 : current + 1;
      const formatted = String(next).padStart(2, "0");
      setSelectedMinute(formatted);
      updateDateTime(selectedDay, selectedHour || "12", formatted, selectedPeriod);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const current = parseInt(selectedMinute, 10) || 0;
      const prev = current <= 0 ? 59 : current - 1;
      const formatted = String(prev).padStart(2, "0");
      setSelectedMinute(formatted);
      updateDateTime(selectedDay, selectedHour || "12", formatted, selectedPeriod);
    }
  };

  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    setSelectedPeriod(newPeriod);
    updateDateTime(selectedDay, selectedHour, selectedMinute, newPeriod);
  };

  const handleSetNow = () => {
    const now = new Date();
    setSelectedDay(now);
    const h = now.getHours();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const hStr = String(h12).padStart(2, "0");
    const mStr = String(now.getMinutes()).padStart(2, "0");
    const period = h >= 12 ? "PM" : "AM";

    setSelectedHour(hStr);
    setSelectedMinute(mStr);
    setSelectedPeriod(period);
    updateDateTime(now, hStr, mStr, period);
  };

  const formattedDisplay = useMemo(() => {
    if (!value || !parsedDate) return "Select scheduled date and time";
    return parsedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, [value, parsedDate]);

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-invalid={error}
          className={`w-full h-10 flex items-center justify-between px-3.5 rounded-xl border bg-background text-sm shadow-2xs transition-colors cursor-pointer text-left focus:outline-none ${error ? "border-destructive/70 text-destructive focus:border-destructive" : "border-input/80 hover:border-primary/50 focus:border-primary"}`}
        >
          <span className="flex items-center gap-2.5 truncate">
            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span
              className={
                value ? "text-foreground font-medium" : "text-muted-foreground"
              }
            >
              {formattedDisplay}
            </span>
          </span>
          <span className="text-xs text-primary font-semibold shrink-0">Set</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-3 shadow-xl rounded-2xl border-border bg-popover z-50"
      >
        <div className="space-y-3">
          <CalendarPicker
            mode="single"
            selected={selectedDay}
            onSelect={handleDaySelect}
            initialFocus
            className="rounded-xl border border-border/60 p-2"
          />

          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Time
              </span>
              <button
                type="button"
                onClick={handleSetNow}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Set Current Time
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="flex flex-col items-center gap-0.5">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={selectedHour}
                  onChange={handleHourInput}
                  onBlur={handleHourBlur}
                  onKeyDown={handleHourKeyDown}
                  placeholder="12"
                  className="w-14 h-9 text-center text-sm font-semibold rounded-xl px-1"
                  aria-label="Hour (1-12)"
                />
                <span className="text-[10px] text-muted-foreground font-medium">hr</span>
              </div>

              <span className="text-muted-foreground font-bold text-base pb-3.5">:</span>

              <div className="flex flex-col items-center gap-0.5">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={selectedMinute}
                  onChange={handleMinuteInput}
                  onBlur={handleMinuteBlur}
                  onKeyDown={handleMinuteKeyDown}
                  placeholder="00"
                  className="w-14 h-9 text-center text-sm font-semibold rounded-xl px-1"
                  aria-label="Minute (0-59)"
                />
                <span className="text-[10px] text-muted-foreground font-medium">min</span>
              </div>

              <div className="flex rounded-xl border border-input/80 overflow-hidden shadow-2xs h-9 mb-3.5">
                <button
                  type="button"
                  onClick={() => handlePeriodChange("AM")}
                  className={`px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    selectedPeriod === "AM"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange("PM")}
                  className={`px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    selectedPeriod === "PM"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs px-3 gap-1 rounded-lg cursor-pointer"
                onClick={() => setPopoverOpen(false)}
              >
                <Check className="w-3.5 h-3.5" /> Done
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─── PostEditor Main Component ─────────────────────────────

const PostEditor = ({
  editingPost,
  onBack,
  onSave,
  onPreview,
  isSaving,
}: PostEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<EditorForm>(() => ({
    title: editingPost?.title || "",
    body: editingPost?.body || "",
    source: editingPost?.source || "",
    category: editingPost?.category || "Waste Tip",
    status: editingPost?.status || "Published",
    featured: editingPost?.featured || false,
    tags: (editingPost?.tags || []).join(", "),
    scheduledDate: editingPost?.scheduledDate || "",
    images: editingPost?.images || [],
  }));

  const [uploadedImages, setUploadedImages] = useState<string[]>(
    () => editingPost?.images || [],
  );
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<"title" | "body" | "scheduledDate" | "form", string>>
  >({});

  useEffect(() => {
    if (editingPost) {
      setForm({
        title: editingPost.title,
        body: editingPost.body,
        source: editingPost.source,
        category: editingPost.category,
        status: editingPost.status,
        featured: editingPost.featured,
        tags: editingPost.tags.join(", "),
        scheduledDate: editingPost.scheduledDate || "",
        images: editingPost.images || [],
      });
      setUploadedImages(editingPost.images || []);
    }
    setErrors({});
  }, [editingPost]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      const urls = await Promise.all(files.map(postsService.uploadImage));
      setUploadedImages((prev) => [...prev, ...urls]);
    } catch {
      // Handled by api interceptor
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const getFormWithImages = (): EditorForm => ({
    ...form,
    images: uploadedImages,
  });

  const parsedTags = useMemo(() => {
    return form.tags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);
  }, [form.tags]);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Compute whether the administrator has unsaved progress
  const isDirty = useMemo(() => {
    if (editingPost) {
      return (
        form.title !== editingPost.title ||
        form.body !== editingPost.body ||
        form.source !== (editingPost.source || "") ||
        form.category !== editingPost.category ||
        form.status !== editingPost.status ||
        form.featured !== editingPost.featured ||
        form.tags !== (editingPost.tags || []).join(", ") ||
        form.scheduledDate !== (editingPost.scheduledDate || "") ||
        JSON.stringify(uploadedImages) !== JSON.stringify(editingPost.images || [])
      );
    }
    return (
      Boolean(form.title.trim()) ||
      Boolean(form.body.trim()) ||
      Boolean(form.source.trim()) ||
      Boolean(form.tags.trim()) ||
      uploadedImages.length > 0
    );
  }, [form, uploadedImages, editingPost]);

  const handleAttemptBack = () => {
    if (isDirty && !isSaving) {
      setShowDiscardConfirm(true);
    } else {
      onBack();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onBack();
  };

  const validateForm = (candidate: EditorForm) => {
    const nextErrors: Partial<Record<"title" | "body" | "scheduledDate", string>> = {};
    if (!candidate.title.trim()) nextErrors.title = "Enter a post title.";
    if (!candidate.body.trim()) nextErrors.body = "Enter the post content.";
    if (candidate.status === "Scheduled") {
      if (!candidate.scheduledDate) {
        nextErrors.scheduledDate = "Select a future publish date and time.";
      } else if (new Date(candidate.scheduledDate).getTime() <= Date.now()) {
        nextErrors.scheduledDate = "Scheduled publish time must be in the future.";
      }
    }
    return nextErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateForm(getFormWithImages());
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {
      setErrors({});
      await onSave(getFormWithImages());
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Unable to save the post. Please try again." });
    }
  };

  const handleSaveDraftAndClose = () => {
    const validationErrors = validateForm({ ...getFormWithImages(), status: "Draft" });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setShowDiscardConfirm(false);
      return;
    }
    setShowDiscardConfirm(false);
    const draftData = {
      ...getFormWithImages(),
      status: "Draft" as PostStatus,
    };
    void onSave(draftData).catch((err: unknown) => {
      setErrors({ form: err instanceof Error ? err.message : "Unable to save the post. Please try again." });
    });
  };

  const saveButtonLabel = useMemo(() => {
    if (editingPost) return "Save Changes";
    if (form.status === "Scheduled") return "Schedule Post";
    return "Publish Post";
  }, [editingPost, form.status]);

  return (
    <div className="w-full max-w-[1000px] mx-auto space-y-5 pb-20 animate-in fade-in duration-300">
      {/* ── Top Bar: Back Pill ── */}
      <div>
        <BackButton label="Back to Posts" onClick={handleAttemptBack} />
      </div>

      {/* ── Section 1: Post Content & Details ── */}
      <section className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="pb-3.5 border-b border-border/60">
          <h1 className="text-lg sm:text-xl font-bold font-display text-foreground tracking-tight leading-tight">
            {editingPost ? "Edit Post" : "Create Post"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Compose and publish announcements, waste tips, or event advisories for residents.
          </p>
        </div>

        <div className="space-y-3.5">
          {/* Post Title */}
          <div className="space-y-1.5">
            <Label className={`text-xs font-bold ${errors.title ? "text-destructive" : "text-foreground"}`}>
              Post Title
            </Label>
            <Input
              value={form.title}
              onChange={(e) => {
                setForm((f) => ({ ...f, title: e.target.value }));
                setErrors((current) => ({ ...current, title: undefined, form: undefined }));
              }}
              placeholder="e.g., Household Waste Segregation Guidelines for 2026"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "post-title-error" : undefined}
              className={`h-10 rounded-xl bg-background text-sm shadow-2xs ${errors.title ? "border-destructive/70 text-destructive focus-visible:border-destructive focus-visible:ring-destructive/25" : "border-border/80 focus-visible:border-primary"}`}
            />
            {errors.title && <p id="post-title-error" className="text-[11px] font-medium text-destructive">{errors.title}</p>}
          </div>

          {/* Subtitle / Source */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Source or Attribution <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="e.g., MENRO Candelaria · Office of the Municipal Environment"
              className="h-10 rounded-xl bg-background border-border/80 text-sm focus-visible:border-primary shadow-2xs"
            />
          </div>

          {/* Body Content */}
          <div className="space-y-1.5">
            <Label className={`text-xs font-bold ${errors.body ? "text-destructive" : "text-foreground"}`}>
              Post Body
            </Label>
            <Textarea
              value={form.body}
              onChange={(e) => {
                setForm((f) => ({ ...f, body: e.target.value }));
                setErrors((current) => ({ ...current, body: undefined, form: undefined }));
              }}
              placeholder="Write the full post announcement, guidelines, or event details here. Separate paragraphs with an empty line..."
              rows={10}
              aria-invalid={Boolean(errors.body)}
              aria-describedby={errors.body ? "post-body-error" : undefined}
              className={`resize-none overflow-y-auto rounded-xl bg-background text-sm leading-relaxed shadow-2xs p-3.5 ${errors.body ? "border-destructive/70 text-destructive focus-visible:border-destructive focus-visible:ring-destructive/25" : "border-border/80 focus-visible:border-primary"}`}
            />
            {errors.body && <p id="post-body-error" className="text-[11px] font-medium text-destructive">{errors.body}</p>}
          </div>
        </div>
      </section>

      {/* ── Section 2: Media & Cover Photo ── */}
      <section className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="pb-3.5 border-b border-border/60">
          <h2 className="text-sm sm:text-base font-bold font-display text-foreground tracking-tight">
            Media & Cover Photo
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Upload photos for this post. The first image will be used as the primary cover photo.
          </p>
        </div>

        {uploadedImages.length > 0 ? (
          <div className="space-y-4">
            {/* Primary Cover Image Showcase */}
            <div className="relative w-full aspect-[1080/566] max-h-[380px] rounded-2xl overflow-hidden bg-muted/40 border border-border/70 shadow-sm flex items-center justify-center group">
              <img
                src={uploadedImages[0]}
                alt="Primary Cover"
                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/20 shadow-xs">
                Primary Cover Photo
              </div>
              <button
                type="button"
                onClick={() => removeImage(0)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-destructive text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors backdrop-blur-md"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnails Gallery Strip */}
            {uploadedImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                {uploadedImages.slice(1).map((url, i) => {
                  const realIndex = i + 1;
                  return (
                    <div
                      key={realIndex}
                      className="relative group w-24 h-16 rounded-xl overflow-hidden border border-border/80 shrink-0 shadow-2xs bg-muted/30"
                    >
                      <img
                        src={url}
                        alt={`Photo ${realIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity backdrop-blur-[1px]">
                        <button
                          type="button"
                          className="w-6 h-6 rounded-full bg-background/90 text-foreground flex items-center justify-center shadow-xs hover:bg-background cursor-pointer active:scale-90 transition-transform"
                          onClick={() => {
                            const newImgs = [...uploadedImages];
                            [newImgs[realIndex - 1], newImgs[realIndex]] = [
                              newImgs[realIndex],
                              newImgs[realIndex - 1],
                            ];
                            setUploadedImages(newImgs);
                          }}
                          title="Move to cover"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xs hover:opacity-90 cursor-pointer active:scale-90 transition-transform"
                          onClick={() => removeImage(realIndex)}
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add More Photos Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-2 cursor-pointer border-border/80 bg-background hover:bg-muted/50 transition-all shadow-2xs"
              >
                <UploadCloud className="w-3.5 h-3.5 text-muted-foreground" />
                {isUploading ? "Uploading..." : "Add More Photos"}
              </Button>
            </div>
          </div>
        ) : (
          /* Empty Upload Dropzone */
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`group border border-dashed rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center gap-3 text-center transition-all ${
              isUploading
                ? "border-primary/40 bg-primary/5 cursor-wait"
                : "border-border/90 hover:border-primary/50 bg-background/40 hover:bg-muted/30 cursor-pointer shadow-2xs"
            }`}
          >
            {isUploading ? (
              <>
                <div className="w-9 h-9 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Uploading photo to server...
                </span>
              </>
            ) : (
              <>
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-105 transition-transform duration-200">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    Upload Cover Photo & Gallery
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Click or drag photos here (PNG, JPG, or WebP)
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </section>

      {/* ── Section 3: Publishing & Visibility Settings ── */}
      <section className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="pb-3.5 border-b border-border/60">
          <h2 className="text-sm sm:text-base font-bold font-display text-foreground tracking-tight">
            Publishing Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Select category, visibility status, scheduled publishing time, and tags.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Category Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Category
            </Label>
            <Select
              value={form.category}
              onValueChange={(val: PostCategory) =>
                setForm((f) => ({ ...f, category: val }))
              }
            >
              <SelectTrigger className="h-10 rounded-xl bg-background border-border/80 text-sm focus:border-primary shadow-2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/80 shadow-md">
                <SelectItem value="Waste Tip" className="text-xs sm:text-sm cursor-pointer rounded-lg">
                  Waste Tip
                </SelectItem>
                <SelectItem value="Event" className="text-xs sm:text-sm cursor-pointer rounded-lg">
                  Community Event
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Dropdown (Published vs Scheduled) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Status
            </Label>
            <Select
              value={form.status}
              onValueChange={(val: PostStatus) => {
                setForm((f) => ({ ...f, status: val }));
                setErrors((current) => ({ ...current, scheduledDate: undefined, form: undefined }));
              }}
            >
              <SelectTrigger className="h-10 rounded-xl bg-background border-border/80 text-sm focus:border-primary shadow-2xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/80 shadow-md">
                <SelectItem value="Published" className="text-xs sm:text-sm cursor-pointer rounded-lg">
                  Published
                </SelectItem>
                <SelectItem value="Scheduled" className="text-xs sm:text-sm cursor-pointer rounded-lg">
                  Scheduled
                </SelectItem>
                {/* Preserve Draft or Archived if editing a post currently in that state */}
                {form.status === "Draft" && (
                  <SelectItem value="Draft" className="text-xs sm:text-sm cursor-pointer rounded-lg">
                    Draft
                  </SelectItem>
                )}
                {form.status === "Archived" && (
                  <SelectItem value="Archived" className="text-xs sm:text-sm cursor-pointer rounded-lg">
                    Archived
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scheduled Publishing Time (if Scheduled) */}
        {form.status === "Scheduled" && (
          <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
            <Label className={`text-xs font-bold ${errors.scheduledDate ? "text-destructive" : "text-foreground"}`}>
              Scheduled Publish Time
            </Label>
            <CustomDateTimePicker
              value={form.scheduledDate}
              error={Boolean(errors.scheduledDate)}
              onChange={(iso) => {
                setForm((f) => ({ ...f, scheduledDate: iso }));
                setErrors((current) => ({ ...current, scheduledDate: undefined, form: undefined }));
              }}
            />
            {errors.scheduledDate && <p className="text-[11px] font-medium text-destructive">{errors.scheduledDate}</p>}
            <p className="text-[11px] text-muted-foreground">
              This post will automatically become visible to residents at this scheduled date and time.
            </p>
          </div>
        )}

        {/* Tags */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground">
            Tags <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <div className="relative">
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="e.g., composting, recycling, clean-up (comma-separated)"
              className="pl-10 h-10 rounded-xl bg-background border-border/80 text-sm focus-visible:border-primary shadow-2xs"
            />
          </div>
          {parsedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parsedTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/25"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Featured Post Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors">
          <div className="space-y-0.5 pr-4">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Feature on Resident Carousel
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Pin this post to the hero carousel on the resident home page.
            </p>
          </div>
          <Switch
            checked={form.featured}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, featured: checked }))
            }
          />
        </div>
        {errors.form && <p className="text-[11px] font-medium text-destructive">{errors.form}</p>}
      </section>

      {/* ── Section 4: Footer Action Controls ── */}
      <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {onPreview && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onPreview(getFormWithImages())}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold gap-2 border-border/80 bg-card hover:bg-muted/60 text-foreground transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span>Preview as Resident</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleAttemptBack}
            className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold border-border/80 bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              isUploading ||
              isSaving
            }
            className="h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all cursor-pointer active:scale-95"
          >
            {(isUploading || isSaving) && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            )}
            {isUploading ? (
              "Uploading..."
            ) : isSaving ? (
              "Saving..."
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{saveButtonLabel}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Unsaved Changes / Save As Draft Dialog ── */}
      <UnsavedChangesDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onDiscard={handleConfirmDiscard}
        onSave={handleSaveDraftAndClose}
        title={editingPost ? "Unsaved Changes" : "Save as Draft?"}
        description={
          editingPost
            ? "You have unsaved changes to this post. Would you like to save your edits as a draft or discard them?"
            : "You have unsaved work on this post. Do you want to save it as a draft to continue later, or discard it?"
        }
        saveLabel={editingPost ? "Save Changes as Draft" : "Save as Draft"}
        discardLabel={editingPost ? "Discard Changes" : "Discard Post"}
        isSaving={isSaving}
      />
    </div>
  );
};

export default PostEditor;
export type { EditorForm };
