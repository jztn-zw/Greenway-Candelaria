import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/lib/toast";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  Calendar,
  Eye,
  Heart,
  X,
  ArrowLeft,
  SlidersHorizontal,
  RotateCcw,
  ArrowUpDown,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Post,
  PostStatus,
  statusStyles,
  categoryStyles,
} from "./types";
import PostStats from "./PostStats";
import PostCard from "./PostCard";
import PostListView from "./PostListView";
import PostEditor, { EditorForm } from "./PostEditor";
import AdminPostDetail from "./AdminPostDetail";
import { BackButton } from "@/components/common";
import {
  PageHeaderSkeleton,
  KPIRowSkeleton,
  ToolbarSkeleton,
  CardGridSkeleton,
  AdminPostDetailSkeleton,
} from "@/components/PageLoadingSkeletons";
import postsService from "@/services/postsService";
import useAuthStore from "@/store/authStore";

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

const mapApiPost = (p: any): Post => ({
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
    p.images?.map((img: any) => (typeof img === "string" ? img : img.url)) ||
    [],
  scheduledDate: toUtcIsoString(p.scheduled_at),
});

const mapApiPosts = (data: any[]): Post[] => data.map(mapApiPost);

// ─── Component ─────────────────────────────────────────────

const AdminPosts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
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
    const initializeData = async () => {
      const urlPostId = searchParams.get("post");
      const savedPostId = urlPostId || sessionStorage.getItem("viewingPostId");
      try {
        const listPromise = postsService.getAll({ all: true });
        const detailPromise = savedPostId
          ? postsService.getById(savedPostId)
          : null;

        const [listData, postData] = await Promise.all([
          listPromise,
          detailPromise,
        ]);

        setPosts(mapApiPosts(listData));

        if (postData) {
          setViewingPost(mapApiPost(postData));
        }
      } catch (err) {
        console.error("Initialization failed:", err);
        sessionStorage.removeItem("viewingPostId");
      } finally {
        setIsInitialSync(false);
      }
    };
    initializeData();
  }, []);

  // Synchronize URL parameters if post query, edit, or create action changes externally or via back/forward
  useEffect(() => {
    const editId = searchParams.get("edit");
    const isCreateAction = searchParams.get("action") === "create";

    if (isCreateAction) {
      setEditorOpen(true);
      setEditingPost(null);
      setViewingPost(null);
      return;
    }

    if (editId && posts.length > 0) {
      const found = posts.find((p) => p.id === editId);
      if (found) {
        setEditingPost(found);
        setEditorOpen(true);
        setViewingPost(null);
        return;
      }
    }

    if (!editId && !isCreateAction && editorOpen) {
      setEditorOpen(false);
      setEditingPost(null);
    }

    const postIdFromUrl = searchParams.get("post");
    if (postIdFromUrl && posts.length > 0) {
      if (!viewingPost || viewingPost.id !== postIdFromUrl) {
        const found = posts.find((p) => p.id === postIdFromUrl);
        if (found) {
          setViewingPost(found);
        } else {
          postsService
            .getById(postIdFromUrl)
            .then((p) => setViewingPost(mapApiPost(p)))
            .catch(() => {});
        }
      }
    } else if (!postIdFromUrl && viewingPost) {
      setViewingPost(null);
    }
  }, [searchParams, posts]);

  const statusCounts = useMemo(() => {
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
  }, [posts]);

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
      const updated = await postsService.update(post.id, { status: newStatus });
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
      const updated = await postsService.update(post.id, {
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
      const updated = await postsService.update(post.id, { status: nextStatus });
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
      const created = await postsService.duplicate(post.id);
      const mapped = mapApiPost(created);
      setPosts((prev) => [mapped, ...prev]);
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
      await postsService.delete(deleteTarget.id);
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

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const matchSearch =
        search === "" ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.body.toLowerCase().includes(search.toLowerCase()) ||
        post.tags.some((tag) =>
          tag.toLowerCase().includes(search.toLowerCase()),
        );

      const matchCategory =
        categoryFilter === "all" || post.category === categoryFilter;

      const matchStatus =
        statusFilter === "all" || post.status === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [posts, search, categoryFilter, statusFilter]);

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

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        return (
          new Date(b.lastEdited || 0).getTime() -
          new Date(a.lastEdited || 0).getTime()
        );
      }
      if (sortBy === "oldest") {
        return (
          new Date(a.lastEdited || 0).getTime() -
          new Date(b.lastEdited || 0).getTime()
        );
      }
      if (sortBy === "views") {
        return b.views - a.views;
      }
      return 0;
    });
  }, [filtered, sortBy]);

  const postsPerPage =
    viewMode === "grid" ? POSTS_PER_PAGE_GRID : POSTS_PER_PAGE_TABLE;
  const totalPages = Math.max(1, Math.ceil(sorted.length / postsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  const paginated = useMemo(() => {
    return sorted.slice(
      (currentPage - 1) * postsPerPage,
      currentPage * postsPerPage,
    );
  }, [sorted, currentPage, postsPerPage]);

  const handleViewPost = async (post: Post) => {
    setIsDetailLoading(true);
    sessionStorage.setItem("viewingPostId", post.id);
    setSearchParams({ post: post.id, title: post.title });
    try {
      const freshPost = await postsService.getById(post.id);
      setViewingPost(mapApiPost(freshPost));
    } catch {
      setViewingPost(post);
    } finally {
      setIsDetailLoading(false);
    }
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

  const handleReturnFromPreview = () => {
    try {
      sessionStorage.removeItem("admin_preview_post");
    } catch {
      // ignore
    }
    wasPreviewRef.current = false;
    setPreviewPost(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("preview");
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
        const updated = await postsService.update(editingPost.id, payload);
        const mapped = mapApiPost(updated);
        setPosts((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
        if (viewingPost?.id === mapped.id) {
          setViewingPost(mapped);
        }
        toast.success("Post updated successfully!");
      } else {
        const created = await postsService.create(payload);
        const mapped = mapApiPost(created);
        setPosts((prev) => [mapped, ...prev]);
        toast.success("Post created successfully!");
      }
      closeEditor();
    } catch {
      toast.error("Failed to save post");
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

  if (isInitialSync) {
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        {!!sessionStorage.getItem("viewingPostId") ? (
          <AdminPostDetailSkeleton />
        ) : (
          <div className="space-y-6">
            <PageHeaderSkeleton />
            <KPIRowSkeleton count={4} />
            <ToolbarSkeleton />
            <CardGridSkeleton count={6} cols={3} />
          </div>
        )}
      </div>
    );
  }

  if (isDetailLoading)
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        <AdminPostDetailSkeleton />
      </div>
    );

  if (viewingPost) {
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
            {/* Top Navigation: Just Back Button */}
            <div>
              <BackButton
                label="Back to Editor"
                onClick={handleReturnFromPreview}
              />
            </div>

            <AdminPostDetail
              post={previewPost}
              onBack={handleReturnFromPreview}
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
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
                News & Articles
              </h1>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {posts.length} total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Publish and manage municipal waste guidelines, eco tips, and event updates.
            </p>
          </div>
        </div>
        <Button onClick={() => openEditor()} className="gap-2 rounded-xl shadow-sm cursor-pointer shrink-0">
          <Plus className="w-4 h-4" /> Create Article
        </Button>
      </div>

      <PostStats posts={posts} />

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
                      : "bg-card border-border/80 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
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
            {activeFilterCount > 0 && (
              <Badge className="h-4 min-w-4 justify-center rounded-full border-0 bg-primary/15 px-1 text-[9px] text-primary hover:bg-primary/15">
                {activeFilterCount}
              </Badge>
            )}
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


      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginated.map((post) => (
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
          posts={paginated}
          onView={handleViewPost}
          onEdit={openEditor}
          onDuplicate={duplicatePost}
          onArchive={archivePost}
          onTogglePublish={togglePublish}
          onToggleFeatured={toggleFeatured}
          onDelete={setDeleteTarget}
        />
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none font-medium"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl border border-border/80 p-5 sm:p-6 shadow-2xl sm:max-w-md [&>button:last-child]:hidden">
          <AlertDialogHeader>
            <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <AlertDialogTitle className="text-base font-bold font-display text-foreground tracking-tight truncate">
                  Delete Post?
                </AlertDialogTitle>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setDeleteTarget(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-2.5">
              Permanently delete{" "}
              <strong className="text-foreground font-semibold">
                &ldquo;{deleteTarget?.title}&rdquo;
              </strong>
              ? This action cannot be undone and will remove it from all resident feeds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2.5 pt-3.5 border-t border-border/60 mt-1">
            <AlertDialogCancel
              disabled={isDeleting}
              className="h-10 px-4 rounded-xl border-border text-xs font-semibold cursor-pointer hover:bg-muted/60 active:scale-95 transition-all focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void deletePost();
              }}
              disabled={isDeleting}
              className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Post</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPosts;
