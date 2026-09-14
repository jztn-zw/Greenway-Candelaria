import React, { useState, useEffect, useMemo } from "react";
import { Heart, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PostItem, formatCategory, parsePostDate, getCategoryBadgeStyle } from "./types";
import { PostImagePlaceholder } from "./PostImagePlaceholder";

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
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs transition-all duration-300 cursor-pointer select-none hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md active:scale-[0.99]"
    >
      {/* ── Image Area ── */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted/30 border-b border-border/60 flex items-center justify-center">
        {currentImage && !imageFailed ? (
          <>
            {/* Ambient blurred backdrop */}
            <img
              key={`bg-${post.id}-${imageIndex}`}
              src={currentImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-40 dark:opacity-30 select-none pointer-events-none transition-all duration-500 ease-in-out"
            />
            <div className="absolute inset-0 bg-background/10 dark:bg-black/20 pointer-events-none" />

            {/* Crisp foreground image */}
            <img
              key={`img-${post.id}-${imageIndex}`}
              src={currentImage}
              alt={post.title}
              className="relative z-10 max-w-full max-h-full object-contain object-center drop-shadow-sm group-hover:scale-[1.03] transition-all duration-500 ease-in-out"
              onError={() => setImageFailed(true)}
            />
          </>
        ) : (
          <PostImagePlaceholder category={post.category} title={post.title} />
        )}

        {/* Top-left category badge */}
        <div className="absolute top-3 left-3 z-20">
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs backdrop-blur-md ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
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
      <div className="p-4 lg:p-5 flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-1.5">
          <h3 className="font-display text-[15px] lg:text-base font-bold text-foreground leading-snug tracking-tight group-hover:text-primary transition-colors duration-200 line-clamp-2">
            {post.title}
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 font-normal">
            {post.body}
          </p>
        </div>

        {/* ── Card Footer: Reactions & Metadata ── */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex shrink-0 items-center gap-1 font-medium">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {dateInfo.formatted}
            </span>
            <span className="shrink-0 text-border">•</span>
            <span className="flex min-w-0 items-center gap-1 truncate">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{post.author_name || post.source || "MENRO"}</span>
            </span>
          </div>

          {onToggleLike ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(post);
              }}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer active:scale-95 ${
                post.is_liked
                  ? "text-destructive bg-destructive/10 border border-destructive/20 shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent hover:border-border/60"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${post.is_liked ? "fill-destructive" : ""}`} />
              <span className="tabular-nums">{Number(post.like_count || 0)}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground shrink-0">
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

