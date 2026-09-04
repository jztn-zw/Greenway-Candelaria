import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Heart, Calendar, User, ArrowRight, FileText, Share2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import postsService from "@/services/postsService";
import { PostItem, formatCategory, parsePostDate, getCategoryBadgeStyle } from "./types";
import { PostImagePlaceholder } from "./PostImagePlaceholder";
import PostCard from "./PostCard";

interface PostDetailProps {
  post: PostItem;
  onBack: () => void;
  relatedPosts: PostItem[];
  onOpenPost: (post: PostItem) => void;
  onPostUpdated?: (updated: PostItem) => void;
}

const PostDetail = ({
  post: initialPost,
  onBack,
  relatedPosts,
  onOpenPost,
  onPostUpdated,
}: PostDetailProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [post, setPost] = useState<PostItem>(initialPost);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const validImages = (post.images || []).filter(
    (img) => typeof img === "string" && img.trim().length > 0,
  );

  useEffect(() => {
    setActiveImageIndex(0);
    setImageFailed(false);
  }, [initialPost.id]);

  // Auto-slide every 5 seconds if multiple images
  useEffect(() => {
    if (validImages.length <= 1) return;
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % validImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [validImages.length, activeImageIndex]);

  useEffect(() => {
    let isMounted = true;
    const fetchLatestDetail = async () => {
      try {
        setIsLoading(true);
        const fresh = await postsService.getById(initialPost.id);
        if (isMounted && fresh) {
          setPost(fresh);
          onPostUpdated?.(fresh);
        }
      } catch (err) {
        // Fall back to initial post if error
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLatestDetail();
    return () => {
      isMounted = false;
    };
  }, [initialPost.id]);

  const handleToggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const prevLiked = Boolean(post.is_liked);
    const prevCount = Number(post.like_count || 0);

    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    const updatedPost = {
      ...post,
      is_liked: nextLiked,
      like_count: nextCount,
    };

    setPost(updatedPost);
    onPostUpdated?.(updatedPost);

    try {
      if (nextLiked) {
        await postsService.like(post.id);
      } else {
        await postsService.unlike(post.id);
      }
    } catch {
      // Revert if error
      const reverted = {
        ...post,
        is_liked: prevLiked,
        like_count: prevCount,
      };
      setPost(reverted);
      onPostUpdated?.(reverted);
    } finally {
      setIsLiking(false);
    }
  };

  const currentImage = validImages[activeImageIndex] || null;
  const dateInfo = parsePostDate(post.published_at || post.created_at);
  const categoryLabel = formatCategory(post.category);

  return (
    <div
      ref={contentRef}
      className="w-full max-w-[1000px] mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in duration-300"
    >
      {/* ── Top Back Navigation ── */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-muted/60 dark:bg-muted/40 hover:bg-muted hover:dark:bg-muted/70 border border-border/70 hover:border-border text-muted-foreground hover:text-foreground text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer active:scale-95 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-200 ease-out text-muted-foreground group-hover:text-foreground" />
          <span>Back to Community Updates</span>
        </button>
      </div>

      {/* ── Main Post (Unboxed Natural Layout) ── */}
      <article className="space-y-6">
        {/* ── 1080 × 566 Responsive Landscape Image Container with Blurred Backdrop ── */}
        <div className="relative w-full aspect-[1080/566] max-h-[566px] rounded-2xl overflow-hidden bg-black/40 border border-border/40 flex items-center justify-center">
          {currentImage && !imageFailed ? (
            <>
              {/* Blurred background filling the full 1080:566 container */}
              <img
                key={`bg-${activeImageIndex}`}
                src={currentImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60 dark:opacity-40 select-none pointer-events-none transition-all duration-700 ease-in-out"
              />
              <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] pointer-events-none" />

              {/* Crisp, uncropped, undistorted original image centered */}
              <img
                key={`img-${activeImageIndex}`}
                src={currentImage}
                alt={post.title}
                className="relative z-10 max-w-full max-h-full object-contain object-center drop-shadow-md transition-all duration-700 ease-in-out"
                onError={() => setImageFailed(true)}
              />
            </>
          ) : (
            <PostImagePlaceholder category={post.category} title={post.title} isFeatured />
          )}

          {/* Top-left category badge */}
          <div className="absolute top-4 left-4 z-20">
            <span
              className={`inline-flex items-center text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm ${getCategoryBadgeStyle(post.category).bg} ${getCategoryBadgeStyle(post.category).text} ${getCategoryBadgeStyle(post.category).border}`}
            >
              {categoryLabel}
            </span>
          </div>

          {/* Image count / index indicator if multiple images */}
          {validImages.length > 1 && (
            <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-white/90 border border-white/10">
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
                  className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer shadow-sm ${
                    isActive
                      ? "border-primary ring-2 ring-primary/40 opacity-100 shadow-md shadow-primary/10"
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

        {/* ── Post Header Info ── */}
        <div className="space-y-3 pt-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-foreground tracking-tight leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-primary" />
              {dateInfo.formatted}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-primary" />
              {post.author_name || post.source || "MENRO Candelaria"}
            </span>
          </div>
        </div>

        {/* ── Action Row ── */}
        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <button
            type="button"
            onClick={handleToggleLike}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border ${
              post.is_liked
                ? "bg-destructive/10 text-destructive border-destructive/30 shadow-sm"
                : "bg-background/80 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            }`}
          >
            <Heart
              className={`w-4 h-4 ${post.is_liked ? "fill-destructive text-destructive" : ""}`}
            />
            <span>{Number(post.like_count || 0)} Likes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const url = window.location.origin + `/resident/contents?post=${post.id}`;
              navigator.clipboard.writeText(url);
              setCopied(true);
              toast.success("Post link copied to clipboard!");
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border bg-background/80 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-primary" />
                <span className="text-primary">Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share Guide</span>
              </>
            )}
          </button>
        </div>

        <div className="border-t border-border/60" />

        {/* ── Post Body Content ── */}
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground/90 leading-relaxed space-y-4">
          {post.body.split("\n\n").map((paragraph, idx) => (
            <p key={idx} className="text-sm sm:text-base leading-relaxed text-foreground/85">
              {paragraph}
            </p>
          ))}
        </div>

        {/* ── Tags / Badges ── */}
        <div className="pt-2">
          {post.tags && post.tags.length > 0 && (
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
          )}
        </div>
      </article>

      {/* ── Related Updates Section ── */}
      {relatedPosts.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-border/60">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold font-display text-foreground">
              Related Updates
            </h2>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              View all updates <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {relatedPosts.map((rel) => (
              <PostCard
                key={rel.id}
                post={rel}
                onClick={() => onOpenPost(rel)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default PostDetail;
