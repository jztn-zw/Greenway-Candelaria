import { formatManilaDateTime } from "@/utils/date";
import { AdminFilterDialog, AdminFilterField } from "@/components/admin/AdminFilterDialog";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import ListEmptyState from "@/components/common/ListEmptyState";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { SearchInput } from "@/components/common/SearchInput";
import { adminCommunityStyles as postStyles } from "@/components/common/communityContentStyles";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import PaginationControls from "@/components/common/PaginationControls";
import {
  AdminPostDetailSkeleton,
  AdminPostsSkeleton,
  AdminPostsContentSkeleton,
} from "@/components/loading/PageLoadingSkeletons";

import { Button } from "@/components/ui/button";
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
import { ArrowUpDown, FileText, LayoutGrid, List, Plus, RotateCcw, SlidersHorizontal, Trash2 } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
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
// in Philippine time.
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
  category: p.category === "WASTE_TIP" ? "Waste Tip" : "Event",
  status: mapStatus(p.status),
  featured: Boolean(p.is_featured),
  author: p.author_name || "Admin",
  publishedDate: p.published_at
    ? formatManilaDateTime(p.published_at, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null,
  lastEdited: p.updated_at
    ? formatManilaDateTime(p.updated_at, {
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
  });  const wasPreviewRef = useRef(false);
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
    setPosts(mapApiPosts(result.posts));
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

  const STATUS_TABS: FilterPillItem<string>[] = [
    { id: "all", label: "All Posts" },
    { id: "Published", label: "Published" },
    { id: "Draft", label: "Drafts" },
    { id: "Scheduled", label: "Scheduled" },
    { id: "Archived", label: "Archived" },
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
    // Router navigation is deferred. Commit the editor state in the same
    // transition so the URL synchronization effect cannot reopen the list.
    startTransition(() => {
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
    });
  };

  const closeEditor = () => {
    try {
      sessionStorage.removeItem("admin_preview_post");
    } catch {
      // ignore
    }
    wasPreviewRef.current = false;
    startTransition(() => {
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
    });
  };

  const handleSave = async (form: EditorForm) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        title: form.title,
        body: form.body,
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
      category: form.category || "Waste Tip",
      status: form.status || "Draft",
      featured: Boolean(form.featured),
      author:
        editingPost?.author ||
        useAuthStore.getState().user?.full_name ||
        "Admin",
      publishedDate: form.scheduledDate
        ? formatManilaDateTime(form.scheduledDate, {
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
        <AdminPostDetailSkeleton onBack={handleBackFromDetail} />
      </div>
    );

  if (viewingPost && viewingPost.id === requestedPostId) {
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        <AdminPostDetail
          post={viewingPost}
          onBack={handleBackFromDetail}
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
              onBack={() => setSearchParams((previous) => {
                const next = new URLSearchParams(previous);
                next.delete("preview");
                return next;
              })}
            />
          </div>
        )}
      </>
    );
  }

  if (loadError && !hasLoadedListRef.current) return <PageErrorState kind="unavailable" description="We couldn't load community posts. Please try again." onRetry={() => void loadPosts()} retrying={listQuery.isFetching} homeHref="/admin" />;

  return (
    <div className={postStyles.page}>
      {/* ── Top Header ── */}
      <ResidentPageHeader
        className="admin-module-header"
        title="Community Posts"
        description="Publish and manage community waste tips, guidelines, and event updates."
        actionsClassName="admin-module-header-actions"
        actions={<Button onClick={() => openEditor()} className={`${postStyles.action} shrink-0`}>
          <Plus className="w-4 h-4" /> Create Post
        </Button>}
      />

      <PostStats posts={posts} stats={postStats || undefined} />

      {loadError && <DataRefreshNotice message="Couldn't update community posts. Showing the previous results, which may be outdated or differ from your filters." onRetry={() => void loadPosts()} retrying={listQuery.isFetching} />}

      {/* ── Standardized 2-Tier Filter Card Container ── */}
      <section className={`${postStyles.toolbar} admin-toolbar`}>
        {/* Tier 1: Status Navigation & Search */}
        <div className={`${postStyles.primary} admin-toolbar-primary`}>
          {/* Status filters */}
          <FilterPillTabs
            items={STATUS_TABS}
            activeId={statusFilter}
            onChange={(status) => {
              setStatusFilter(status);
              setCurrentPage(1);
            }}
            ariaLabel="Post status filters"
            className={`${postStyles.tabs} admin-toolbar-chips`}
          />

          {/* Search Input */}
          <div className={`${postStyles.search} admin-toolbar-search-row`}>
            <SearchInput
              placeholder="Search by title, content, tag, or author…" compactPlaceholder="Title or content…"
              value={search}
              onChange={(value) => {
                setSearch(value);
                setCurrentPage(1);
              }}
              containerClassName="min-w-0 flex-1"
            />
            <AdminFilterDialog title="Filter Posts" activeCount={Number(categoryFilter !== "all") + Number(sortBy !== "newest")}
              values={{ categoryFilter, sortBy, viewMode }}
              onApply={(next) => {
                setCategoryFilter(next.categoryFilter);
                setSortBy(next.sortBy);
                setViewMode(next.viewMode);
                setCurrentPage(1);
              }}
              resetValues={{ categoryFilter: "all", sortBy: "newest", viewMode }}
            >
              {(draft, setDraft) => (
                <>
                  <AdminFilterField label="Category">
                    <Select
                      value={draft.categoryFilter}
                      onValueChange={(v) => {
                        setDraft({ ...draft, categoryFilter: v });
                      }}
                    >
                      <SelectTrigger aria-label="Category" className="h-9 w-full rounded-xl text-xs">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent align="start" className="rounded-xl border border-border">
                        <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                        <SelectItem value="Waste Tip" className="text-xs">Waste Tip</SelectItem>
                        <SelectItem value="Event" className="text-xs">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </AdminFilterField>
                  <AdminFilterField label="Sort order">
                    <Select
                      value={draft.sortBy}
                      onValueChange={(v) => {
                        setDraft({ ...draft, sortBy: v });
                      }}
                    >
                      <SelectTrigger aria-label="Sort order" className="h-9 w-full rounded-xl text-xs">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="admin-community-sort-value">
                            <SelectValue placeholder="Sort by" />
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent align="end" className="rounded-xl border border-border">
                        <SelectItem value="newest" className="text-xs">Newest First</SelectItem>
                        <SelectItem value="oldest" className="text-xs">Oldest First</SelectItem>
                        <SelectItem value="views" className="text-xs">Most Views</SelectItem>
                      </SelectContent>
                    </Select>
                  </AdminFilterField>
                  <AdminFilterField label="Layout">
                    <SegmentedControl<"grid" | "list">
                      options={[
                        { value: "grid", label: "Grid view", icon: LayoutGrid },
                        { value: "list", label: "List view", icon: List },
                      ]}
                      value={draft.viewMode}
                      onChange={(value) => setDraft({ ...draft, viewMode: value })}
                      ariaLabel="Post layout"
                      className="admin-filter-layout"
                    />
                  </AdminFilterField>
                </>
              )}
            </AdminFilterDialog>
          </div>
        </div>

        {/* Tier 2: Secondary Filter Strip */}
        <div className={`${postStyles.secondary} admin-toolbar-secondary`}>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className={postStyles.filterLabel}>
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
              <SelectTrigger aria-label="Filter posts by category" className={postStyles.category}>
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
                aria-label="Clear all post filters"
                className="h-8 shrink-0 rounded-xl gap-1 px-2 text-xs [&_svg]:size-3.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="admin-community-clear-label">Clear all</span>
              </Button>
            )}
          </div>

          {/* Right side: Sort By + View Mode Toggle */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(v) => {
                setSortBy(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger aria-label={`Sort posts: ${sortBy === "newest" ? "Newest first" : sortBy === "oldest" ? "Oldest first" : "Most views"}`} className={postStyles.sort}>
                <div className="flex min-w-0 items-center gap-1.5">
                  <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="admin-community-sort-value">
                    <SelectValue placeholder="Sort by" />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl border border-border">
                <SelectItem value="newest" className="text-xs">Newest First</SelectItem>
                <SelectItem value="oldest" className="text-xs">Oldest First</SelectItem>
                <SelectItem value="views" className="text-xs">Most Views</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex h-8 items-center p-0.5 rounded-xl bg-muted/60 border border-border/80 gap-0.5 shrink-0 shadow-2xs" role="group" aria-label="Post layout">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${viewMode === "grid"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "gw-action-ghost "
                  }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${viewMode === "list"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "gw-action-ghost "
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
      {listQuery.isLoading ? <AdminPostsContentSkeleton viewMode={viewMode} /> : posts.length === 0 ? (
        <ListEmptyState icon={FileText} title="No posts found"
          description={activeFilterCount > 0
              ? "Try clearing or changing the current filters."
              : "Create the first community post to get started."} />
      ) : viewMode === "grid" ? (
        <div className={postStyles.grid}>
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
        <PaginationControls mobileLayout="summary"
          currentPage={currentPage}
          totalPages={totalPages}
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
