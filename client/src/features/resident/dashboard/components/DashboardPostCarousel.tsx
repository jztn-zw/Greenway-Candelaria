import { useResidentQuery } from "@/lib/residentQuery";
import PageErrorState from "@/components/PageErrorState";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardStyles } from "../dashboardStyles";
import { cn } from "@/lib/utils";
import { ResidentDashboardUpdateSkeleton } from "@/components/PageLoadingSkeletons";
import postsService from "@/services/postsService";
import {
  PostItem,
  formatCategory,
  getCategoryBadgeStyle,
} from "../../content/types";
import { PostImagePlaceholder } from "../../content/PostImagePlaceholder";

const AUTO_INTERVAL = 5000;

const DashboardPostCarousel = () => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const postsQuery = useResidentQuery("posts", ["dashboard"],
    () => postsService.getPage<PostItem>({ status: "PUBLISHED", page: 1, limit: 12 }));
  const posts = postsQuery.data?.posts ?? [];
  const isLoading = postsQuery.isLoading;
  const loadFailed = postsQuery.isError;
  useEffect(() => { setActiveIndex((index) => Math.min(index, Math.max(0, posts.length - 1))); }, [posts.length]);

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
    return <ResidentDashboardUpdateSkeleton post />;
  }

  if (loadFailed && postsQuery.data === undefined) return <PageErrorState kind="unavailable" variant="section" title="Community updates couldn't load" description="We couldn't load published posts. Please try again." onRetry={() => void postsQuery.refetch()} retrying={postsQuery.isFetching} />;

  if (posts.length === 0) {
    return (
      <Card className="h-full rounded-2xl border border-border/70">
        <CardContent className="flex min-h-[165px] flex-col justify-center p-5">
          <p className="text-sm font-bold text-foreground">
            {loadFailed ? "Community updates unavailable" : "No community updates yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loadFailed
              ? "Published posts could not be loaded right now."
              : "Published MENRO posts will appear here."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const post = posts[activeIndex];
  const catStyle = getCategoryBadgeStyle(post.category);
  const categoryLabel = formatCategory(post.category);
  const validImages = (post.images || []).filter(
    (img) => typeof img === "string" && img.trim().length > 0
  );
  const image = validImages[0] || null;

  return (
    <Card
      className="resident-dashboard-update group flex h-full min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-border/70 transition-colors duration-200 hover:border-primary/35 motion-reduce:transition-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => navigate(`/resident/contents?post=${post.id}`)}
    >
      <CardContent className="flex h-full flex-col p-0">
        {/* Top accent bar with progress */}
        <div className="relative h-0.5 bg-border/40 shrink-0">
          {posts.length > 1 && !paused && (
            <div
              key={`${activeIndex}-prog`}
              className="absolute inset-0 origin-left bg-primary"
              style={{ animation: `dashPostProgress ${AUTO_INTERVAL}ms linear forwards` }}
            />
          )}
          {posts.length <= 1 && <div className="h-full bg-primary" />}
        </div>

        <div className={dashboardStyles.updateInner}>
          <div className={dashboardStyles.updateHeader}>
            <p className={dashboardStyles.label}>Community update</p>
            <Badge className={`shrink-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>{categoryLabel}</Badge>
          </div>

          <div className={dashboardStyles.postBody}>
            {/* Post Image Container: Strictly Locked Landscape Rectangle */}
            <div className={cn(dashboardStyles.postImage, "relative flex items-center justify-center overflow-hidden bg-zinc-900/90")}>
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
                    className="relative z-10 max-w-full max-h-full object-contain object-center transition-transform duration-500"
                    onError={() => setImgFailed(true)}
                  />
                </>
              ) : (
                <PostImagePlaceholder category={post.category} title={post.title} />
              )}
            </div>
            <div className={dashboardStyles.updateBody}>
              <p className={dashboardStyles.updateTitle}>{post.title}</p>
              <p className={dashboardStyles.updateExcerpt}>{post.body}</p>
            </div>
          </div>

          <div className={dashboardStyles.updateFooter} onClick={(event) => { if (posts.length > 1) event.stopPropagation(); }}>
            {posts.length > 1 && (
              <div className="flex min-w-0 max-w-full items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Previous"
                  onClick={() => goTo(activeIndex - 1)}
                  className="h-7 w-7 shrink-0 rounded-lg"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>

                <div className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-none">
                  {posts.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Post ${i + 1}`}
                      onClick={() => goTo(i)}
                      className={`h-1 shrink-0 rounded-full transition-colors cursor-pointer ${
                        i === activeIndex
                          ? "bg-primary w-4"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1"
                      }`}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Next"
                  onClick={() => goTo(activeIndex + 1)}
                  className="h-7 w-7 shrink-0 rounded-lg"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <style>{`
        @keyframes dashPostProgress {
          from { transform: scaleX(0) }
          to   { transform: scaleX(1) }
        }
      `}</style>
    </Card>
  );
};

export default DashboardPostCarousel;

