import { SearchInput } from "@/components/common/SearchInput";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import PaginationControls from "@/components/common/PaginationControls";
import { communityContentStyles as contentStyles } from "@/components/communityContentStyles";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { useResidentQuery, useResidentResource, useResidentMutation } from "@/lib/residentQuery";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, ArrowDownUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import postsService from "@/services/postsService";
import { PostItem } from "./types";
import PostDetail from "./PostDetail";
import FeaturedPostCarousel from "./FeaturedPostCarousel";
import PostCard from "./PostCard";
import {
  ContentCardsSkeleton,
  ResidentContentsSkeleton,
  ResidentPostDetailSkeleton,
} from "@/components/PageLoadingSkeletons";
import {
  RESIDENT_CONTENT_CATEGORIES,
  type ResidentContentCategory,
  type ResidentContentSort,
} from "./hooks/useResidentContentFeed";

const CONTENT_PAGE_SIZE = 6;
const CONTENT_FILTER_ITEMS: FilterPillItem<ResidentContentCategory>[] =
  RESIDENT_CONTENT_CATEGORIES.map((category) => ({ id: category, label: category }));

/* ─── Main ResidentContents Component ─── */
const ResidentContents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const postIdParam = searchParams.get("post");

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ResidentContentCategory>("All");
  const [sortBy, setSortBy] = useState<ResidentContentSort>("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [initialFeedReady, setInitialFeedReady] = useState(false);
  const scrollPositionRef = useRef(0);
  const previousPostIdRef = useRef(postIdParam);
  useEffect(() => {
    const returningToFeed = Boolean(previousPostIdRef.current) && !postIdParam;
    previousPostIdRef.current = postIdParam;
    if (returningToFeed) {
      const frame = requestAnimationFrame(() => window.scrollTo(0, scrollPositionRef.current));
      return () => cancelAnimationFrame(frame);
    }
  }, [postIdParam]);
  const category = activeTab === "All" ? undefined : activeTab === "Waste Tips" ? "WASTE_TIP" : "EVENT";
  const feed = useResidentResource("posts", ["feed", currentPage, category, search.trim(), sortBy],
    () => postsService.getPage<PostItem>({ status: "PUBLISHED", page: currentPage, limit: CONTENT_PAGE_SIZE,
      category, search: search.trim() || undefined, sort: sortBy }),
    { posts: [] as PostItem[], total: 0, totalPages: 1, page: 1, limit: CONTENT_PAGE_SIZE }, { keepPreviousData: true });
  useEffect(() => {
    if (feed.isSuccess && !feed.isPlaceholderData && feed.data.page !== currentPage) setCurrentPage(feed.data.page);
  }, [feed.isSuccess, feed.isPlaceholderData, feed.data.page, currentPage]);
  const posts = feed.data.posts;
  const totalPages = feed.data.totalPages;
  const isGridLoading = !feed.isError && (feed.isLoading || feed.isPlaceholderData);
  const fetchError = feed.error?.message ?? null;
  const setPosts = (update: (previous: PostItem[]) => PostItem[]) => feed.setData((previous) => ({ ...previous, posts: update(previous.posts) }));
  const featuredEnabled = activeTab === "All" && !search.trim();
  const featuredQuery = useResidentQuery<PostItem[]>("posts", ["featured"],
    () => postsService.getAll({ status: "PUBLISHED", is_featured: true }), { enabled: featuredEnabled });
  const initialFeedLoading = !initialFeedReady && (feed.isLoading || (featuredEnabled && featuredQuery.isLoading));
  useEffect(() => {
    if (!feed.isLoading && (!featuredEnabled || !featuredQuery.isLoading)) setInitialFeedReady(true);
  }, [feed.isLoading, featuredEnabled, featuredQuery.isLoading]);
  const featuredPosts = useMemo(() => activeTab === "All" && !search.trim() ? featuredQuery.data ?? [] : [], [activeTab, search, featuredQuery.data]);
  const detail = useResidentResource<PostItem | null>("posts", ["detail", postIdParam],
    () => postsService.getById(postIdParam!), null, { enabled: !!postIdParam });
  const inaccessible = [403, 404].includes((detail.error as { response?: { status?: number } } | null)?.response?.status ?? 0);
  const openPost = postIdParam && !inaccessible ? detail.data : null;
  const setOpenPost = detail.setData;
  const isDetailLoading = detail.isLoading;
  const fetchPosts = () => feed.refetch();
  const like = useResidentMutation(postsService.like, "posts");
  const unlike = useResidentMutation(postsService.unlike, "posts");
  const liking = useRef(new Set<string>());

  const handleToggleLike = async (targetPost: PostItem) => {
    if (liking.current.has(targetPost.id)) return;
    liking.current.add(targetPost.id);
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
        await like(targetPost.id);
      } else {
        await unlike(targetPost.id);
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
    } finally { liking.current.delete(targetPost.id); }
  };

  const handleTabChange = (tab: ResidentContentCategory) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleOpenPost = (post: PostItem) => {
    if (!postIdParam) scrollPositionRef.current = window.scrollY;
    setSearchParams({ post: post.id });
    window.scrollTo(0, 0);
  };

  const handlePostUpdated = (updated: PostItem) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
    );
  };

  if (isDetailLoading) {
    return <ResidentPostDetailSkeleton />;
  }

  if (postIdParam && detail.isError && (!openPost || inaccessible)) {
    return <PageErrorState kind={inaccessible ? "not-found" : "unavailable"} title={inaccessible ? "Community update not found" : undefined} description={inaccessible ? "This update is no longer available." : "We couldn't load this community update. Please try again."} onRetry={inaccessible ? undefined : () => void detail.refetch()} retrying={detail.isFetching} homeHref="/resident/contents" homeLabel="Back to community updates" />;
  }

  // The first feed and featured requests share one page-level loading state.
  // Later filter and page requests only replace the post grid.
  if (initialFeedLoading && !openPost) {
    return <ResidentContentsSkeleton />;
  }

  if (openPost) {
    const related = posts
      .filter((p) => p.id !== openPost.id && p.category === openPost.category)
      .slice(0, 3);

    return (
      <PostDetail
        post={openPost}
        onBack={() => setSearchParams((previous) => {
          const next = new URLSearchParams(previous);
          next.delete("post");
          return next;
        })}
        relatedPosts={related.length > 0 ? related : posts.filter((p) => p.id !== openPost.id).slice(0, 3)}
        onOpenPost={handleOpenPost}
        onPostUpdated={handlePostUpdated}
        onToggleRelatedLike={handleToggleLike}
      />
    );
  }

  if (fetchError && feed.dataUpdatedAt === 0) {
    return <PageErrorState kind="unavailable" description="We couldn't load community updates. Check your connection and try again." onRetry={() => void fetchPosts()} retrying={feed.isFetching} homeHref="/resident" />;
  }

  return (
    <div className={contentStyles.page}>
      {/* ── Top Header ── */}
      <div className={contentStyles.header}>
        <div>
          <h1 className={contentStyles.headerTitle}>
            Community Updates
          </h1>
          <p className={contentStyles.headerDescription}>
            Official MENRO guidelines, collection updates, and eco tips.
          </p>
        </div>
      </div>

      <div className={contentStyles.stack}>

      {/* ── Error Banner ── */}
      {(fetchError || featuredQuery.isError) && <DataRefreshNotice message={fetchError ? "Couldn't refresh community updates. Showing the last loaded articles, which may be outdated." : "Couldn't load featured updates. The article list is still available."} onRetry={() => { if (fetchError) void fetchPosts(); if (featuredQuery.isError) void featuredQuery.refetch(); }} retrying={feed.isFetching || featuredQuery.isFetching} />}

      {/* ── Search & Filter Toolbar ── */}
      <div className="space-y-3">
        {/* Search Bar */}
        <SearchInput
          placeholder="Search community updates…"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setCurrentPage(1);
          }}
          aria-label="Search community updates"
          containerClassName="w-full"
        />

        {/* Filter Chips + Sort Dropdown aligned side-by-side */}
        <div className={contentStyles.filterRow}>
          {/* Category filters */}
          <FilterPillTabs<ResidentContentCategory>
            items={CONTENT_FILTER_ITEMS}
            activeId={activeTab}
            onChange={handleTabChange}
            ariaLabel="Community update categories"
            className="w-full pb-0"
          />

          {/* Sort Dropdown */}
          <div className={contentStyles.sort}>
            <Select value={sortBy} onValueChange={(val) => {
              setSortBy(val as ResidentContentSort);
              setCurrentPage(1);
            }}>
              <SelectTrigger
                aria-label="Sort community updates"
                className="community-content-sort-trigger h-9 gap-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ArrowDownUp aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="community-content-sort-value min-w-0 items-center gap-1.5">
                    <span className="shrink-0 text-muted-foreground">Sort:</span>
                    <SelectValue />
                  </span>
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

      {featuredPosts.length > 0 && (
        <FeaturedPostCarousel posts={featuredPosts} onOpenPost={handleOpenPost} />
      )}

      {/* ── Main Post Grid ── */}
      <section className="space-y-4">
        <div className={contentStyles.sectionHeading}>
          <h2 className="gw-heading min-w-0 text-base sm:text-lg text-foreground">
            {activeTab === "All" ? "All Updates & Guides" : activeTab}
          </h2>
        </div>

        {isGridLoading ? (
          <ContentCardsSkeleton />
        ) : posts.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-border/80 bg-card/50">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="gw-heading text-foreground text-base mb-1">
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
                className="mt-4 rounded-xl text-xs h-9 px-3.5"
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
          <div className={contentStyles.grid}>
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
        {!isGridLoading && totalPages > 1 && (
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} variant="floating" />
        )}
      </section>
      </div>
    </div>
  );
};

export default ResidentContents;
