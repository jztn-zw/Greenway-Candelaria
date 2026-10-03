import { useResidentResource, useResidentMutation } from "@/lib/residentQuery";
import { useState, useEffect, useRef } from "react";
import { PostActions, PostMetadata } from "@/components/common/PostDetailInfo";
import { BackButton } from "@/components/common/BackButton";
import { ResidentPageTitle } from "@/components/common/ResidentPageHeader";
import { communityContentStyles as contentStyles } from "@/components/communityContentStyles";
import { toast } from "@/lib/toast";
import postsService from "@/services/postsService";
import { PostItem, formatCategory, parsePostDate, getCategoryBadgeStyle } from "./types";
import { PostImagePlaceholder } from "./PostImagePlaceholder";
import PostImageBackdrop from "@/components/common/PostImageBackdrop";
import PostCard from "./PostCard";

interface PostDetailProps {
  post: PostItem;
  relatedPosts: PostItem[];
  onOpenPost: (post: PostItem) => void;
  onBack: () => void;
  onPostUpdated?: (updated: PostItem) => void;
  onToggleRelatedLike?: (post: PostItem) => void;
}

const PostDetail = ({
  post: initialPost,
  relatedPosts,
  onOpenPost,
  onBack,
  onPostUpdated,
  onToggleRelatedLike,
}: PostDetailProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const detail = useResidentResource<PostItem>("posts", ["detail", initialPost.id], () => postsService.getById(initialPost.id), initialPost);
  const post = detail.data;
  const setPost = detail.setData;
  const isLoading = detail.isLoading;
  const like = useResidentMutation(postsService.like, "posts");
  const unlike = useResidentMutation(postsService.unlike, "posts");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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
        await like(post.id);
      } else {
        await unlike(post.id);
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
      className={`${contentStyles.detailPage} animate-in fade-in duration-300`}
    >
      <BackButton onBack={onBack} label="Back to updates" />
      <div className="space-y-6 md:space-y-7 lg:space-y-8">
        {/* ── Main Post (Unboxed Natural Layout) ── */}
        <article className={contentStyles.detailArticle}>
        <div className={contentStyles.detailImage}>
          {currentImage && !imageFailed ? (
            <>
              <PostImageBackdrop src={currentImage} />
              {/* Crisp, uncropped, undistorted original image centered */}
              <img
                key={`img-${activeImageIndex}`}
                src={currentImage}
                alt={post.title}
                className="relative z-10 max-w-full max-h-full object-contain object-center transition-all duration-700 ease-in-out"
                onError={() => setImageFailed(true)}
              />
            </>
          ) : (
            <PostImagePlaceholder category={post.category} title={post.title} isFeatured />
          )}

          {/* Top-left category badge */}
          <div className="absolute left-3 top-3 z-20 lg:left-4 lg:top-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-ui-overline font-bold uppercase tracking-wider shadow-2xs backdrop-blur-md lg:px-3 lg:py-1 lg:text-ui-caption ${getCategoryBadgeStyle(post.category).bg} ${getCategoryBadgeStyle(post.category).text} ${getCategoryBadgeStyle(post.category).border}`}
            >
              <span>{categoryLabel}</span>
            </span>
          </div>

          {/* Image count / index indicator if multiple images */}
          {validImages.length > 1 && (
            <div className="absolute right-3 top-3 z-20 rounded-md border border-white/15 bg-black/60 px-2.5 py-1 text-ui-caption font-semibold text-white/95 shadow-2xs backdrop-blur-md lg:right-4 lg:top-4">
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
                      ? "border-primary ring-2 ring-primary/30 opacity-100 shadow-xs"
                      : "gw-action-ghost opacity-65 hover:opacity-100"
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
        <div className={contentStyles.detailHeader}>
          <ResidentPageTitle className={contentStyles.detailTitle}>
            {post.title}
          </ResidentPageTitle>

          <PostMetadata date={dateInfo.formatted} author={post.author_name} />
        </div>

        {/* ── Action Row ── */}
        <PostActions
          reactionCount={Number(post.like_count || 0)}
          isLiked={Boolean(post.is_liked)}
          reactionPending={isLiking}
          linkCopied={copied}
          onToggleReaction={handleToggleLike}
          onShare={handleShare}
        />

        <div className="border-t border-border/60" />

        {/* ── Post Body Content ── */}
        <div className={contentStyles.detailBody}>
          {post.body.split("\n\n").map((paragraph, idx) => (
            <p key={idx}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* ── Tags / Badges ── */}
        {post.tags && post.tags.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium mr-1">Tags:</span>
              {post.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="max-w-full break-words [overflow-wrap:anywhere] px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/60 text-muted-foreground border border-border/80 hover:border-primary/30 hover:text-foreground transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
        )}
        </article>

        {/* ── Related Updates Section ── */}
        {relatedPosts.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-border/60">
          <div className="flex items-center justify-between">
            <h2 className="gw-heading text-base lg:text-lg text-foreground">
              Related Updates
            </h2>
          </div>

          <div className={contentStyles.grid}>
            {relatedPosts.map((rel) => (
              <PostCard
                key={rel.id}
                post={rel}
                onToggleLike={onToggleRelatedLike}
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

