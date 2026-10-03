import React, { useState, useEffect, useMemo } from "react";
import { Heart, Calendar, User } from "lucide-react";
import { communityContentStyles as contentStyles } from "@/components/communityContentStyles";
import { PostItem, formatCategory, parsePostDate, getCategoryBadgeStyle } from "./types";
import { PostImagePlaceholder } from "./PostImagePlaceholder";
import PostImageBackdrop from "@/components/common/PostImageBackdrop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-sm focus-within:border-primary/40 motion-reduce:transition-none"
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
              decoding="async"
              className="relative z-10 max-w-full max-h-full object-contain object-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              onError={() => setImageFailed(true)}
            />
          </>
        ) : (
          <PostImagePlaceholder category={post.category} title={post.title} />
        )}

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
        <div className="space-y-2.5">
          <Badge className={`${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
            {categoryLabel}
          </Badge>

          <h3 className="gw-heading text-base leading-snug tracking-tight text-foreground">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClick();
              }}
              className="line-clamp-2 w-full break-words cursor-pointer rounded-sm text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card [text-wrap:pretty]"
            >
              {post.title}
            </button>
          </h3>

          <p className="break-words text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {post.body}
          </p>
        </div>

        {/* ── Card Footer: Reactions & Metadata ── */}
        <div className={contentStyles.cardFooter}>
          <div className={contentStyles.cardMetadata}>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {dateInfo.formatted}
            </span>
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5" title={post.author_name || "MENRO Candelaria"}>
              <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{post.author_name || "MENRO Candelaria"}</span>
            </span>
          </div>

          {onToggleLike ? (
            <Button
              type="button"
              variant={post.is_liked ? "destructive-outline" : "outline"}
              aria-label={`${post.is_liked ? "Unlike" : "Like"} ${post.title}`}
              aria-pressed={Boolean(post.is_liked)}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(post);
              }}
              className={`${contentStyles.reactionSize} gap-1.5 px-2.5 text-xs [&_svg]:size-3.5`}
            >
              <Heart className={post.is_liked ? "fill-current" : undefined} aria-hidden="true" />
              <span className="tabular-nums">{Number(post.like_count || 0)}</span>
            </Button>
          ) : (
            <span className={`inline-flex items-center justify-center gap-1.5 ${contentStyles.reactionSize} px-2.5 rounded-lg border border-border/80 text-xs font-semibold text-muted-foreground`} aria-label={`${Number(post.like_count || 0)} ${Number(post.like_count || 0) === 1 ? "reaction" : "reactions"}`}>
              <Heart className={`w-3.5 h-3.5 ${post.is_liked ? "fill-destructive text-destructive" : ""}`} aria-hidden="true" />
              <span className="tabular-nums">{Number(post.like_count || 0)}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default PostCard;

