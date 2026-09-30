import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import PaginationControls from "@/components/common/PaginationControls";
import {
AdminPostDetailSkeleton,
AdminPostsSkeleton,
AdminPostsContentSkeleton,
} from "@/components/PageLoadingSkeletons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { useAdminFetch, useAdminMutation, useAdminQuery } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import postsService, { type AdminPostStats } from "@/services/postsService";
import useAuthStore from "@/store/authStore";
import { ArrowUpDown, LayoutGrid, List, Plus, RotateCcw, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminPostDetail from "./AdminPostDetail";
import PostCard from "./PostCard";
import PostEditor, { EditorForm } from "./PostEditor";
import PostListView from "./PostListView";
import PostStats from "./PostStats";
import {
Post,
PostStatus
} from "./types";

const POSTS_PER_PAGE_GRID = 6;
const POSTS_PER_PAGE_TABLE = 10;

// ─── Mappers ───────────────────────────────────────────────

const mapStatus = (status: string): PostStatus => {
  const map: Record<string, PostStatus> = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    SCHEDULED: "Scheduled",
    ARCHIVED: "Archived",
  };
  return map[status] || "Draft";
};

const mapStatusToApi = (status: PostStatus): string => {
  const map: Record<PostStatus, string> = {
    Draft: "DRAFT",
    Published: "PUBLISHED",
    Scheduled: "SCHEDULED",
    Unpublished: "DRAFT",
    Archived: "ARCHIVED",
  };
  return map[status];
};

// TiDB stores DATETIME values without timezone metadata. Scheduled post times
// are stored in UTC, so restore that metadata before the browser displays them
// in the administrator's local timezone.
const toUtcIsoString = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.replace(" ", "T");
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
    ? normalized
    : `${normalized}Z`;
};

interface ApiPost {
  id: string;
  title: string;
  body: string;
  source?: string | null;
  category: "WASTE_TIP" | "EVENT";
  status: string;
  is_featured?: boolean | number;
  author_name?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  view_count?: number;
  like_count?: number;
  tags?: string[];
  images?: Array<string | { url: string }>;
  scheduled_at?: string | null;
}

const mapApiPost = (p: ApiPost): Post => ({
  id: p.id,
  title: p.title,
  body: p.body,
  source: p.source || "",
  category: p.category === "WASTE_TIP" ? "Waste Tip" : "Event",
  status: mapStatus(p.status),
  featured: Boolean(p.is_featured),
  author: p.author_name || "Admin",
  publishedDate: p.published_at
    ? new Date(p.published_at.replace(" ", "T")).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null,
  lastEdited: p.updated_at
    ? new Date(p.updated_at.replace(" ", "T")).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "",
  views: p.view_count || 0,
  likes: p.like_count || 0,
  tags: p.tags || [],
  images:
    p.images?.map((img) => (typeof img === "string" ? img : img.url)) ||
    [],
  scheduledDate: toUtcIsoString(p.scheduled_at),
});

const mapApiPosts = (data: ApiPost[]): Post[] => data.map(mapApiPost);

// ─── Component ─────────────────────────────────────────────

const AdminPosts = () => {
  const mutateCreate = useAdminMutation(postsService.create, "posts");
  const mutateUpdate = useAdminMutation(postsService.update, "posts");
  const mutateDelete = useAdminMutation(postsService.delete, "posts");
  const mutateDuplicate = useAdminMutation(postsService.duplicate, "posts");
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [postStats, setPostStats] = useState<AdminPostStats | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewPost, setPreviewPost] = useState<Post | null>(() => {
    try {
      const saved = sessionStorage.getItem("admin_preview_post");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [previewActiveImageIndex, setPreviewActiveImageIndex] = useState(0);
  const wasPreviewRef = useRef(false);
  const hasLoadedListRef = useRef(false);
  const postsPerPage =
    viewMode === "grid" ? POSTS_PER_PAGE_GRID : POSTS_PER_PAGE_TABLE;

  // Listen for user returning from preview via topbar breadcrumb (or browser back)
  useEffect(() => {
    const isPreviewParam = searchParams.get("preview") === "true";
    if (wasPreviewRef.current && !isPreviewParam) {
      setPreviewPost(null);
      sessionStorage.removeItem("admin_preview_post");
    }
    wasPreviewRef.current = isPreviewParam;
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchAdmin = useAdminFetch();
  const listQuery = useAdminQuery("posts", ["list", currentPage, postsPerPage, debouncedSearch, categoryFilter, statusFilter, sortBy], () => postsService.getPage<ApiPost>({
        page: currentPage,
        limit: postsPerPage,
        all: true,
        search: debouncedSearch || undefined,
        category: categoryFilter === "all"
          ? undefined
          : categoryFilter === "Waste Tip" ? "WASTE_TIP" : "EVENT",
        status: statusFilter === "all"
          ? undefined
          : statusFilter.toUpperCase() as "PUBLISHED" | "DRAFT" | "SCHEDULED" | "ARCHIVED",
        sort: sortBy === "newest" ? "latest" : sortBy as "oldest" | "views",
      }));
  const isInitialSync = listQuery.isLoading && !hasLoadedListRef.current;
  const isListLoading = listQuery.isFetching;
  const loadError = listQuery.error ? "Posts could not be loaded. Please try again." : null;
  const loadPosts = () => listQuery.refetch();
  useEffect(() => {
    const result = listQuery.data;
    if (!result) return;
    hasLoadedListRef.current = true;
    setPosts(mapApiPosts(result.posts)); setTotalItems(result.total);
    setTotalPages(Math.max(1, result.totalPages)); setPostStats(result.stats || null);
    if (currentPage > Math.max(1, result.totalPages)) setCurrentPage(Math.max(1, result.totalPages));
  }, [listQuery.data, currentPage]);

  const requestedPostId = searchParams.get("post");
  const detailQuery = useAdminQuery("posts", ["detail", requestedPostId],
    () => postsService.getById(requestedPostId!), { enabled: !!requestedPostId });
  const isDetailLoading = !!requestedPostId && detailQuery.isLoading;
  useEffect(() => {
    if (!requestedPostId) {
      setViewingPost(null);
      sessionStorage.removeItem("viewingPostId");
    } else if (detailQuery.data) {
      setViewingPost(mapApiPost(detailQuery.data));
      sessionStorage.setItem("viewingPostId", requestedPostId);
    }
  }, [requestedPostId, detailQuery.data]);
  useEffect(() => {
    if (!detailQuery.error) return;
    const status = (detailQuery.error as { response?: { status?: number } }).response?.status;
    if (status === 404) {
      setViewingPost(null);
      sessionStorage.removeItem("viewingPostId");
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.delete("post"); next.delete("title"); return next;
      }, { replace: true });
      toast.error("That post is no longer available");
    } else toast.error("The post could not be refreshed. Please try again.");
  }, [detailQuery.error, setSearchParams]);

  const editId = searchParams.get("edit");
  const isCreateAction = searchParams.get("action") === "create";
  useEffect(() => {
    if (isInitialSync) return;

    if (isCreateAction) {
      setEditorOpen(true);
      setEditingPost(null);
      setViewingPost(null);
      return;
    }

    if (editId) {
      // Keep the editor snapshot while the list refreshes in the background.
      if (editorOpen && editingPost?.id === editId) return;
      const localPost = posts.find((post) => post.id === editId);
      if (localPost) {
        setEditingPost(localPost);
        setEditorOpen(true);
        setViewingPost(null);
        return;
      }

      let cancelled = false;
      fetchAdmin("posts", ["detail", editId], () => postsService.getById(editId))
        .then((post) => {
          if (cancelled) return;
          setEditingPost(mapApiPost(post));
          setEditorOpen(true);
          setViewingPost(null);
        })
        .catch(() => {
          if (cancelled) return;
          setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.delete("edit");
            return next;
          }, { replace: true });
          toast.error("That post is no longer available");
        });
      return () => { cancelled = true; };
    }

    setEditorOpen(false);
    setEditingPost(null);
  }, [editId, isCreateAction, isInitialSync, posts, setSearchParams, fetchAdmin, editorOpen, editingPost?.id]);

  const statusCounts = useMemo(() => {
    if (postStats) {
      return {
        all: postStats.totalPosts,
        Published: postStats.published,
        Draft: postStats.drafts,
        Scheduled: postStats.scheduled,
        Archived: postStats.archived,
      };
    }

    const counts: Record<string, number> = {
      all: posts.length,
      Published: 0,
      Draft: 0,
      Scheduled: 0,
      Archived: 0,
    };
    posts.forEach((p) => {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });
    return counts;
  }, [posts, postStats]);

  const STATUS_TABS: { key: string; label: string }[] = [
    { key: "all", label: "All Posts" },
    { key: "Published", label: "Published" },
    { key: "Draft", label: "Drafts" },
    { key: "Scheduled", label: "Scheduled" },
    { key: "Archived", label: "Archived" },
  ];

  // ─── Actions ───────────────────────────────────────────

  const togglePublish = async (post: Post) => {
    try {
      const newStatus = post.status === "Published" ? "DRAFT" : "PUBLISHED";
      const updated = await mutateUpdate(post.id, { status: newStatus });
      const mapped = mapApiPost(updated);
      setPosts((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
      if (viewingPost?.id === mapped.id) {
        setViewingPost(mapped);
      }
      toast.success(
        mapped.status === "Published"
          ? "Post published successfully!"
          : "Post unpublished",
      );
    } catch {
      toast.error("Failed to update post status");
    }
  };

  const toggleFeatured = async (post: Post) => {
    try {
      const nextFeatured = !post.featured;
      const updated = await mutateUpdate(post.id, {
        is_featured: nextFeatured,
      });
      const mapped = mapApiPost(updated);
      setPosts((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
      if (viewingPost?.id === mapped.id) {
        setViewingPost(mapped);
      }
      toast.success(
        nextFeatured
          ? "Post featured on resident carousel"
          : "Post unfeatured from resident carousel",
      );
    } catch {
      toast.error("Failed to update featured status");
    }
  };

  const archivePost = async (post: Post) => {
    try {
      const isArchived = post.status === "Archived";
      const nextStatus = isArchived ? "DRAFT" : "ARCHIVED";
      const updated = await mutateUpdate(post.id, { status: nextStatus });
      const mapped = mapApiPost(updated);
      setPosts((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
      if (viewingPost?.id === mapped.id) {
        setViewingPost(mapped);
      }
      toast.success(isArchived ? "Post restored to drafts" : "Post archived");
    } catch {
      toast.error(post.status === "Archived" ? "Failed to restore post" : "Failed to archive post");
    }
  };

  const duplicatePost = async (post: Post) => {
    try {
      const created = await mutateDuplicate(post.id);
      const mapped = mapApiPost(created);
      setPosts((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
      toast.success("Post duplicated as draft");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to duplicate post",
      );
    }
  };

  const deletePost = async () => {
    if (!deleteTarget || isDeleting) return;
    try {
      setIsDeleting(true);
      await mutateDelete(deleteTarget.id);
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      if (viewingPost?.id === deleteTarget.id) {
        handleBackFromDetail();
      }
      toast.success("Post deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Filter & Sort ─────────────────────────────────────

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const handleClearAllFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  const handleViewPost = (post: Post) => {
    setViewingPost(post);
    sessionStorage.setItem("viewingPostId", post.id);
    setSearchParams({ post: post.id, title: post.title });
  };

  const handleBackFromDetail = () => {
    setViewingPost(null);
    sessionStorage.removeItem("viewingPostId");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("post");
      next.delete("title");
      return next;
    });
  };

  const openEditor = (post?: Post) => {
    setEditingPost(post || null);
    setEditorOpen(true);
    setViewingPost(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("post");
      if (post) {
        next.set("edit", post.id);
        next.set("title", post.title);
      } else {
        next.set("action", "create");
        next.delete("title");
      }
      return next;
    });
  };

  const closeEditor = () => {
    try {
      sessionStorage.removeItem("admin_preview_post");
    } catch {
      // ignore
    }
    wasPreviewRef.current = false;
    setEditorOpen(false);
    setEditingPost(null);
    setPreviewPost(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("action");
      next.delete("edit");
      next.delete("title");
      next.delete("preview");
      return next;
    });
  };

  const handleSave = async (form: EditorForm) => {
    setIsSaving(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
        source: form.source,
        category: form.category === "Waste Tip" ? "WASTE_TIP" : "EVENT",
        status: mapStatusToApi(form.status),
        is_featured: form.featured,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        images: form.images,
        scheduled_at: form.scheduledDate || null,
      };

      if (editingPost) {
        const updated = await mutateUpdate(editingPost.id, payload);
        const mapped = mapApiPost(updated);
        setPosts((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
        if (viewingPost?.id === mapped.id) {
          setViewingPost(mapped);
        }
        toast.success("Post updated successfully!");
      } else {
        const created = await mutateCreate(payload);
        const mapped = mapApiPost(created);
        setPosts((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
        toast.success("Post created successfully!");
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = (form: EditorForm) => {
    const preview: Post = {
      id: "preview",
      title: form.title || "Untitled Announcement",
      body: form.body || "No content provided yet...",
      source: form.source || "",
      category: form.category || "Waste Tip",
      status: form.status || "Draft",
      featured: Boolean(form.featured),
      author:
        editingPost?.author ||
        useAuthStore.getState().user?.full_name ||
        "Admin",
      publishedDate: form.scheduledDate
        ? new Date(form.scheduledDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Just now",
      lastEdited: "Just now",
      views: 0,
      likes: 0,
      tags: (form.tags || "")
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
      images: form.images || [],
      scheduledDate: form.scheduledDate || null,
    };
    try {
      sessionStorage.setItem("admin_preview_post", JSON.stringify(preview));
    } catch {
      // ignore
    }
    wasPreviewRef.current = true;
    setPreviewPost(preview);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("preview", "true");
      return next;
    });
  };

  if (isDetailLoading)
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        <AdminPostDetailSkeleton />
      </div>
    );

  if (viewingPost && viewingPost.id === requestedPostId) {
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        <AdminPostDetail
          post={viewingPost}
          onEdit={(post) => {
            handleBackFromDetail();
            openEditor(post);
          }}
          onDuplicate={duplicatePost}
          onArchive={archivePost}
          onTogglePublish={togglePublish}
          onToggleFeatured={toggleFeatured}
          onDelete={(post) => {
            setDeleteTarget(post);
          }}
        />
      </div>
    );
  }

  if (isInitialSync) {
    return <AdminPostsSkeleton viewMode={viewMode} />;
  }

  // Keep the editor mounted while previewing.  PostEditor owns the unsaved form
  // state, so unmounting it here would erase the post when returning from Preview.
  if (editorOpen || previewPost) {
    return (
      <>
        <div
          className={previewPost ? "hidden" : "w-full max-w-[1000px] mx-auto"}
          aria-hidden={!!previewPost}
        >
          <PostEditor
            editingPost={editingPost}
            onBack={closeEditor}
            onSave={handleSave}
            onPreview={handlePreview}
            isSaving={isSaving}
          />
        </div>

        {previewPost && (
          <div className="w-full max-w-[1000px] mx-auto space-y-6 animate-in fade-in duration-300 pb-16">
            <AdminPostDetail
              post={previewPost}
              isPreview={true}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-7 pb-10">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              News & Articles
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Publish and manage municipal waste guidelines, eco tips, and event updates.
          </p>
        </div>
        <Button onClick={() => openEditor()} className="gap-2 rounded-xl shadow-sm cursor-pointer shrink-0">
          <Plus className="w-4 h-4" /> Create Article
        </Button>
      </div>

      <PostStats posts={posts} stats={postStats || undefined} />

      {loadError && (
        <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-destructive">{loadError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadPosts()}
            className="rounded-lg"
          >
            Try again
          </Button>
        </div>
      )}

      {/* ── Standardized 2-Tier Filter Card Container ── */}
      <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
        {/* Tier 1: Status Navigation & Search */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5">
          {/* Status Pills with Circular Count Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-pan-x">
            {STATUS_TABS.map((tab) => {
              const count = statusCounts[tab.key] || 0;
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer active:scale-95 shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/25 font-bold"
                      : "bg-card border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                  <span
                    className={`inline-flex items-center justify-center rounded-full leading-none font-bold text-[10px] transition-colors ${
                      count > 9 ? "h-5 min-w-5 px-1.5" : "w-5 h-5"
                    } ${
                      isActive
                        ? "bg-primary-foreground text-primary"
                        : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                    }`}
                  >
                    {count}
                  </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full xl:w-[330px] shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search articles by title, tag, or author..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-9 h-10 bg-background border-input/80 rounded-xl text-xs shadow-2xs hover:border-primary/50 focus-visible:border-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Secondary Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="mr-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </div>

          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 text-xs w-auto min-w-[130px] bg-card border-border/80 rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent align="start" className="rounded-xl border border-border">
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              <SelectItem value="Waste Tip" className="text-xs">Waste Tip</SelectItem>
              <SelectItem value="Event" className="text-xs">Event</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters button */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl gap-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </Button>
          )}

          {/* Right side: Sort By + View Mode Toggle */}
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-auto min-w-[130px] bg-card border-border/80 rounded-xl">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl border border-border">
                <SelectItem value="newest" className="text-xs">Newest First</SelectItem>
                <SelectItem value="oldest" className="text-xs">Oldest First</SelectItem>
                <SelectItem value="views" className="text-xs">Most Views</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border/80 gap-0.5 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
                  viewMode === "list"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div aria-busy={isListLoading}>
      {listQuery.isLoading ? <AdminPostsContentSkeleton viewMode={viewMode} /> : !loadError && posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">No posts found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeFilterCount > 0
              ? "Try clearing or changing the current filters."
              : "Create the first community article to get started."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onView={handleViewPost}
              onEdit={openEditor}
              onDuplicate={duplicatePost}
              onArchive={archivePost}
              onTogglePublish={togglePublish}
              onToggleFeatured={toggleFeatured}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <PostListView
          posts={posts}
          onView={handleViewPost}
          onEdit={openEditor}
          onDuplicate={duplicatePost}
          onArchive={archivePost}
          onTogglePublish={togglePublish}
          onToggleFeatured={toggleFeatured}
          onDelete={setDeleteTarget}
        />
      )}
      </div>

      {/* ── Pagination ── */}
      {!listQuery.isLoading && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={postsPerPage}
          itemLabel="posts"
          onPageChange={setCurrentPage}
          variant="floating"
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
        title="Remove Post?"
        icon={<Trash2 />}
        variant="destructive"
        description={<>Remove <strong className="font-semibold text-foreground">&ldquo;{deleteTarget?.title}&rdquo;</strong>? It will disappear from all resident feeds and remain recoverable in the database.</>}
        confirmLabel="Remove Post"
        isPending={isDeleting}
        pendingLabel="Deleting..."
        onConfirm={() => void deletePost()}
      />
    </div>
  );
};

export default AdminPosts;
