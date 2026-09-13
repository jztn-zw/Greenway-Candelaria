import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  User,
  MapPin,
  Eye,
  Heart,
  FileText,
  Share2,
  Check,
  MoreVertical,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/common";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Post, statusStyles, categoryStyles } from "./types";
import PostImagePlaceholder from "./PostImagePlaceholder";

interface AdminPostDetailProps {
  post: Post;
  onBack: () => void;
  onEdit?: (post: Post) => void;
  onDuplicate?: (post: Post) => void;
  onArchive?: (post: Post) => void;
  onTogglePublish?: (post: Post) => void;
  onToggleFeatured?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  isPreview?: boolean;
}

const AdminPostDetail = ({
  post,
  onBack,
  onEdit,
  onDuplicate,
  onArchive,
  onTogglePublish,
  onToggleFeatured,
  onDelete,
  isPreview = false,
}: AdminPostDetailProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [isPreviewLiked, setIsPreviewLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  const isArchived = post.status === "Archived";
  const isPublished = post.status === "Published";

  const validImages = (post.images || []).filter(
    (img) => typeof img === "string" && img.trim().length > 0,
  );

  useEffect(() => {
    setActiveImageIndex(0);
    setImageFailed(false);
  }, [post.id]);

  // Auto-slide every 5 seconds if multiple images
  useEffect(() => {
    if (validImages.length <= 1) return;
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % validImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [validImages.length, activeImageIndex]);

  const currentImage = validImages[activeImageIndex] || null;

  return (
    <div
      ref={contentRef}
      className="w-full max-w-[1000px] mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in duration-300"
    >
      {/* ── Top Back Navigation (Admin view only) ── */}
      {!isPreview && (
        <div>
          <BackButton label="Back to Posts" onClick={onBack} />
        </div>
      )}

      {/* ── Main Post Article ── */}
      <article className="space-y-6">
        {/* ── 1080 × 566 Responsive Landscape Image Container with Blurred Backdrop ── */}
        <div className="relative w-full aspect-[1080/566] max-h-[566px] rounded-2xl overflow-hidden bg-black/40 border border-border/40 flex items-center justify-center">
          {currentImage && !imageFailed ? (
            <>
              {/* Blurred background */}
              <img
                key={`bg-${activeImageIndex}`}
                src={currentImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60 dark:opacity-40 select-none pointer-events-none transition-all duration-700 ease-in-out"
              />
              <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] pointer-events-none" />

              {/* Crisp original image centered */}
              <img
                key={`img-${activeImageIndex}`}
                src={currentImage}
                alt={post.title}
                className="relative z-10 max-w-full max-h-full object-contain object-center drop-shadow-md transition-all duration-700 ease-in-out"
                onError={() => setImageFailed(true)}
              />
            </>
          ) : (
            <PostImagePlaceholder
              category={post.category}
              title={post.title}
              isFeatured={post.featured}
            />
          )}

          {/* Top-left Content Category Badge */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <span
              className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm backdrop-blur-md ${categoryStyles[post.category] || "bg-background/95 text-foreground border-border"}`}
            >
              {post.category}
            </span>
          </div>

          {/* Top-right Admin Status & Featured Badges */}
          {!isPreview && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
              <Badge
                variant="outline"
                className={`text-xs font-semibold px-3 py-1 border shadow-xs rounded-full backdrop-blur-md pointer-events-none ${statusStyles[post.status] || "bg-background/95 text-foreground border-border"}`}
              >
                {post.status}
              </Badge>

              {post.featured && (
                <Badge
                  variant="outline"
                  className="text-xs font-semibold bg-amber-500/90 text-white border-amber-400/50 shadow-xs gap-1 px-2.5 py-1 rounded-full backdrop-blur-md pointer-events-none"
                >
                  <Star className="w-3.5 h-3.5 fill-white" /> Featured
                </Badge>
              )}
            </div>
          )}

          {/* Multi-image index indicator */}
          {validImages.length > 1 && (
            <div className="absolute bottom-4 right-4 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-white/90 border border-white/10">
              {activeImageIndex + 1} / {validImages.length}
            </div>
          )}
        </div>

        {/* ── Horizontal Thumbnail Strip (If 2 or more images) ── */}
        {validImages.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto py-2.5 px-1.5 scrollbar-thin">
            {validImages.map((imgUrl, idx) => {
              const isActive = idx === activeImageIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer shadow-2xs ${
                    isActive
                      ? "border-primary ring-2 ring-primary/40 opacity-100 shadow-sm"
                      : "border-border/60 opacity-60 hover:opacity-100 hover:border-primary/50"
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover object-center"
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Post Header Info with 3-dots Action Dropdown ── */}
        <div className="space-y-3 pt-1">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-foreground tracking-tight leading-tight flex-1">
              {post.title}
            </h1>

            {/* 3 Vertical Dots Dropdown (Admin actions) */}
            {!isPreview && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shrink-0 mt-1"
                    aria-label="Post actions"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/80 p-1 shadow-md">
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={() => onEdit(post)}
                      className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
                    >
                      Edit Article
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem
                      onClick={() => onDuplicate(post)}
                      className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
                    >
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {!isArchived && onTogglePublish && (
                    <DropdownMenuItem
                      onClick={() => onTogglePublish(post)}
                      className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
                    >
                      {isPublished ? "Unpublish" : "Publish"}
                    </DropdownMenuItem>
                  )}
                  {!isArchived && onToggleFeatured && (
                    <DropdownMenuItem
                      onClick={() => onToggleFeatured(post)}
                      className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
                    >
                      {post.featured ? "Unfeature" : "Feature Post"}
                    </DropdownMenuItem>
                  )}
                  {onArchive && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={() => onArchive(post)}
                        className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
                      >
                        {isArchived ? "Restore" : "Archive"}
                      </DropdownMenuItem>
                    </>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={() => onDelete(post)}
                        className="text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg px-2.5 py-2"
                      >
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Metadata Row: Date, Author, (Views & Reacts in Admin View) */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {post.publishedDate || "Just now"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-muted-foreground" />
              {post.author || "MENRO Candelaria"}
            </span>
            {post.source && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {post.source}
                </span>
              </>
            )}
            {!isPreview && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  {(post.views || 0).toLocaleString()} views
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  {(post.likes || 0).toLocaleString()} Reacts
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Action Buttons Row in Preview Only ── */}
        {isPreview && (
          <div className="flex items-center gap-3 pt-1 flex-wrap select-none">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border bg-background/80 text-muted-foreground border-border cursor-default opacity-85 pointer-events-none"
              title="Preview mode: Likes disabled"
            >
              <Heart className="w-4 h-4 text-muted-foreground" />
              <span>{(post.likes || 0).toLocaleString()} Likes</span>
            </div>

            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border bg-background/80 text-muted-foreground border-border cursor-default opacity-85 pointer-events-none"
              title="Preview mode: Sharing disabled"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <span>Share Guide</span>
            </div>
          </div>
        )}

        <div className="border-t border-border/60" />

        {/* ── Post Body Content ── */}
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground/90 leading-relaxed space-y-4">
          {post.body.split("\n\n").map((para, idx) => (
            <p key={idx} className="text-sm sm:text-base leading-relaxed text-foreground/85">
              {para}
            </p>
          ))}
        </div>

        {/* ── Tags / Badges Section matching Resident ── */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-4 border-t border-border/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium mr-1">Tags:</span>
              {post.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/80 text-muted-foreground border border-border"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
};

export default AdminPostDetail;
