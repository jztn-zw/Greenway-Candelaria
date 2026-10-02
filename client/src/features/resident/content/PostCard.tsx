import React, { useState, useEffect, useMemo } from "react";
import { Heart, Calendar, User } from "lucide-react";
import { communityContentStyles as contentStyles } from "@/components/communityContentStyles";
import { PostItem, formatCategory, parsePostDate, getCategoryBadgeStyle } from "./types";
import { PostImagePlaceholder } from "./PostImagePlaceholder";
import PostImageBackdrop from "@/components/common/PostImageBackdrop";

interface PostCardProps {
  post: PostItem;
  onToggleLike?: (post: PostItem) => void;
  onClick: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onToggleLike,
  onClick,
}) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const validImages = useMemo(
    () =>
      (post.images || []).filter(
        (img) => typeof img === "string" && img.trim().length > 0,
      ),
    [post.images],
  );

  useEffect(() => {
    setImageIndex(0);
    setImageFailed(false);
  }, [post.id]);

  // Auto-slide card images every 4 seconds if post has multiple images
  useEffect(() => {
    if (validImages.length <= 1) return;
    const interval = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % validImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [validImages.length]);

  const dateInfo = parsePostDate(post.published_at || post.created_at);
  const currentImage = validImages[imageIndex] || null;
  const categoryLabel = formatCategory(post.category);
  const catStyle = getCategoryBadgeStyle(post.category);

  return (
    <article
      onClick={onClick}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs transition-all duration-300 cursor-pointer select-none hover:border-primary/30 "
    >
      {/* ── Image Area ── */}
      <div className={contentStyles.cardImage}>
        {currentImage && !imageFailed ? (
          <>
            <PostImageBackdrop src={currentImage} />
            {/* Crisp foreground image */}
            <img
              key={`img-${post.id}-${imageIndex}`}
              src={currentImage}
              alt={post.title}
              className="relative z-10 max-w-full max-h-full object-contain object-center transition-all duration-500 ease-in-out"
              onError={() => setImageFailed(true)}
            />
          </>
        ) : (
          <PostImagePlaceholder category={post.category} title={post.title} />
        )}

        {/* Top-left category badge */}
        <div className="absolute top-3 left-3 z-20">
          <span
            className={`inline-flex items-center gap-1.5 text-ui-overline font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border shadow-2xs backdrop-blur-md ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
          >
            <span>{categoryLabel}</span>
          </span>
        </div>

        {/* Multi-image pagination dots indicator */}
        {validImages.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15 shadow-2xs">
            {validImages.map((_, idx) => (
              <span
                key={idx}
                className={`block rounded-full transition-all duration-300 ${
                  idx === imageIndex ? "w-3 h-1 bg-primary" : "w-1 h-1 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Content Area ── */}
      <div className={contentStyles.cardContent}>
        <div className="space-y-1.5">
          <h3 className="gw-heading text-ui-title lg:text-base text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors duration-200 line-clamp-2">
            {post.title}
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 font-normal">
            {post.body}
          </p>
        </div>

        {/* ── Card Footer: Reactions & Metadata ── */}
        <div className={contentStyles.cardFooter}>
          <div className={contentStyles.cardMetadata}>
            <span className="flex shrink-0 items-center gap-1 font-medium">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {dateInfo.formatted}
            </span>
            <span className="hidden shrink-0 text-border sm:inline">•</span>
            <span className="flex min-w-0 items-center gap-1 truncate">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{post.author_name || "MENRO"}</span>
            </span>
          </div>

          {onToggleLike ? (
            <button
              type="button"
              aria-label={`${post.is_liked ? "Unlike" : "Like"} ${post.title}`}
              aria-pressed={Boolean(post.is_liked)}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(post);
              }}
              className={`inline-flex items-center justify-center gap-1.5 ${contentStyles.reactionSize} px-2.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                post.is_liked
                  ? "text-destructive bg-destructive/10 border border-destructive/20 shadow-2xs"
                  : "gw-action-ghost border"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${post.is_liked ? "fill-destructive" : ""}`} />
              <span className="tabular-nums">{Number(post.like_count || 0)}</span>
            </button>
          ) : (
            <span className={`inline-flex items-center justify-center gap-1.5 ${contentStyles.reactionSize} px-2.5 rounded-lg text-xs font-semibold text-muted-foreground`}>
              <Heart className={`w-3.5 h-3.5 ${post.is_liked ? "fill-destructive text-destructive" : ""}`} />
              <span className="tabular-nums">{Number(post.like_count || 0)}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default PostCard;

