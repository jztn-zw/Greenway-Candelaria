import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { useState, useEffect, useRef } from "react";
import { PostActions, PostMetadata } from "@/components/common/PostDetailInfo";
import { BackButton } from "@/components/common/BackButton";
import { communityContentStyles as contentStyles } from "@/components/communityContentStyles";
import {
  MoreVertical,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Post, statusStyles, categoryStyles } from "./types";
import PostImagePlaceholder from "./PostImagePlaceholder";
import PostImageBackdrop from "@/components/common/PostImageBackdrop";

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
      className={`${contentStyles.detailPage} animate-in fade-in duration-300`}
    >
      <BackButton onBack={onBack} label={isPreview ? "Back to editor" : "Back to posts"} />
      {/* ── Main Post Article ── */}
      <article className={contentStyles.detailArticle}>
        <div className={contentStyles.detailImage}>
          {currentImage && !imageFailed ? (
            <>
              <PostImageBackdrop src={currentImage} />
              {/* Crisp original image centered */}
              <img
                key={`img-${activeImageIndex}`}
                src={currentImage}
                alt={post.title}
                className="relative z-10 max-w-full max-h-full object-contain object-center transition-all duration-700 ease-in-out"
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
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            <span
              className={`inline-flex items-center text-ui-caption font-bold uppercase tracking-wider px-3 py-1 rounded-md border shadow-sm backdrop-blur-md ${categoryStyles[post.category] || "bg-background/95 text-foreground border-border"}`}
            >
              {post.category}
            </span>
          </div>

          {/* Multi-image index indicator */}
          {validImages.length > 1 && (
            <div className="absolute bottom-4 right-4 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white/90 border border-white/10">
              {activeImageIndex + 1} / {validImages.length}
            </div>
          )}
        </div>

        {/* ── Horizontal Thumbnail Strip (If 2 or more images) ── */}
        {validImages.length > 1 && (
          <div className={contentStyles.detailThumbnails}>
            {validImages.map((imgUrl, idx) => {
              const isActive = idx === activeImageIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Show image ${idx + 1}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`${contentStyles.detailThumbnail} ${
                    isActive
                      ? "border-primary ring-2 ring-primary/40 opacity-100 shadow-sm"
                      : "gw-action-ghost opacity-60 hover:opacity-100"
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
        <div className={contentStyles.detailHeader}>
          {!isPreview && (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant="outline" className={statusStyles[post.status]}>{post.status}</Badge>
              {post.featured && (
                <Badge variant="outline" className={`gap-1 ${getCategoryBadgeColors("Featured").className}`}>
                  <Star className="size-3" aria-hidden="true" /> Featured
                </Badge>
              )}
            </div>
          )}
          <div className="flex min-w-0 items-start justify-between gap-2">
            <h1 className={`${contentStyles.detailTitle} flex-1`}>
              {post.title}
            </h1>

            {/* 3 Vertical Dots Dropdown (Admin actions) */}
            {!isPreview && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg cursor-pointer shrink-0"
                    aria-label="Post actions"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/80 p-1 shadow-md">
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={() => onEdit(post)}
                      className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
                    >
                      Edit Post
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

          {/* Post metadata and engagement totals */}
          <PostMetadata
            date={post.publishedDate}
            author={post.author}
            views={isPreview ? undefined : post.views || 0}
            reactions={isPreview ? undefined : post.likes || 0}
          />
        </div>

        {/* ── Action Buttons Row in Preview Only ── */}
        {isPreview && (
          <PostActions reactionCount={post.likes || 0} preview />
        )}

        <div className="border-t border-border/60" />

        {/* ── Post Body Content ── */}
        <div className={contentStyles.detailBody}>
          {post.body.split("\n\n").map((para, idx) => (
            <p key={idx}>
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
                  className="max-w-full break-words [overflow-wrap:anywhere] px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/80 text-muted-foreground border border-border"
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
