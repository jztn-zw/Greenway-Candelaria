import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Heart, MessageCircle, ChevronLeft, ChevronRight, Calendar, FileText, Tag,
  Bookmark, Share2, Clock, TrendingUp, Sparkles, Filter, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  featuredPosts, normalPosts, allTags, estimateReadingTime,
  formatEventDate, isEventPast, ContentPost,
} from "./contentData";
import PostDetail from "./PostDetail";
import { PageHeaderSkeleton, ContentGridSkeleton, ResidentPostDetailSkeleton } from "@/components/PageLoadingSkeletons";

const tabs = ["All", "Waste Tip", "Event", "Saved"] as const;
const POSTS_PER_PAGE = 6;

/* ─── Post Card ─── */
const PostCard = ({
  post,
  isLiked,
  isSaved,
  isRead,
  onToggleLike,
  onToggleSave,
  onShare,
  onClick,
}: {
  post: ContentPost;
  isLiked: boolean;
  isSaved: boolean;
  isRead: boolean;
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
  onShare: (post: ContentPost) => void;
  onClick: () => void;
}) => {
  const readingTime = estimateReadingTime(post.body);
  const isPast = isEventPast(post.eventDate);
  const evtDate = post.eventDate ? formatEventDate(post.eventDate) : null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 group relative">
      {/* Unread indicator */}
      {!isRead && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/30" />
          <span className="text-[10px] font-bold text-primary bg-primary/10 backdrop-blur-sm px-1.5 py-0.5 rounded-full">NEW</span>
        </div>
      )}

      {/* Event date badge */}
      {post.badge === "Event" && evtDate && (
        <div className="absolute top-3 right-3 z-10 bg-background/95 backdrop-blur rounded-xl p-2 text-center shadow-md min-w-[48px]">
          <span className="block text-[9px] font-bold text-primary tracking-wider">{evtDate.month}</span>
          <span className="block text-lg font-display font-black text-foreground leading-none">{evtDate.day}</span>
          {isPast && <span className="block text-[8px] font-semibold text-destructive mt-0.5">PAST</span>}
        </div>
      )}

      {/* Image area */}
      <button onClick={onClick} className="relative h-40 sm:h-44 overflow-hidden cursor-pointer">
        {post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full relative ${
            post.badge === "Event"
              ? "bg-gradient-to-br from-primary via-primary/80 to-primary/60"
              : "bg-gradient-to-br from-[hsl(var(--forest))] via-[hsl(var(--forest))]/80 to-[hsl(var(--leaf))]/60"
          } group-hover:scale-105 transition-transform duration-500 origin-center`}>
            {/* Decorative shapes */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${post.badge === "Event" ? "bg-primary-foreground/10" : "bg-white/10"}`} />
            <div className={`absolute right-8 -top-4 w-16 h-16 rounded-full ${post.badge === "Event" ? "bg-primary-foreground/[0.07]" : "bg-white/[0.07]"}`} />
            <div className={`absolute left-1/2 bottom-2 w-10 h-10 rotate-45 ${post.badge === "Event" ? "bg-primary-foreground/[0.05]" : "bg-white/[0.05]"}`} />
          </div>
        )}
      </button>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="secondary"
            className={`text-[10px] font-semibold border shadow-sm ${
              post.badge === "Event"
                ? "bg-primary/90 text-primary-foreground border-primary/50 backdrop-blur-sm"
                : "bg-[hsl(var(--forest))]/90 text-white border-[hsl(var(--forest))]/50 backdrop-blur-sm"
            }`}
          >
            {post.badge}
          </Badge>
          <span className="text-[11px] text-muted-foreground">{post.date}</span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> {readingTime} min
          </span>
        </div>

        <button onClick={onClick} className="text-left cursor-pointer">
          <h3 className="font-display text-sm sm:text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors duration-300 line-clamp-2">
            {post.title}
          </h3>
        </button>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-2">
          {post.description}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleLike(post.id); }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all duration-200 ${
                isLiked ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-destructive" : ""}`} />
              {post.likes + (isLiked ? 1 : 0)}
            </button>
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground">
              <MessageCircle className="w-3.5 h-3.5" /> {post.comments}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSave(post.id); }}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                isSaved ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-primary" : ""}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onShare(post); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-all duration-200"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const ResidentContents = () => {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("resident-saved-posts");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [openPost, setOpenPost] = useState<ContentPost | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const scrollPositionRef = useRef(0);

  const toggleLike = (id: string) =>
    setLikedPosts((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSave = (id: string) =>
    setSavedPosts((p) => {
      const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id);
      localStorage.setItem("resident-saved-posts", JSON.stringify([...n]));
      return n;
    });

  const handleOpenPost = (post: ContentPost) => {
    scrollPositionRef.current = window.scrollY;
    setReadPosts((p) => new Set(p).add(post.id));
    setIsDetailLoading(true);
    window.scrollTo(0, 0);
    setTimeout(() => {
      setOpenPost(post);
      setIsDetailLoading(false);
    }, 600);
  };

  const handleBack = () => {
    setOpenPost(null);
    requestAnimationFrame(() => window.scrollTo(0, scrollPositionRef.current));
  };

  const handleShare = async (post: ContentPost) => {
    try {
      await navigator.share({ title: post.title, text: post.description, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  // Featured rotation
  const next = useCallback(() => setFeaturedIndex((i) => (i + 1) % featuredPosts.length), []);
  const prev = useCallback(() => setFeaturedIndex((i) => (i - 1 + featuredPosts.length) % featuredPosts.length), []);
  useEffect(() => {
    if (paused || featuredPosts.length < 2) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, next]);

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const featured = featuredPosts[featuredIndex];
  const featuredReadTime = estimateReadingTime(featured.body);

  // Filter & sort posts
  const allPosts = activeTab === "Saved" ? [...normalPosts, ...featuredPosts] : [...normalPosts];
  const filtered = allPosts.filter((p) => {
    if (activeTab === "Saved") return savedPosts.has(p.id);
    const matchesTab = activeTab === "All" || p.badge === activeTab;
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || p.tags.includes(selectedTag);
    return matchesTab && matchesSearch && matchesTag;
  });

  // Auto-switch away from Saved tab when all bookmarks removed
  useEffect(() => {
    if (activeTab === "Saved" && savedPosts.size === 0) {
      setActiveTab("All");
    }
  }, [savedPosts.size, activeTab]);

  // Sort events: upcoming first, then past
  const sorted = activeTab === "Event"
    ? [...filtered].sort((a, b) => {
        const aPast = isEventPast(a.eventDate);
        const bPast = isEventPast(b.eventDate);
        if (aPast !== bPast) return aPast ? 1 : -1;
        if (!aPast && a.eventDate && b.eventDate) return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        return 0;
      })
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / POSTS_PER_PAGE));
  const paginated = sorted.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [activeTab, search, selectedTag]);

  // Sidebar data
  const popularPosts = [...normalPosts].sort((a, b) => b.likes - a.likes).slice(0, 3);
  const upcomingEvents = normalPosts
    .filter((p) => p.badge === "Event" && p.eventDate && !isEventPast(p.eventDate))
    .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
    .slice(0, 2);

  const tagCounts: Record<string, number> = {};
  normalPosts.forEach((p) => p.tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const categories = [
    { name: "Waste Tip", count: normalPosts.filter((p) => p.badge === "Waste Tip").length },
    { name: "Event", count: normalPosts.filter((p) => p.badge === "Event").length },
  ];

  if (isPageLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <ContentGridSkeleton />
      </div>
    );
  }

  // ── Post Detail Loading ──
  if (isDetailLoading) {
    return <ResidentPostDetailSkeleton />;
  }

  // ── Post Detail View ──
  if (openPost) {
    const related = [...normalPosts, ...featuredPosts]
      .filter((p) => p.id !== openPost.id && p.badge === openPost.badge)
      .slice(0, 3);
    return (
      <PostDetail
        post={openPost}
        onBack={handleBack}
        relatedPosts={related}
        onOpenPost={handleOpenPost}
        isLiked={likedPosts.has(openPost.id)}
        isSaved={savedPosts.has(openPost.id)}
        onToggleLike={toggleLike}
        onToggleSave={toggleSave}
      />
    );
  }

  // Empty state messages
  const emptyMessages: Record<string, { title: string; desc: string }> = {
    "Waste Tip": { title: "No waste tips yet", desc: "Check back soon for helpful waste management tips from MENRO." },
    Event: { title: "No events posted yet", desc: "Check back soon for upcoming MENRO events in your area." },
    Saved: { title: "You have no saved posts yet", desc: "Tap the bookmark icon on any post to save it here." },
    search: { title: "No posts found", desc: "No posts found for your search. Try a different keyword." },
    tag: { title: "No posts with this tag", desc: "Try selecting a different tag or clear the filter." },
  };

  const getEmptyState = () => {
    if (search) return emptyMessages.search;
    if (selectedTag) return emptyMessages.tag;
    return emptyMessages[activeTab] || emptyMessages.search;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Content</h1>
            <p className="text-sm text-muted-foreground">Stay updated with the latest posts, schedules, and events from MENRO Candelaria.</p>
          </div>
        </div>
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-10"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        {selectedTag && (
          <button
            onClick={() => setSelectedTag(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors self-start"
          >
            <Tag className="w-3 h-3" /> #{selectedTag}
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {tabs.map((t) => {
          if (t === "Saved" && savedPosts.size === 0) return null;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
                activeTab === t
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-foreground"
              }`}
            >
              {t === "Saved" && <Bookmark className="w-3 h-3 inline mr-1.5 -mt-0.5" />}
              {t}
              {t === "Saved" && ` (${savedPosts.size})`}
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] gap-6 lg:gap-8">
        <div className="space-y-8 min-w-0">
          {/* ── Featured Post ── */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/70 mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Featured
            </h2>
            <div
              className="relative rounded-2xl overflow-hidden bg-canopy group cursor-pointer"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onClick={() => handleOpenPost(featured)}
            >
              {/* Background */}
              <div className="h-56 sm:h-72 md:h-80 relative flex flex-col justify-end p-5 sm:p-8">
                {/* Background: image or gradient */}
                {featured.images && featured.images.length > 0 ? (
                  <>
                    <img src={featured.images[0]} alt={featured.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-canopy via-forest to-primary/80 group-hover:scale-105 transition-transform duration-500 origin-center">
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10" />
                    <div className="absolute right-12 -top-6 w-20 h-20 rounded-full bg-white/[0.07]" />
                    <div className="absolute left-1/3 bottom-4 w-14 h-14 rotate-45 bg-white/[0.05]" />
                  </div>
                )}
                {/* Nav arrows */}
                {featuredPosts.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prev(); }}
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 bg-black/20 backdrop-blur transition-all duration-300"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); next(); }}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 bg-black/20 backdrop-blur transition-all duration-300"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </>
                )}

                <Badge className="relative z-10 w-fit mb-2 sm:mb-3 bg-leaf/20 text-white border-leaf/30 text-[10px] sm:text-xs font-semibold">
                  {featured.badge}
                </Badge>
                <h2 className="relative z-10 text-xl sm:text-2xl md:text-3xl font-display font-bold text-white tracking-tight leading-tight">
                  {featured.imageHeadline}
                </h2>
                <p className="relative z-10 text-white/80 text-xs sm:text-sm mt-2 max-w-lg leading-relaxed line-clamp-2">{featured.imageLine1}</p>
                <p className="relative z-10 text-white/60 text-[10px] sm:text-xs mt-1 max-w-lg hidden sm:block">{featured.imageLine2}</p>

                {featuredPosts.length > 1 && (
                  <div className="relative z-10 flex gap-1.5 mt-3 sm:mt-4">
                    {featuredPosts.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setFeaturedIndex(i); }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === featuredIndex ? "bg-white w-6" : "bg-white/40 w-1.5"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Post meta */}
              <div className="p-4 sm:p-5 bg-card border-t border-border space-y-2.5">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {featured.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-1">{featured.source}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{featured.author}</span>
                    <span>{featured.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {featuredReadTime} min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(featured.id); }}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all ${
                        likedPosts.has(featured.id) ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${likedPosts.has(featured.id) ? "fill-destructive" : ""}`} />
                      {featured.likes + (likedPosts.has(featured.id) ? 1 : 0)}
                    </button>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="w-3.5 h-3.5" /> {featured.comments}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSave(featured.id); }}
                      className={`p-1 rounded-lg transition-all ${
                        savedPosts.has(featured.id) ? "text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${savedPosts.has(featured.id) ? "fill-primary" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShare(featured); }}
                      className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-all"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-border" />

          {/* ── Posts Grid ── */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/70 mb-4 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {activeTab === "Saved" ? "Saved Posts" : activeTab === "All" ? "All Posts" : `${activeTab} Posts`}
            </h2>

            {paginated.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl border border-dashed border-border bg-card/50">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-primary/40" />
                </div>
                <h3 className="font-display font-bold text-foreground text-lg mb-1.5">{getEmptyState().title}</h3>
                <p className="text-sm text-muted-foreground max-w-sm">{getEmptyState().desc}</p>
                {(search || selectedTag) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => { setSearch(""); setSelectedTag(null); }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {paginated.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isLiked={likedPosts.has(post.id)}
                    isSaved={savedPosts.has(post.id)}
                    isRead={readPosts.has(post.id)}
                    onToggleLike={toggleLike}
                    onToggleSave={toggleSave}
                    onShare={handleShare}
                    onClick={() => handleOpenPost(post)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                      page === currentPage
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        </div>

        {/* ── Sidebar ── */}
        <aside className="space-y-5 lg:sticky lg:top-4 lg:self-start hidden lg:block">
          {/* Latest Post */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 hover:border-primary/20 transition-colors">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Latest Post
            </h4>
            <button
              onClick={() => handleOpenPost(featuredPosts[0])}
              className="text-left group/latest w-full"
            >
              <p className="font-display text-sm font-bold text-foreground group-hover/latest:text-primary transition-colors">
                {featuredPosts[0].title}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" /> {featuredPosts[0].date}
              </p>
            </button>
          </div>

          {/* Most Popular */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/20 transition-colors">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Most Popular
            </h4>
            <ul className="space-y-3">
              {popularPosts.map((p, i) => (
                <li key={p.id}>
                  <button
                    onClick={() => handleOpenPost(p)}
                    className="text-left group/pop w-full"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xs font-display font-bold text-primary/50 mt-0.5 shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover/pop:text-primary transition-colors">
                          {p.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {p.likes} likes
                        </p>
                      </div>
                    </div>
                  </button>
                  {i < popularPosts.length - 1 && <div className="border-b border-border/50 mt-2.5" />}
                </li>
              ))}
            </ul>
          </div>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/20 transition-colors">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Upcoming Events
              </h4>
              <ul className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const d = formatEventDate(ev.eventDate!);
                  return (
                    <li key={ev.id}>
                      <button
                        onClick={() => handleOpenPost(ev)}
                        className="text-left group/ev w-full flex items-center gap-3"
                      >
                        <div className="bg-primary/10 rounded-lg p-2 text-center min-w-[44px]">
                          <span className="block text-[9px] font-bold text-primary tracking-wider">{d.month}</span>
                          <span className="block text-base font-display font-black text-foreground leading-none">{d.day}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover/ev:text-primary transition-colors">
                          {ev.title}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* By Category */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/20 transition-colors">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> By Category
            </h4>
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.name}>
                  <button
                    onClick={() => setActiveTab(c.name)}
                    className={`flex items-center justify-between w-full text-sm rounded-lg px-2 py-1.5 transition-colors ${
                      activeTab === c.name ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 font-semibold">{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/20 transition-colors">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                    selectedTag === tag
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-primary/5 text-primary/80 hover:bg-primary/15 border border-primary/10"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* This Month */}
          <div className="rounded-xl border border-border bg-card p-4 text-center space-y-1 hover:border-primary/20 transition-colors">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> This Month
            </h4>
            <p className="text-3xl font-display font-bold text-primary">{normalPosts.length}</p>
            <p className="text-xs text-muted-foreground">posts published</p>
          </div>
        </aside>
      </div>

      {/* ── Mobile Sidebar (collapsible at bottom) ── */}
      <div className="lg:hidden space-y-4 pt-4 border-t border-border">
        <h3 className="text-sm font-display font-bold text-foreground">Discover More</h3>

        {/* Mobile: Popular + Upcoming in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Popular */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Most Popular
            </h4>
            <ul className="space-y-2.5">
              {popularPosts.map((p, i) => (
                <li key={p.id}>
                  <button onClick={() => handleOpenPost(p)} className="text-left w-full group/mp">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-primary/50 mt-0.5">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover/mp:text-primary transition-colors">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{p.likes} likes</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Upcoming Events
              </h4>
              <ul className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const d = formatEventDate(ev.eventDate!);
                  return (
                    <li key={ev.id}>
                      <button onClick={() => handleOpenPost(ev)} className="text-left w-full flex items-center gap-3 group/mev">
                        <div className="bg-primary/10 rounded-lg p-2 text-center min-w-[44px]">
                          <span className="block text-[9px] font-bold text-primary">{d.month}</span>
                          <span className="block text-base font-display font-black text-foreground leading-none">{d.day}</span>
                        </div>
                        <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover/mev:text-primary transition-colors">{ev.title}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Mobile tags */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Tags
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(([tag]) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  selectedTag === tag
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/5 text-primary/80 hover:bg-primary/15 border border-primary/10"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentContents;
