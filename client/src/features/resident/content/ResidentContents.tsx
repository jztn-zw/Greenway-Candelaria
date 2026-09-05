import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Heart,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Star,
  MapPin,
  ArrowRight,
  X,
  User,
  AlertCircle,
  RefreshCw,
  Clock,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import postsService from "@/services/postsService";
import { PostItem, formatCategory, parsePostDate, getCategoryBadgeStyle } from "./types";
import PostDetail from "./PostDetail";
import { PostImagePlaceholder } from "./PostImagePlaceholder";
import PostCard from "./PostCard";
import {
  PageHeaderSkeleton,
  ContentGridSkeleton,
  ResidentPostDetailSkeleton,
} from "@/components/PageLoadingSkeletons";
import {
  RESIDENT_CONTENT_CATEGORIES,
  useResidentContentFeed,
  type ResidentContentCategory,
  type ResidentContentSort,
} from "./hooks/useResidentContentFeed";

/* ─── Main ResidentContents Component ─── */
const ResidentContents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const postIdParam = searchParams.get("post");

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ResidentContentCategory>("All");
  const [sortBy, setSortBy] = useState<ResidentContentSort>("latest");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openPost, setOpenPost] = useState<PostItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const scrollPositionRef = useRef(0);

  const fetchPosts = useCallback(async () => {
    try {
      setIsPageLoading(true);
      setFetchError(null);
      const data = await postsService.getAll({ status: "PUBLISHED" });
      const list = Array.isArray(data) ? data : data?.data || [];
      setPosts(list);

      // If URL has ?post=<id>, open that post directly
      if (postIdParam && list.length > 0) {
        const target = list.find((p: PostItem) => String(p.id) === String(postIdParam));
        if (target) {
          setOpenPost(target);
        }
      }
    } catch (err: any) {
      setFetchError(err?.message || "Failed to load community updates. Please try again.");
    } finally {
      setIsPageLoading(false);
    }
  }, [postIdParam]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleToggleLike = async (targetPost: PostItem) => {
    const prevLiked = Boolean(targetPost.is_liked);
    const prevCount = Number(targetPost.like_count || 0);

    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    setPosts((prev) =>
      prev.map((p) =>
        p.id === targetPost.id
          ? { ...p, is_liked: nextLiked, like_count: nextCount }
          : p,
      ),
    );

    if (openPost && openPost.id === targetPost.id) {
      setOpenPost((curr) =>
        curr ? { ...curr, is_liked: nextLiked, like_count: nextCount } : null,
      );
    }

    try {
      if (nextLiked) {
        await postsService.like(targetPost.id);
      } else {
        await postsService.unlike(targetPost.id);
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === targetPost.id
            ? { ...p, is_liked: prevLiked, like_count: prevCount }
            : p,
        ),
      );
      if (openPost && openPost.id === targetPost.id) {
        setOpenPost((curr) =>
          curr ? { ...curr, is_liked: prevLiked, like_count: prevCount } : null,
        );
      }
    }
  };

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tabsContainerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - tabsContainerRef.current.offsetLeft;
    scrollLeftRef.current = tabsContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !tabsContainerRef.current) return;
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    tabsContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTabClick = (tab: ResidentContentCategory, e: React.MouseEvent<HTMLButtonElement>) => {
    if (hasDraggedRef.current) return;
    setActiveTab(tab);
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  const handleOpenPost = (post: PostItem) => {
    scrollPositionRef.current = window.scrollY;
    setIsDetailLoading(true);
    setSearchParams({ post: post.id });
    window.scrollTo(0, 0);
    setTimeout(() => {
      setOpenPost(post);
      setIsDetailLoading(false);
    }, 200);
  };

  const handleBack = () => {
    setOpenPost(null);
    setSearchParams({});
    requestAnimationFrame(() => window.scrollTo(0, scrollPositionRef.current));
  };

  const handlePostUpdated = (updated: PostItem) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
    );
  };

  const { featuredPosts, sortedPosts, paginatedPosts, totalPages } = useResidentContentFeed({
    posts,
    activeCategory: activeTab,
    search,
    sort: sortBy,
    currentPage,
  });

  const nextFeatured = useCallback(
    () =>
      setFeaturedIndex(
        (i) => (i + 1) % (featuredPosts.length > 0 ? featuredPosts.length : 1),
      ),
    [featuredPosts.length],
  );

  useEffect(() => {
    if (paused || featuredPosts.length < 2) return;
    const t = setInterval(nextFeatured, 7000);
    return () => clearInterval(t);
  }, [paused, nextFeatured, featuredPosts.length]);

  const featured = featuredPosts[featuredIndex] || featuredPosts[0];
  const [featuredPhotoIndex, setFeaturedPhotoIndex] = useState(0);

  const featuredValidImages = useMemo(
    () =>
      (featured?.images || []).filter(
        (img) => typeof img === "string" && img.trim().length > 0,
      ),
    [featured?.images],
  );

  useEffect(() => {
    setFeaturedPhotoIndex(0);
  }, [featured?.id]);

  // Auto-slide featured post images every 4s if it has multiple images
  useEffect(() => {
    if (paused || featuredValidImages.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedPhotoIndex((prev) => (prev + 1) % featuredValidImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [paused, featuredValidImages.length]);

  const featuredDateInfo = parsePostDate(featured?.published_at || featured?.created_at);
  const featuredCategory = featured ? formatCategory(featured.category) : "Featured";
  const featuredImage = featuredValidImages[featuredPhotoIndex] || null;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, sortBy]);

  if (isPageLoading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <ContentGridSkeleton />
      </div>
    );
  }

  if (isDetailLoading) {
    return <ResidentPostDetailSkeleton />;
  }

  if (openPost) {
    const related = posts
      .filter((p) => p.id !== openPost.id && p.category === openPost.category)
      .slice(0, 3);

    return (
      <PostDetail
        post={openPost}
        onBack={handleBack}
        relatedPosts={related.length > 0 ? related : posts.filter((p) => p.id !== openPost.id).slice(0, 3)}
        onOpenPost={handleOpenPost}
        onPostUpdated={handlePostUpdated}
      />
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 sm:space-y-8 pb-12">
      {/* ── Top Header ── */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display text-foreground tracking-tight">
              Community Updates & Guides
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Official MENRO guidelines, collection updates, and eco tips.
            </p>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {fetchError && (
        <div className="p-4 rounded-2xl border border-destructive/20 bg-destructive/5 flex items-center justify-between gap-3 text-destructive text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPosts} className="rounded-xl text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* ── Search & Filter Toolbar ── */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search posts, guides, segregation rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card/90 border-border rounded-2xl text-xs sm:text-sm shadow-xs focus-visible:ring-primary/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips + Sort Dropdown aligned side-by-side */}
        <div className="flex items-center justify-between gap-2.5">
          {/* Category Tabs (Smooth native mobile scroll + slide drag) */}
          <div
            ref={tabsContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0 pr-2 -mr-1 touch-pan-x select-none cursor-grab active:cursor-grabbing scroll-smooth"
          >
            {RESIDENT_CONTENT_CATEGORIES.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={(e) => handleTabClick(tab, e)}
                  className={`h-9 px-3.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 border active:scale-95 shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25 font-bold"
                      : "bg-card border-border/80 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground font-semibold"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="shrink-0">
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as ResidentContentSort)}>
              <SelectTrigger className="h-9 text-xs rounded-xl bg-card border-border/80 min-w-[115px] sm:min-w-[140px]">
                <span className="text-muted-foreground mr-1 hidden sm:inline">Sort by:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="most-reacted">Most Liked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── FEATURED Section ── */}
      {featured && activeTab === "All" && !search && (
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="w-3.5 h-3.5 text-primary fill-primary" />
            <span>FEATURED UPDATE</span>
          </div>

          <div
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500/15 via-card/90 to-teal-500/10 dark:from-emerald-950/80 dark:via-card/90 dark:to-teal-950/50 border border-emerald-500/30 hover:border-primary/60 text-foreground shadow-xl shadow-emerald-500/5 group cursor-pointer transition-all duration-300"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onClick={() => handleOpenPost(featured)}
          >
            {/* Ambient Background Glows */}
            <div className="absolute -left-16 -top-16 w-72 h-72 bg-emerald-500/20 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-0 bottom-0 w-80 h-80 bg-teal-500/15 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-primary/15 dark:bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 sm:p-8 md:p-10 lg:p-11 pb-10 sm:pb-12 md:pb-12">
              {/* Left Column: Post Details */}
              <div className="md:col-span-7 lg:col-span-7 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Category Pill */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${getCategoryBadgeStyle(featured.category).bg} ${getCategoryBadgeStyle(featured.category).text} ${getCategoryBadgeStyle(featured.category).border}`}
                    >
                      <Sparkles className="w-3 h-3 mr-1 inline-block text-primary" />
                      {featuredCategory}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {featured.title}
                  </h2>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground pt-0.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{featuredDateInfo.formatted}</span>
                    </div>
                    {featured.author_name && (
                      <div className="flex items-center gap-1.5 font-medium">
                        <User className="w-4 h-4 text-primary" />
                        <span className="truncate max-w-[140px]">{featured.author_name}</span>
                      </div>
                    )}
                    {featured.source && (
                      <div className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="truncate max-w-[180px]">{featured.source}</span>
                      </div>
                    )}
                  </div>

                  {/* Excerpt */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {featured.body}
                  </p>
                </div>

                {/* Footer Controls: Read Article */}
                <div className="pt-3">
                  <Button
                    size="sm"
                    className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 py-2.5 h-auto shadow-md shadow-primary/25 gap-2 group/btn active:scale-95 transition-all cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPost(featured);
                    }}
                  >
                    Read article <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </div>

              {/* Right Column: Featured Image */}
              <div className="md:col-span-5 lg:col-span-5">
                <div className="relative w-full aspect-[16/10] max-h-[300px] sm:max-h-[340px] rounded-2xl overflow-hidden bg-black/40 border border-emerald-500/25 shadow-xl flex items-center justify-center">
                  {featuredImage ? (
                    <>
                      {/* Ambient background blur */}
                      <img
                        key={`feat-bg-${featured.id}-${featuredPhotoIndex}`}
                        src={featuredImage}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-50 dark:opacity-40 select-none pointer-events-none transition-all duration-700 ease-in-out"
                      />
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] pointer-events-none" />

                      {/* Crisp Foreground Image */}
                      <img
                        key={`feat-img-${featured.id}-${featuredPhotoIndex}`}
                        src={featuredImage}
                        alt={featured.title}
                        className="relative z-10 max-w-full max-h-full object-contain object-center drop-shadow-lg group-hover:scale-[1.03] transition-all duration-700 ease-in-out"
                      />

                      {/* Multi-image indicator dots */}
                      {featuredValidImages.length > 1 && (
                        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15">
                          {featuredValidImages.map((_, idx) => (
                            <span
                              key={idx}
                              className={`block rounded-full transition-all duration-300 ${
                                idx === featuredPhotoIndex ? "w-3 h-1 bg-emerald-400" : "w-1 h-1 bg-white/40"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <PostImagePlaceholder category={featured.category} title={featured.title} isFeatured />
                  )}
                </div>
              </div>
            </div>

            {/* ── Carousel Side Navigation Arrows (Left & Right) ── */}
            {featuredPosts.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeaturedIndex((prev) =>
                      prev === 0 ? featuredPosts.length - 1 : prev - 1,
                    );
                  }}
                  aria-label="Previous featured post"
                  className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-background/60 dark:bg-black/50 hover:bg-background/90 dark:hover:bg-black/75 text-foreground hover:text-primary backdrop-blur-md border border-border/70 hover:border-primary/60 shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-300 cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto hover:scale-110 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextFeatured();
                  }}
                  aria-label="Next featured post"
                  className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-background/60 dark:bg-black/50 hover:bg-background/90 dark:hover:bg-black/75 text-foreground hover:text-primary backdrop-blur-md border border-border/70 hover:border-primary/60 shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-300 cursor-pointer opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto hover:scale-110 active:scale-95"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* ── Center-Down Indicator Dots ── */}
                <div
                  className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-border/60 shadow-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  {featuredPosts.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeaturedIndex(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === featuredIndex
                          ? "bg-primary w-6"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/60 w-1.5"
                      }`}
                      title={`Go to slide ${idx + 1}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Main Post Grid ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display text-foreground">
            {activeTab === "All" ? "All Updates & Guides" : activeTab}
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            Showing {sortedPosts.length} {sortedPosts.length === 1 ? "article" : "articles"}
          </span>
        </div>

        {paginatedPosts.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-border bg-card">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-foreground text-base mb-1">
              No posts found
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {search
                ? "We couldn't find any updates matching your search. Try different keywords."
                : "No community updates are available in this category yet."}
            </p>
            {search && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl text-xs"
                onClick={() => setSearch("")}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          /* 3-Column Posts Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {paginatedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onToggleLike={handleToggleLike}
                onClick={() => handleOpenPost(post)}
              />
            ))}
          </div>
        )}

        {/* ── Pagination Controls ── */}
        {totalPages > 1 && (
          <div className="pt-6 pb-2 flex items-center justify-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-9 h-9 rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "border border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-9 h-9 rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default ResidentContents;
