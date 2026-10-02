import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Calendar, ChevronLeft, ChevronRight, Star, User } from "lucide-react";
import { communityContentStyles as styles } from "@/components/communityContentStyles";
import PostImageBackdrop from "@/components/common/PostImageBackdrop";
import PostImagePlaceholder from "@/components/common/PostImagePlaceholder";
import { Badge } from "@/components/ui/badge";
import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { Button } from "@/components/ui/button";
import { formatCategory, parsePostDate, type PostItem } from "./types";

interface FeaturedPostCarouselProps {
  posts: PostItem[];
  onOpenPost: (post: PostItem) => void;
}

export default function FeaturedPostCarousel({ posts, onOpenPost }: FeaturedPostCarouselProps) {
  const [position, setPosition] = useState({ postId: posts[0]?.id, photoIndex: 0 });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(document.visibilityState === "hidden");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);

  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(Boolean(preference?.matches));
    const updateVisibility = () => setHidden(document.visibilityState === "hidden");
    updateMotion();
    preference?.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      preference?.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const activeIndex = Math.max(0, posts.findIndex((post) => post.id === position.postId));
  const post = posts[activeIndex];
  const postId = post?.id;
  const images = (post?.images ?? []).filter((image) => typeof image === "string" && image.trim());
  const photoIndex = post?.id === position.postId ? Math.min(position.photoIndex, Math.max(0, images.length - 1)) : 0;
  const image = images[photoIndex];
  const paused = hovered || focused || hidden || reducedMotion;

  // Keep the selected post through background refreshes and list reordering.
  const changePost = useCallback((direction: number) => {
    setPosition((previous) => {
      const index = Math.max(0, posts.findIndex((item) => item.id === previous.postId));
      return { postId: posts[(index + direction + posts.length) % posts.length]?.id, photoIndex: 0 };
    });
  }, [posts]);

  useEffect(() => {
    if (paused || posts.length < 2) return;
    const timer = setTimeout(() => changePost(1), 7000);
    return () => clearTimeout(timer);
  }, [paused, posts.length, changePost, post?.id]);

  useEffect(() => {
    if (paused || images.length < 2 || !postId) return;
    const timer = setInterval(() => {
      setPosition((previous) => ({
        postId,
        photoIndex: ((previous.postId === postId ? previous.photoIndex : 0) + 1) % images.length,
      }));
    }, 4000);
    return () => clearInterval(timer);
  }, [paused, images.length, postId]);

  if (!post) return null;

  return (
    <section
      aria-label="Featured community posts"
      aria-roledescription="carousel"
      className={styles.featuredCard}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className={styles.featuredGrid}>
        <div className={styles.featuredDetails}>
          <article
            key={post.id}
            aria-roledescription="slide"
            aria-label={`${activeIndex + 1} of ${posts.length}`}
            aria-live={paused ? "polite" : "off"}
            className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`gap-1.5 ${getCategoryBadgeColors("Featured").className}`}>
                <Star className="h-3 w-3" aria-hidden="true" /> Featured
              </Badge>
              <Badge className={getCategoryBadgeColors(post.category).className}>
                {formatCategory(post.category)}
              </Badge>
            </div>

            <h2 className="gw-heading text-xl leading-tight tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              <button
                type="button"
                onClick={() => onOpenPost(post)}
                className="line-clamp-3 w-full cursor-pointer rounded-md text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card [text-wrap:balance]"
              >
                {post.title}
              </button>
            </h2>

            <p className="max-w-[56ch] text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {post.body}
            </p>

            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex shrink-0 items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {parsePostDate(post.published_at || post.created_at).formatted}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{post.author_name || "MENRO Candelaria"}</span>
              </span>
            </div>
          </article>

          <div className={styles.featuredFooter}>
            <Button onClick={() => onOpenPost(post)} className="h-11 gap-2 px-4 text-xs md:h-10">
              Read post <ArrowUpRight aria-hidden="true" />
            </Button>

          </div>
        </div>

        <div className={styles.featuredMedia}>
          <button
            type="button"
            onClick={() => onOpenPost(post)}
            aria-label={`Read ${post.title}`}
            className={`${styles.featuredImage} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}
          >
            {image && image !== failedImage ? <>
              <PostImageBackdrop src={image} />
              <img
                key={image}
                src={image}
                alt={post.title}
                decoding="async"
                onError={() => setFailedImage(image)}
                className="relative h-full w-full object-contain motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              />
            </> : <PostImagePlaceholder category={post.category} title={post.title} isFeatured />}
          </button>
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex max-w-[90%] -translate-x-1/2 overflow-x-auto rounded-lg border border-border/70 bg-card/95 p-0.5 scrollbar-none" role="group" aria-label="Featured post photos">
              {images.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPosition({ postId: post.id, photoIndex: index })}
                  aria-label={`Show photo ${index + 1}`}
                  aria-pressed={index === photoIndex}
                  className="gw-action-ghost flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:h-9 md:w-9"
                >
                  <span className={`h-1.5 w-1.5 rounded-full transition-colors ${index === photoIndex ? "bg-primary" : "bg-muted-foreground/40"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {posts.length > 1 && (
        <>
          <div role="group" aria-label="Featured post navigation">
            <Button variant="outline" size="icon" className={`${styles.featuredArrow} left-3 md:left-2`} onClick={() => changePost(-1)} aria-label="Previous featured post">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon" className={`${styles.featuredArrow} right-3 md:right-2`} onClick={() => changePost(1)} aria-label="Next featured post">
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className={styles.featuredPagination} role="group" aria-label="Choose featured post">
            {posts.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show featured post ${index + 1}: ${item.title}`}
                aria-pressed={index === activeIndex}
                onClick={() => setPosition({ postId: item.id, photoIndex: 0 })}
                className={`${styles.carouselDotButton} ${index === activeIndex ? "w-5" : "w-2"}`}
              >
                <span aria-hidden="true" className={`h-1 rounded-full transition-colors duration-200 motion-reduce:transition-none ${index === activeIndex ? "w-4 bg-foreground" : "w-1 bg-muted-foreground/50"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
