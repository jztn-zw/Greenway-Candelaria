import { useState, useEffect, useMemo } from "react";
import { Eye, Heart, Star, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Post, statusStyles, categoryStyles } from "./types";
import PostActionsDropdown from "./PostActionsDropdown";
import PostImagePlaceholder from "./PostImagePlaceholder";

interface PostCardProps {
  post: Post;
  onView: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDuplicate: (post: Post) => void;
  onArchive: (post: Post) => void;
  onTogglePublish: (post: Post) => void;
  onToggleFeatured?: (post: Post) => void;
  onDelete: (post: Post) => void;
}

const PostCard = ({
  post,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onTogglePublish,
  onToggleFeatured,
  onDelete,
}: PostCardProps) => {
  const isEvent = post.category === "Event";
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

  useEffect(() => {
    if (validImages.length <= 1) return;
    const interval = setInterval(() => {
      setImageIndex((prev) => (prev + 1) % validImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [validImages.length]);

  const currentImage = validImages[imageIndex] || null;

  return (
    <div
      className="bg-card border border-border/80 rounded-2xl overflow-hidden flex flex-col group hover:shadow-xl hover:border-primary/40 transition-all duration-300 cursor-pointer shadow-2xs"
      onClick={() => onView(post)}
    >
      {/* Card header image */}
      <div className="h-40 sm:h-44 relative overflow-hidden bg-black/40 border-b border-border/40 flex items-center justify-center">
        {currentImage && !imageFailed ? (
          <>
            {/* Blurred background backdrop */}
            <img
              key={`bg-${post.id}-${imageIndex}`}
              src={currentImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-50 dark:opacity-40 select-none pointer-events-none transition-all duration-500 ease-in-out"
            />
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] pointer-events-none" />

            {/* Crisp centered foreground image */}
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

        {/* Floating badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 z-20 pointer-events-none">
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold border shadow-2xs rounded-full px-2.5 py-0.5 pointer-events-none ${categoryStyles[post.category] || "bg-primary/15 text-primary border-primary/30"}`}
          >
            {post.category}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold border shadow-2xs rounded-full px-2.5 py-0.5 pointer-events-none ${statusStyles[post.status] || "bg-muted text-foreground border-border"}`}
          >
            {post.status}
          </Badge>
        </div>

        {post.featured && (
          <div className="absolute top-3 right-3 z-20">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow" />
          </div>
        )}

        {post.status === "Scheduled" && post.scheduledDate && (
          <div className="absolute bottom-3 left-3 z-20">
            <span className="text-[10px] font-medium text-foreground bg-card/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1 shadow-sm">
              <Calendar className="w-3 h-3" />
              {new Date(post.scheduledDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}

        {/* Multi-image pagination dots indicator */}
        {validImages.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
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

      {/* Card body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 space-y-2.5">
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-2">
          {post.title}
        </h3>
        {post.source && (
          <p className="text-[10px] text-muted-foreground/70 italic line-clamp-1">
            {post.source}
          </p>
        )}
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {post.body}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-md border border-primary/15"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Meta row - Views and React count */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-2 border-t border-border">
          <span className="font-medium text-foreground">{post.author}</span>
          {post.publishedDate && <span>{post.publishedDate}</span>}
          <div className="flex items-center gap-3 ml-auto">
            <span className="flex items-center gap-1 font-medium text-muted-foreground">
              <Eye className="w-3.5 h-3.5" /> {post.views}
            </span>
            <span className="flex items-center gap-1 font-medium text-muted-foreground">
              <Heart className="w-3.5 h-3.5" /> {post.likes || 0}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <PostActionsDropdown
            post={post}
            onView={onView}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onTogglePublish={onTogglePublish}
            onToggleFeatured={onToggleFeatured}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default PostCard;
