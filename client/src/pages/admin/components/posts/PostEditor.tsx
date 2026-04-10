import { useState } from "react";
import {
  Bold,
  Italic,
  Heading,
  ListIcon,
  ListOrdered,
  Image as ImageIcon,
  Tag,
  Eye,
  Trash2,
  MessageCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Post,
  PostCategory,
  PostStatus,
  Comment,
  getReadingTime,
} from "./types";
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
  commentsEnabled: boolean;
  images: string[];
}

interface PostEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPost: Post | null;
  onSave: (form: EditorForm) => void;
  onPreview: (form: EditorForm) => void;
  isSaving: boolean;
  comments: Comment[];
  onDeleteComment: (commentId: string) => void;
}

// ─── Component ─────────────────────────────────────────────

const PostEditor = ({
  open,
  onOpenChange,
  editingPost,
  onSave,
  onPreview,
  isSaving,
  comments,
  onDeleteComment,
}: PostEditorProps) => {
  const [form, setForm] = useState<EditorForm>({
    title: "",
    body: "",
    source: "",
    category: "Waste Tip",
    status: "Draft",
    featured: false,
    tags: "",
    scheduledDate: "",
    commentsEnabled: true,
    images: [],
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [lastPostId, setLastPostId] = useState<string | null>(null);

  // Sync logic
  if (open && editingPost && editingPost.id !== lastPostId) {
    setLastPostId(editingPost.id);
    setUploadedImages(editingPost.images ?? []);
    setForm({
      title: editingPost.title,
      body: editingPost.body,
      source: editingPost.source,
      category: editingPost.category,
      status: editingPost.status,
      featured: editingPost.featured,
      tags: editingPost.tags.join(", "),
      scheduledDate: editingPost.scheduledDate || "",
      commentsEnabled: editingPost.commentsEnabled,
      images: editingPost.images ?? [],
    });
  } else if (open && !editingPost && lastPostId !== "new") {
    setLastPostId("new");
    setUploadedImages([]);
    setForm({
      title: "",
      body: "",
      source: "",
      category: "Waste Tip",
      status: "Draft",
      featured: false,
      tags: "",
      scheduledDate: "",
      commentsEnabled: true,
      images: [],
    });
  }

  if (!open && lastPostId !== null) {
    setLastPostId(null);
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setIsUploading(true);
    try {
      const urls = await Promise.all(files.map(postsService.uploadImage));
      setUploadedImages((prev) => [...prev, ...urls]);
    } catch {
      console.error("Image upload failed");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const readingTime = form.body.trim() ? getReadingTime(form.body) : null;
  const getFormWithImages = (): EditorForm => ({
    ...form,
    images: uploadedImages,
  });

  const saveLabel =
    form.status === "Draft"
      ? "Save as Draft"
      : form.status === "Published"
        ? "Publish Now"
        : form.status === "Scheduled"
          ? "Schedule Post"
          : "Save";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editingPost ? "Edit Post" : "Create New Post"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Enter post title..."
              className="bg-background"
            />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Source</Label>
            <Input
              value={form.source}
              onChange={(e) =>
                setForm((f) => ({ ...f, source: e.target.value }))
              }
              placeholder="e.g. MENRO-Candelaria, Quezon"
              className="bg-background"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Body *</Label>
              {readingTime && (
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                  {readingTime}
                </span>
              )}
            </div>
            <div className="border border-input rounded-lg overflow-hidden bg-background">
              <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <Bold className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <Italic className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <Heading className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <ListIcon className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                >
                  <ListOrdered className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <Textarea
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                placeholder="Write your post content..."
                className="min-h-[160px] border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
              />
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as PostCategory }))
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Waste Tip">Waste Tip</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status *</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as PostStatus }))
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduled Date */}
          {form.status === "Scheduled" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Schedule Date & Time *
              </Label>
              <Input
                type="datetime-local"
                value={form.scheduledDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduledDate: e.target.value }))
                }
                className="bg-background"
              />
            </div>
          )}

          {/* ── Image Upload Section ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Images</Label>
            {uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-3 pb-2 transition-all">
                {uploadedImages.map((url, i) => (
                  <div
                    key={i}
                    className={`relative group/img w-24 h-24 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === 0 ? "border-primary shadow-md scale-105 z-10" : "border-border"}`}
                  >
                    <img
                      src={url}
                      className="w-full h-full object-cover"
                      alt={`post-${i}`}
                    />
                    {i === 0 && (
                      <div className="absolute top-0 left-0 bg-primary text-[8px] text-white px-1.5 py-0.5 rounded-br-md font-bold uppercase z-20">
                        Main
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity z-30">
                      <div className="flex gap-1">
                        {i > 0 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-full shadow-sm"
                            onClick={() => {
                              const newImgs = [...uploadedImages];
                              [newImgs[i - 1], newImgs[i]] = [
                                newImgs[i],
                                newImgs[i - 1],
                              ];
                              setUploadedImages(newImgs);
                            }}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                        )}
                        {i < uploadedImages.length - 1 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-full shadow-sm"
                            onClick={() => {
                              const newImgs = [...uploadedImages];
                              [newImgs[i + 1], newImgs[i]] = [
                                newImgs[i],
                                newImgs[i + 1],
                              ];
                              setUploadedImages(newImgs);
                            }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 rounded-full shadow-sm"
                        onClick={() => removeImage(i)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 transition-colors ${isUploading ? "border-primary/30 cursor-not-allowed opacity-70" : "border-border hover:border-primary/40 cursor-pointer bg-muted/5"}`}
            >
              {isUploading ? (
                <>
                  <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">
                    Click to upload photos
                  </p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tags</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
                placeholder="comma separated tags..."
                className="pl-9 bg-background"
              />
            </div>
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
            <div>
              <Label className="text-xs font-semibold">Featured Post</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Show in hero carousel on content page.
              </p>
            </div>
            <Switch
              checked={form.featured}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, featured: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onPreview(getFormWithImages())}
            className="gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          <Button
            onClick={() => onSave(getFormWithImages())}
            disabled={
              !form.title.trim() || !form.body.trim() || isUploading || isSaving
            }
          >
            {(isUploading || isSaving) && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            )}
            {isUploading ? "Uploading..." : isSaving ? "Saving..." : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostEditor;
export type { EditorForm };
