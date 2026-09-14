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
  X,
  User,
  AlertCircle,
  RefreshCw,
  Clock,
  BookOpen,
  ArrowDownUp,
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
  type ResidentContentCategory,
  type ResidentContentSort,
} from "./hooks/useResidentContentFeed";

const CONTENT_PAGE_SIZE = 6;

/* ─── Main ResidentContents Component ─── */
const ResidentContents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const postIdParam = searchParams.get("post");

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<PostItem[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [invalidPostLink, setInvalidPostLink] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ResidentContentCategory>("All");
  const [sortBy, setSortBy] = useState<ResidentContentSort>("latest");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openPost, setOpenPost] = useState<PostItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const scrollPositionRef = useRef(0);
  const feedRequestVersionRef = useRef(0);

  const fetchPosts = useCallback(async () => {
    const requestVersion = ++feedRequestVersionRef.current;

    try {
      setIsPageLoading(true);
      setFetchError(null);
      setInvalidPostLink(false);

      const category = activeTab === "All"
        ? undefined
        : activeTab === "Waste Tips"
          ? "WASTE_TIP"
          : "EVENT";
      const [pageData, featuredData] = await Promise.all([
        postsService.getPage<PostItem>({
          status: "PUBLISHED",
          page: currentPage,
          limit: CONTENT_PAGE_SIZE,
          category,
          search: search.trim() || undefined,
          sort: sortBy,
        }),
        activeTab === "All" && !search.trim()
          ? postsService.getAll({ status: "PUBLISHED", is_featured: true })
          : Promise.resolve([]),
      ]);

      if (requestVersion !== feedRequestVersionRef.current) return;

      setPosts(pageData.posts);
      setTotalPosts(pageData.total);
      setTotalPages(pageData.totalPages);
      setFeaturedPosts(Array.isArray(featuredData) ? featuredData : []);

      // A shared post link must request the single published post directly:
      // it may not be present in the current page of the feed.
      if (postIdParam) {
        try {
          const target = await postsService.getById(postIdParam);
          if (requestVersion !== feedRequestVersionRef.current) return;
          setOpenPost(target as PostItem);
        } catch {
          if (requestVersion !== feedRequestVersionRef.current) return;
          setOpenPost(null);
          setInvalidPostLink(true);
        }
      }
    } catch (err: any) {
      if (requestVersion !== feedRequestVersionRef.current) return;
      setFetchError(err?.message || "Failed to load community updates. Please try again.");
    } finally {
      if (requestVersion === feedRequestVersionRef.current) {
        setIsPageLoading(false);
      }
    }
  }, [activeTab, currentPage, postIdParam, search, sortBy]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Breadcrumb navigation removes ?post=… directly, so the local article state
  // must follow the URL as well. Stale requests are ignored above.
  useEffect(() => {
    if (postIdParam) return;

    setOpenPost(null);
    setIsDetailLoading(false);
  }, [postIdParam]);

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
    setCurrentPage(1);
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

  useEffect(() => {
    setFeaturedIndex(0);
  }, [featuredPosts]);

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
  const paginationItems = useMemo<(number | "ellipsis")[]>(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) return [1, 2, 3, "ellipsis", totalPages];
    if (currentPage >= totalPages - 2) {
      return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "ellipsis", currentPage, "ellipsis", totalPages];
  }, [currentPage, totalPages]);
  const firstVisiblePost = totalPosts === 0 ? 0 : (currentPage - 1) * CONTENT_PAGE_SIZE + 1;
  const lastVisiblePost = Math.min(currentPage * CONTENT_PAGE_SIZE, totalPosts);

  // Keep the contents page mounted while a filter, search, sort, or page change
  // is fetching. Replacing the whole view with a skeleton on every update makes
  // an in-place filter change look like a full browser reload.
  if (isPageLoading && posts.length === 0 && !fetchError) {
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
    <div className="w-full max-w-[1400px] mx-auto pb-4 lg:pb-6">
      {/* ── Top Header ── */}
      <div className="hidden items-start justify-between gap-4 md:mb-6 md:flex md:items-center lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold font-display text-foreground tracking-tight">
            Community Updates
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">
            Official MENRO guidelines, collection updates, and eco tips.
          </p>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6 lg:space-y-8">

      {/* ── Error Banner ── */}
      {fetchError && (
        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPosts} className="rounded-xl text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        </div>
      )}

      {invalidPostLink && (
        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>This community update is no longer available.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setInvalidPostLink(false);
              setSearchParams({});
            }}
            className="rounded-xl text-xs"
          >
            View all updates
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
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-10 bg-card border-border/80 rounded-xl text-xs lg:text-sm shadow-2xs focus-visible:ring-primary/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
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
                      ? "bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/25 font-bold"
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
            <Select value={sortBy} onValueChange={(val) => {
              setSortBy(val as ResidentContentSort);
              setCurrentPage(1);
            }}>
              <SelectTrigger
                aria-label="Sort community updates"
                className="h-9 w-9 justify-center rounded-xl border-border/80 bg-card px-0 text-xs shadow-2xs transition-colors hover:border-primary/30 [&>svg]:hidden md:w-auto md:min-w-[140px] md:justify-between md:px-3.5 md:[&>svg]:block"
              >
                <div className="flex md:hidden">
                  <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="hidden items-center lg:inline-flex">
                  <span className="mr-1 text-muted-foreground">Sort by:</span>
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl border-border/80 shadow-md">
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
          <div
            className="relative rounded-2xl overflow-hidden bg-card border border-border/80 shadow-2xs hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 text-foreground group cursor-pointer transition-all duration-300"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onClick={() => handleOpenPost(featured)}
          >
            <div className="grid grid-cols-1 items-center gap-4 p-4 md:grid-cols-12 md:gap-6 md:p-6 lg:gap-8 lg:p-8">
              {/* Left Column: Post Details */}
              <div className="min-w-0 md:col-span-7 flex flex-col justify-between space-y-3.5">
                <div className="space-y-2.5">
                  {/* Category Pill & Featured Tag */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                      Featured
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeStyle(featured.category).bg} ${getCategoryBadgeStyle(featured.category).text} ${getCategoryBadgeStyle(featured.category).border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${getCategoryBadgeStyle(featured.category).dot}`} />
                      <span>{featuredCategory}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl lg:text-2xl lg:text-3xl font-display font-extrabold text-foreground tracking-tight leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {featured.title}
                  </h2>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-xs text-muted-foreground pt-0.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{featuredDateInfo.formatted}</span>
                    </div>
                    {featured.author_name && (
                      <div className="flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[140px]">{featured.author_name}</span>
                      </div>
                    )}
                    {featured.source && (
                      <div className="flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[180px]">{featured.source}</span>
                      </div>
                    )}
                  </div>

                  {/* Excerpt */}
                  <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {featured.body}
                  </p>
                </div>

                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                    <span>Read full article</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>

              {/* Right Column: Featured Image */}
              <div className="min-w-0 md:col-span-5">
                <div className="relative w-full aspect-[16/10] max-h-[280px] lg:max-h-[300px] rounded-xl overflow-hidden bg-muted/30 border border-border/70 flex items-center justify-center">
                  {featuredImage ? (
                    <>
                      {/* Ambient background blur */}
                      <img
                        key={`feat-bg-${featured.id}-${featuredPhotoIndex}`}
                        src={featuredImage}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-30 select-none pointer-events-none transition-all duration-700 ease-in-out"
                      />
                      <div className="absolute inset-0 bg-background/20 pointer-events-none" />

                      {/* Crisp Foreground Image */}
                      <img
                        key={`feat-img-${featured.id}-${featuredPhotoIndex}`}
                        src={featuredImage}
                        alt={featured.title}
                        className="relative z-10 max-w-full max-h-full object-contain object-center drop-shadow-sm group-hover:scale-[1.02] transition-all duration-500 ease-in-out"
                      />

                      {/* Multi-image indicator dots */}
                      {featuredValidImages.length > 1 && (
                        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15">
                          {featuredValidImages.map((_, idx) => (
                            <span
                              key={idx}
                              className={`block rounded-full transition-all duration-300 ${
                                idx === featuredPhotoIndex ? "w-3 h-1 bg-primary" : "w-1 h-1 bg-white/40"
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
                  className="absolute left-2.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground opacity-100 shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-background hover:text-primary active:scale-95 lg:left-4 lg:pointer-events-none lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextFeatured();
                  }}
                  aria-label="Next featured post"
                  className="absolute right-2.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 text-foreground opacity-100 shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-background hover:text-primary active:scale-95 lg:right-4 lg:pointer-events-none lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* ── Center-Down Indicator Dots ── */}
                <div
                  className="absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 shadow-2xs backdrop-blur-md md:flex"
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
                          ? "bg-primary w-5"
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
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-lg font-bold font-display text-foreground">
            {activeTab === "All" ? "All Updates & Guides" : activeTab}
          </h2>
          <span className="shrink-0 pt-1 text-xs font-medium text-muted-foreground">
            {isPageLoading
              ? "Updating…"
              : `Showing ${totalPosts} ${totalPosts === 1 ? "article" : "articles"}`}
          </span>
        </div>

        {posts.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-border/80 bg-card/50">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-foreground text-base mb-1">
              No updates found
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
                className="mt-4 rounded-xl text-xs h-9 px-3.5 border-border/80 hover:bg-muted"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          /* 3-Column Posts Grid */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {posts.map((post) => (
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
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{firstVisiblePost}–{lastVisiblePost}</span> of <span className="font-semibold text-foreground">{totalPosts}</span> articles
            </p>

            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35 cursor-pointer active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {paginationItems.map((item, index) => item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="flex h-9 w-7 items-center justify-center text-xs text-muted-foreground">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  aria-label={`Page ${item}`}
                  aria-current={item === currentPage ? "page" : undefined}
                  onClick={() => setCurrentPage(item)}
                  className={`h-9 w-9 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                    item === currentPage
                      ? "border border-primary/30 bg-primary/10 text-primary font-bold shadow-2xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}

              <button
                type="button"
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35 cursor-pointer active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
      </div>
    </div>
  );
};

export default ResidentContents;

