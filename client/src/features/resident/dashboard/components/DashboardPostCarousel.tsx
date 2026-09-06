import { useState, useEffect, useRef } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import postsService from "@/services/postsService";
import {
  PostItem,
  formatCategory,
  parsePostDate,
  getCategoryBadgeStyle,
} from "../../content/types";
import { PostImagePlaceholder } from "../../content/PostImagePlaceholder";

const AUTO_INTERVAL = 5000;

const DashboardPostCarousel = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* fetch */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await postsService.getAll({ status: "PUBLISHED" });
        const list: PostItem[] = Array.isArray(data) ? data : data?.data || [];
        if (mounted) setPosts(list.slice(0, 12));
      } catch {
        // silent — dashboard must not break
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setImgFailed(false);
  }, [activeIndex]);

  /* auto-advance */
  useEffect(() => {
    if (paused || posts.length < 2) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % posts.length);
    }, AUTO_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, posts.length]);

  const goTo = (idx: number) => setActiveIndex((idx + posts.length) % posts.length);

  if (isLoading) {
    return (
      <Card className="h-full border border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="h-1 bg-primary/30 animate-pulse" />
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3.5 sm:gap-4 min-h-[165px] animate-pulse items-start sm:items-center">
            <div className="w-full sm:w-[170px] md:w-[190px] lg:w-[200px] h-[130px] sm:h-[125px] md:h-[130px] bg-muted rounded-xl shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-3 w-28 bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-2/3 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) return null;

  const post = posts[activeIndex];
  const catStyle = getCategoryBadgeStyle(post.category);
  const categoryLabel = formatCategory(post.category);
  const validImages = (post.images || []).filter(
    (img) => typeof img === "string" && img.trim().length > 0
  );
  const image = validImages[0] || null;

  return (
    <Card
      className="group h-full border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => navigate(`/resident/contents?post=${post.id}`)}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Top accent bar with progress */}
        <div className="relative h-1 bg-border/40 shrink-0">
          {posts.length > 1 && !paused && (
            <div
              key={`${activeIndex}-prog`}
              className="absolute inset-y-0 left-0 bg-primary"
              style={{ animation: `dashPostProgress ${AUTO_INTERVAL}ms linear forwards` }}
            />
          )}
          {posts.length <= 1 && <div className="h-full bg-primary" />}
        </div>

        <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3.5 sm:gap-4 flex-1 items-start sm:items-center min-h-[165px]">
          {/* Post Image Container: Strictly Locked Landscape Rectangle */}
          <div className="relative w-full sm:w-[170px] md:w-[190px] lg:w-[200px] h-[130px] sm:h-[125px] md:h-[130px] rounded-xl overflow-hidden shrink-0 bg-zinc-900/90 border border-border/60 flex items-center justify-center">
            {image && !imgFailed ? (
              <>
                {/* Blurred ambient backdrop fills the sides for portrait/square images */}
                <img
                  src={image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-md scale-125 opacity-70 pointer-events-none select-none transition-all duration-700"
                />
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] pointer-events-none" />

                {/* Crisp foreground image centered with preserved aspect ratio */}
                <img
                  key={`${post.id}-img`}
                  src={image}
                  alt={post.title}
                  className="relative z-10 max-w-full max-h-full object-contain object-center drop-shadow-md group-hover:scale-105 transition-transform duration-500"
                  onError={() => setImgFailed(true)}
                />
              </>
            ) : (
              <PostImagePlaceholder category={post.category} title={post.title} />
            )}
          </div>

          {/* Post Details (Locked text heights to prevent card jumping) */}
          <div className="flex flex-col justify-between flex-1 min-w-0 w-full">
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Newspaper className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
                    Community Update
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                >
                  {categoryLabel}
                </span>
              </div>

              {/* Title with consistent height */}
              <p className="text-sm sm:text-base font-bold text-foreground line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] group-hover:text-primary transition-colors leading-snug">
                {post.title}
              </p>

              {/* Excerpt with consistent height */}
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 min-h-[2rem] sm:min-h-[2.25rem] leading-relaxed">
                {post.body}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => navigate(`/resident/contents?post=${post.id}`)}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                Read article <ArrowRight className="w-3 h-3" />
              </button>

              {posts.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => goTo(activeIndex - 1)}
                    className="w-5 h-5 rounded-full flex items-center justify-center border border-border/70 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-muted-foreground transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    {posts.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Post ${i + 1}`}
                        onClick={() => goTo(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === activeIndex
                            ? "bg-primary w-4"
                            : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1.5"
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => goTo(activeIndex + 1)}
                    className="w-5 h-5 rounded-full flex items-center justify-center border border-border/70 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-muted-foreground transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <style>{`
        @keyframes dashPostProgress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </Card>
  );
};

export default DashboardPostCarousel;
