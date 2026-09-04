import React, { useState, useEffect, useMemo } from "react";
import { Heart, Calendar, ArrowRight } from "lucide-react";
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
      className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-sm overflow-hidden flex flex-col hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
    >
      {/* ── Image Area ── */}
      <div className="relative aspect-[16/10] overflow-hidden bg-black/40 border-b border-border/40 flex items-center justify-center">
        {currentImage && !imageFailed ? (
          <>
            {/* Ambient blurred backdrop */}
            <img
              key={`bg-${post.id}-${imageIndex}`}
              src={currentImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-50 dark:opacity-40 select-none pointer-events-none transition-all duration-500 ease-in-out"
            />
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] pointer-events-none" />

            {/* Crisp foreground image */}
            <img
              key={`img-${post.id}-${imageIndex}`}
              src={currentImage}
              alt={post.title}
              className="relative z-10 max-w-full max-h-full object-contain object-center drop-shadow-md group-hover:scale-105 transition-all duration-500 ease-in-out"
              onError={() => setImageFailed(true)}
            />
          </>
        ) : (
          <PostImagePlaceholder category={post.category} title={post.title} />
        )}

        {/* Top-left category badge */}
        <div className="absolute top-3 left-3 z-20">
          <span
            className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
          >
            {categoryLabel}
          </span>
        </div>

        {/* Top-right date badge */}
        <div className="absolute top-3 right-3 z-20 bg-background/90 dark:bg-black/80 backdrop-blur-md rounded-xl px-2.5 py-1 text-center shadow-md min-w-[44px] border border-border/50">
          <span className="block text-[9px] font-bold text-primary tracking-widest leading-none">
            {dateInfo.month}
          </span>
          <span className="block text-sm font-display font-extrabold text-foreground leading-tight mt-0.5">
            {dateInfo.day}
          </span>
        </div>

        {/* Multi-image pagination dots indicator */}
        {validImages.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15">
            {validImages.map((_, idx) => (
              <span
                key={idx}
                className={`block rounded-full transition-all duration-300 ${
                  idx === imageIndex ? "w-3 h-1 bg-emerald-400" : "w-1 h-1 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Content Area ── */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {dateInfo.formatted}
            </span>
            <span>•</span>
            <span className="truncate">{post.author_name || post.source || "MENRO Candelaria"}</span>
          </div>

          <h3 className="font-display text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2">
            {post.title}
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {post.body}
          </p>
        </div>

        {/* ── Card Footer: Likes & Read Action ── */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          {onToggleLike ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(post);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-200 ${
                post.is_liked
                  ? "text-destructive bg-destructive/10 border border-destructive/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${post.is_liked ? "fill-destructive" : ""}`} />
              <span>{Number(post.like_count || 0)}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-muted-foreground">
              <Heart className={`w-3.5 h-3.5 ${post.is_liked ? "fill-destructive text-destructive" : ""}`} />
              <span>{Number(post.like_count || 0)}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform duration-200">
            Read article <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
