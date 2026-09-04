import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Image as ImageIcon,
  Tag,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Sparkles,
  UploadCloud,
  Globe,
  Lock,
  Archive,
  Leaf,
  Calendar,
  Send,
  X,
  FileText,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  onSave: (form: EditorForm) => void;
  onPreview?: (form: EditorForm) => void;
  isSaving: boolean;
}

// ─── Custom Dark/Light Mode Matched DateTime Picker ──────────

const CustomDateTimePicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
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

    const isoString = `${year}-${month}-${date}T${hourFormatted}:${minStr}`;
    onChange(isoString);
  };

  const handleDaySelect = (day: Date | undefined) => {
    setSelectedDay(day);
    if (day) {
      updateDateTime(day, selectedHour, selectedMinute, selectedPeriod);
    }
  };

  const handleHourChange = (newHour: string) => {
    setSelectedHour(newHour);
    updateDateTime(selectedDay, newHour, selectedMinute, selectedPeriod);
  };

  const handleMinuteChange = (newMin: string) => {
    setSelectedMinute(newMin);
    updateDateTime(selectedDay, selectedHour, newMin, selectedPeriod);
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
          className="w-full h-11 flex items-center justify-between px-3.5 rounded-xl border border-border bg-background hover:bg-muted/50 text-sm transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/20"
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

            <div className="flex items-center justify-center gap-2">
              <Select value={selectedHour} onValueChange={handleHourChange}>
                <SelectTrigger className="w-16 h-8 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48 rounded-lg">
                  {Array.from({ length: 12 }, (_, i) => {
                    const h = String(i + 1).padStart(2, "0");
                    return (
                      <SelectItem key={h} value={h} className="text-xs">
                        {h}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground font-bold">:</span>

              <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                <SelectTrigger className="w-16 h-8 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48 rounded-lg">
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = String(i * 5).padStart(2, "0");
                    return (
                      <SelectItem key={m} value={m} className="text-xs">
                        {m}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => handlePeriodChange("AM")}
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
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
                  className={`px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
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
    status: editingPost?.status || "Draft",
    featured: editingPost?.featured || false,
    tags: (editingPost?.tags || []).join(", "),
    scheduledDate: editingPost?.scheduledDate || "",
    images: editingPost?.images || [],
  }));

  const [uploadedImages, setUploadedImages] = useState<string[]>(
    () => editingPost?.images || [],
  );
  const [isUploading, setIsUploading] = useState(false);

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

  const wordCount = useMemo(() => {
    return form.body.trim().split(/\s+/).filter(Boolean).length;
  }, [form.body]);

  const parsedTags = useMemo(() => {
    return form.tags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);
  }, [form.tags]);

  const saveButtonLabel = useMemo(() => {
    if (editingPost) return "Save Changes";
    if (form.status === "Published") return "Publish Post";
    if (form.status === "Scheduled") return "Schedule Post";
    return "Save Draft";
  }, [editingPost, form.status]);

  return (
    <div className="w-full max-w-[1000px] mx-auto space-y-5 pb-16 animate-in fade-in duration-300">
      {/* ── Top Bar: Back Pill & Page Header ── */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-muted/60 dark:bg-muted/40 hover:bg-muted hover:dark:bg-muted/70 border border-border/70 hover:border-border text-muted-foreground hover:text-foreground text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-200 ease-out text-muted-foreground group-hover:text-foreground" />
          <span>Back to Posts</span>
        </button>

        <div className="pt-0.5">
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight leading-tight">
            {editingPost ? "Edit Post" : "Create Post"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compose and publish announcements, waste tips, or event advisories for residents.
          </p>
        </div>
      </div>

      {/* ── Section 1: Post Content & Details ── */}
      <section className="bg-card border border-border/80 rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xs">
        <div className="flex items-center gap-3 pb-3 border-b border-border/60">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold font-display text-foreground">
              Post Content
            </h2>
            <p className="text-xs text-muted-foreground">
              Main title, official attribution, and body content.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Post Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Post Title *
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Household Waste Segregation Guidelines for 2026"
              className="h-11 rounded-xl bg-background border border-border px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          {/* Subtitle / Source */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Source or Attribution (Optional)
            </Label>
            <Input
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="e.g., MENRO Candelaria · Office of the Municipal Environment"
              className="h-11 rounded-xl bg-background border border-border px-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>

          {/* Body Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Post Body *
              </Label>
              <span className="text-xs text-muted-foreground">
                {wordCount} words
              </span>
            </div>
            <Textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Write the full post announcement, guidelines, or event details here. Separate paragraphs with an empty line..."
              rows={10}
              className="rounded-xl bg-background border border-border p-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/20 resize-y"
            />
          </div>
        </div>
      </section>

      {/* ── Section 2: Media & Cover Photo ── */}
      <section className="bg-card border border-border/80 rounded-2xl p-5 sm:p-7 space-y-4 shadow-2xs">
        <div className="flex items-center gap-3 pb-3 border-b border-border/60">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold font-display text-foreground">
              Media & Cover Photo
            </h2>
            <p className="text-xs text-muted-foreground">
              Upload photos for this post. The first image will be used as the primary cover photo.
            </p>
          </div>
        </div>

        {uploadedImages.length > 0 ? (
          <div className="space-y-4">
            {/* Primary Cover Image Showcase */}
            <div className="relative w-full aspect-[1080/566] max-h-[380px] rounded-2xl overflow-hidden bg-black/40 border border-border/60 shadow-sm flex items-center justify-center group">
              <img
                src={uploadedImages[0]}
                alt="Primary Cover"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20 shadow-xs">
                Primary Cover Photo
              </div>
              <button
                type="button"
                onClick={() => removeImage(0)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/75 hover:bg-destructive text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnails Gallery Strip */}
            {uploadedImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {uploadedImages.slice(1).map((url, i) => {
                  const realIndex = i + 1;
                  return (
                    <div
                      key={realIndex}
                      className="relative group w-24 h-16 rounded-xl overflow-hidden border border-border shrink-0 shadow-2xs"
                    >
                      <img
                        src={url}
                        alt={`Photo ${realIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                        <button
                          type="button"
                          className="w-6 h-6 rounded-full bg-background/90 text-foreground flex items-center justify-center shadow-xs hover:bg-background cursor-pointer"
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
                          className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xs hover:opacity-90 cursor-pointer"
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
                className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                {isUploading ? "Uploading..." : "Add More Photos"}
              </Button>
            </div>
          </div>
        ) : (
          /* Empty Upload Dropzone */
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-2.5 text-center transition-all ${
              isUploading
                ? "border-primary/40 bg-primary/5 cursor-wait"
                : "border-border/80 hover:border-primary/50 bg-background/50 hover:bg-muted/40 cursor-pointer shadow-2xs"
            }`}
          >
            {isUploading ? (
              <>
                <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <span className="text-xs font-semibold text-muted-foreground">
                  Uploading photo to server...
                </span>
              </>
            ) : (
              <>
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Upload Cover Photo & Gallery
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
      <section className="bg-card border border-border/80 rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xs">
        <div className="flex items-center gap-3 pb-3 border-b border-border/60">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold font-display text-foreground">
              Publishing Settings
            </h2>
            <p className="text-xs text-muted-foreground">
              Select category, visibility status, scheduled publishing time, and tags.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Category Dropdown (NO EMOJIS, Clean Lucide Icons) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Category *
            </Label>
            <Select
              value={form.category}
              onValueChange={(val: PostCategory) =>
                setForm((f) => ({ ...f, category: val }))
              }
            >
              <SelectTrigger className="h-11 rounded-xl bg-background border border-border text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Waste Tip" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Waste Tip
                  </span>
                </SelectItem>
                <SelectItem value="Event" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Community Event
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Dropdown (NO EMOJIS, Clean Lucide Icons) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Status *
            </Label>
            <Select
              value={form.status}
              onValueChange={(val: PostStatus) =>
                setForm((f) => ({ ...f, status: val }))
              }
            >
              <SelectTrigger className="h-11 rounded-xl bg-background border border-border text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Published" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Published
                  </span>
                </SelectItem>
                <SelectItem value="Draft" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Draft
                  </span>
                </SelectItem>
                <SelectItem value="Scheduled" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Scheduled
                  </span>
                </SelectItem>
                <SelectItem value="Archived" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    Archived
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scheduled Publishing Time (if Scheduled) */}
        {form.status === "Scheduled" && (
          <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
            <Label className="text-xs font-semibold text-foreground">
              Scheduled Publish Time *
            </Label>
            <CustomDateTimePicker
              value={form.scheduledDate}
              onChange={(iso) => setForm((f) => ({ ...f, scheduledDate: iso }))}
            />
            <p className="text-xs text-muted-foreground">
              This post will automatically become visible to residents at this scheduled date and time.
            </p>
          </div>
        )}

        {/* Tags */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            Tags (Optional)
          </Label>
          <div className="relative">
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="e.g., composting, recycling, clean-up (comma-separated)"
              className="h-11 pl-10 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          {parsedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parsedTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Featured Post Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border/80 bg-muted/20">
          <div className="space-y-0.5 pr-4">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Feature on Resident Carousel
            </Label>
            <p className="text-xs text-muted-foreground">
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
      </section>

      {/* ── Section 4: Footer Action Controls ── */}
      <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {onPreview && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onPreview(getFormWithImages())}
              className="h-11 px-4 rounded-xl text-xs sm:text-sm font-semibold gap-2 border-border/80 bg-card hover:bg-muted text-foreground transition-all cursor-pointer active:scale-95 shadow-2xs"
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
            onClick={onBack}
            className="h-11 px-4 rounded-xl text-xs sm:text-sm font-semibold border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            Cancel
          </Button>

          {form.status !== "Draft" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm((f) => ({ ...f, status: "Draft" }));
                onSave({ ...getFormWithImages(), status: "Draft" });
              }}
              disabled={!form.title.trim() || isUploading || isSaving}
              className="h-11 px-4 rounded-xl text-xs sm:text-sm font-semibold gap-2 border-border/80 bg-card hover:bg-muted text-foreground transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>Save as Draft</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={() => onSave(getFormWithImages())}
            disabled={
              !form.title.trim() || !form.body.trim() || isUploading || isSaving
            }
            className="h-11 px-5 rounded-xl text-xs sm:text-sm font-semibold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all cursor-pointer active:scale-95"
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
    </div>
  );
};

export default PostEditor;
export type { EditorForm };
