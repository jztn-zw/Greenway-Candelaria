import { useState, useEffect, useRef } from "react";
import { Heart, Calendar, User, MapPin, ArrowRight, FileText, Share2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/common";
import { toast } from "@/lib/toast";
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

  const handleShare = async () => {
    const url = `${window.location.origin}/resident/contents?post=${post.id}`;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable");
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Post link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Unable to copy the link. Please copy it from your browser address bar.");
    }
  };

  const currentImage = validImages[activeImageIndex] || null;
  const dateInfo = parsePostDate(post.published_at || post.created_at);
  const categoryLabel = formatCategory(post.category);

  return (
    <div
      ref={contentRef}
      className="w-full max-w-[1000px] mx-auto pb-4 sm:pb-6 animate-in fade-in duration-300"
    >
      {/* ── Top Back Navigation ── */}
      <div className="hidden sm:mb-8 sm:block">
        <BackButton label="Back to Community Updates" onClick={onBack} />
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* ── Main Post (Unboxed Natural Layout) ── */}
        <article className="space-y-6">
        {/* ── 1080 × 566 Responsive Landscape Image Container with Blurred Backdrop ── */}
        <div className="relative w-full aspect-[1080/566] max-h-[566px] rounded-2xl overflow-hidden bg-muted/20 border border-border/80 shadow-2xs flex items-center justify-center">
          {currentImage && !imageFailed ? (
            <>
              {/* Blurred background filling the full 1080:566 container */}
              <img
                key={`bg-${activeImageIndex}`}
                src={currentImage}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50 dark:opacity-30 select-none pointer-events-none transition-all duration-700 ease-in-out"
              />
              <div className="absolute inset-0 bg-background/10 dark:bg-black/30 pointer-events-none" />

              {/* Crisp, uncropped, undistorted original image centered */}
              <img
                key={`img-${activeImageIndex}`}
                src={currentImage}
                alt={post.title}
                className="relative z-10 max-w-full max-h-full object-contain object-center drop-shadow-sm transition-all duration-700 ease-in-out"
                onError={() => setImageFailed(true)}
              />
            </>
          ) : (
            <PostImagePlaceholder category={post.category} title={post.title} isFeatured />
          )}

          {/* Top-left category badge */}
          <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-2xs backdrop-blur-md sm:px-3 sm:py-1 sm:text-[11px] ${getCategoryBadgeStyle(post.category).bg} ${getCategoryBadgeStyle(post.category).text} ${getCategoryBadgeStyle(post.category).border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${getCategoryBadgeStyle(post.category).dot}`} />
              <span>{categoryLabel}</span>
            </span>
          </div>

          {/* Image count / index indicator if multiple images */}
          {validImages.length > 1 && (
            <div className="absolute right-3 top-3 z-20 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white/95 shadow-2xs backdrop-blur-md sm:right-4 sm:top-4">
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
                  className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 ${
                    isActive
                      ? "border-primary ring-2 ring-primary/30 opacity-100 shadow-xs"
                      : "border-border/70 opacity-65 hover:opacity-100 hover:border-primary/40"
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
          <h1 className="break-words text-2xl font-display font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {post.title}
          </h1>

          <div className="flex flex-col items-start gap-1.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:text-sm">
            <span className="flex max-w-full items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {dateInfo.formatted}
            </span>
            <span className="hidden text-border sm:inline">•</span>
            <span className="flex min-w-0 max-w-full items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{post.author_name || "MENRO Candelaria"}</span>
            </span>
            {post.source && (
              <>
                <span className="hidden text-border sm:inline">•</span>
                <span className="flex min-w-0 max-w-full items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{post.source}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Action Row ── */}
        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={isLiking}
            className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border cursor-pointer active:scale-95 shadow-2xs ${
              post.is_liked
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "bg-card text-muted-foreground border-border/80 hover:bg-muted/70 hover:text-foreground hover:border-border"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Heart
              className={`w-4 h-4 ${post.is_liked ? "fill-destructive text-destructive" : ""}`}
            />
            <span>{Number(post.like_count || 0)}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border bg-card text-muted-foreground border-border/80 hover:bg-muted/70 hover:text-foreground hover:border-border cursor-pointer active:scale-95 shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-primary" />
                <span className="text-primary font-bold">Link Copied</span>
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
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/60 text-muted-foreground border border-border/80 hover:border-primary/30 hover:text-foreground transition-colors"
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
    </div>
  );
};

export default PostDetail;
