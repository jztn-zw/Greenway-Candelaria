import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
  User,
  Calendar,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Send,
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
  getReadingTime,
} from "./types";
import PostStats from "./PostStats";
import PostCard from "./PostCard";
import PostListView from "./PostListView";
import PostEditor, { EditorForm } from "./PostEditor";
import AdminPostDetail from "./AdminPostDetail";
import {
  PageHeaderSkeleton,
  KPIRowSkeleton,
  ToolbarSkeleton,
  CardGridSkeleton,
  AdminPostDetailSkeleton,
} from "@/components/PageLoadingSkeletons";
import postsService from "@/services/postsService";

const POSTS_PER_PAGE = 6;

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
  commentCount: p.comment_count || 0,
  tags: p.tags || [],
  images:
    p.images?.map((img: any) => (typeof img === "string" ? img : img.url)) ||
    [],
  scheduledDate: p.scheduled_at || null,
  commentsEnabled: true,
  comments: [],
});

const mapApiPosts = (data: any[]): Post[] => data.map(mapApiPost);

// ─── Component ─────────────────────────────────────────────

const AdminPosts = () => {
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
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [featuredWarning, setFeaturedWarning] = useState(false);
  const [pendingFeaturedId, setPendingFeaturedId] = useState<string | null>(
    null,
  );

  // State for Preview Gallery
  const [previewActiveImageIndex, setPreviewActiveImageIndex] = useState(0);

  useEffect(() => {
    const initializeData = async () => {
      const savedPostId = sessionStorage.getItem("viewingPostId");
      try {
        const listPromise = postsService.getAll({ all: true });
        const detailPromise = savedPostId
          ? postsService.getById(savedPostId)
          : null;
        const commentsPromise = savedPostId
          ? postsService.getComments(savedPostId)
          : null;

        const [listData, postData, rawComments] = await Promise.all([
          listPromise,
          detailPromise,
          commentsPromise,
        ]);

        setPosts(mapApiPosts(listData));

        if (postData && rawComments) {
          const post = mapApiPost(postData);
          const mappedComments = rawComments.map((c: any) => ({
            id: c.id,
            author: c.author_name || "Unknown",
            text: c.body,
            date: c.created_at,
            likes: 0,
            parentId: c.parent_id ?? undefined,
          }));
          setViewingPost({ ...post, comments: mappedComments });
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

  // ─── Actions ───────────────────────────────────────────

  const togglePublish = async (post: Post) => {
    try {
      const newStatus = post.status === "Published" ? "DRAFT" : "PUBLISHED";
      const updated = await postsService.update(post.id, { status: newStatus });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? mapApiPost(updated) : p)),
      );
      toast.success(
        newStatus === "PUBLISHED" ? "Post published" : "Post unpublished",
      );
    } catch (err) {
      toast.error("Failed to update post");
    }
  };

  const archivePost = async (post: Post) => {
    try {
      const newStatus = post.status === "Archived" ? "DRAFT" : "ARCHIVED";
      const updated = await postsService.update(post.id, { status: newStatus });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? mapApiPost(updated) : p)),
      );
      toast.success(
        newStatus === "ARCHIVED" ? "Post archived" : "Post restored",
      );
    } catch (err) {
      toast.error("Failed to archive post");
    }
  };

  const deletePost = async () => {
    if (!deleteTarget) return;
    try {
      await postsService.delete(deleteTarget.id);
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success("Post deleted");
    } catch (err) {
      toast.error("Failed to delete post");
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = useMemo(() => {
    let result = [...posts];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== "all")
      result = result.filter((p) => p.category === categoryFilter);
    if (statusFilter !== "all")
      result = result.filter((p) => p.status === statusFilter);

    result.sort((a, b) => {
      if (sortBy === "newest") return b.lastEdited.localeCompare(a.lastEdited);
      if (sortBy === "oldest") return a.lastEdited.localeCompare(b.lastEdited);
      if (sortBy === "most-viewed") return b.views - a.views;
      return 0;
    });
    return result;
  }, [posts, search, categoryFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );
  const featuredPosts = posts.filter((p) => p.featured);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: posts.length };
    posts.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [posts]);

  const handleViewPost = async (post: Post) => {
    setIsDetailLoading(true);
    try {
      const rawComments = await postsService.getComments(post.id);
      const mappedComments: any[] = rawComments.map((c: any) => ({
        id: c.id,
        author: c.author_name || "Unknown",
        text: c.body,
        date: c.created_at,
        likes: 0,
        parentId: c.parent_id ?? undefined,
      }));
      setViewingPost({ ...post, comments: mappedComments });
      sessionStorage.setItem("viewingPostId", post.id);
    } catch (err) {
      setViewingPost({ ...post, comments: [] });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openEditor = (post?: Post) => {
    setEditingPost(post || null);
    setEditorOpen(true);
  };

  const handleSave = async (form: EditorForm) => {
    setIsSaving(true); // Start loading
    try {
      const payload = {
        title: form.title,
        body: form.body,
        source: form.source,
        category: form.category === "Waste Tip" ? "WASTE_TIP" : "EVENT",
        status: mapStatusToApi(form.status),
        is_featured: form.featured,
        scheduled_at: form.scheduledDate || undefined,
        images: form.images, // Order is preserved from the array
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (editingPost) {
        const updated = await postsService.update(editingPost.id, payload);
        setPosts((prev) =>
          prev.map((p) => (p.id === editingPost.id ? mapApiPost(updated) : p)),
        );
        toast.success("Post updated successfully");
      } else {
        const created = await postsService.create(payload);
        setPosts((prev) => [mapApiPost(created), ...prev]);
        toast.success("Post created successfully");
      }
      setEditorOpen(false);
    } catch (err) {
      toast.error("Failed to save post");
    } finally {
      setIsSaving(false); // Stop loading
    }
  };

  const handlePreview = (form: EditorForm) => {
    setPreviewActiveImageIndex(0);
    setPreviewPost({
      ...(editingPost || {
        id: "preview",
        author: "Admin",
        publishedDate: null,
        lastEdited: "",
        views: 0,
        images: [],
        comments: [],
      }),
      title: form.title,
      body: form.body,
      source: form.source,
      category: form.category,
      status: form.status,
      featured: form.featured,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images: form.images,
      scheduledDate: form.scheduledDate || null,
      commentsEnabled: form.commentsEnabled,
    } as Post);
  };

  const duplicatePost = async (post: Post) => {
    try {
      const created = await postsService.create({
        title: `${post.title} (Copy)`,
        body: post.body,
        source: post.source,
        category: post.category === "Waste Tip" ? "WASTE_TIP" : "EVENT",
        status: "DRAFT",
        is_featured: false,
        tags: post.tags,
        images: post.images || [],
      });
      setPosts((prev) => [mapApiPost(created), ...prev]);
      toast.success("Post duplicated as draft");
    } catch (err) {
      toast.error("Failed to duplicate post");
    }
  };

  const handleAdminDeleteComment = async (
    postId: string,
    commentId: string,
  ) => {
    try {
      await postsService.deleteComment(postId, commentId);
      setViewingPost((prev) =>
        prev && prev.id === postId
          ? {
              ...prev,
              comments: prev.comments.filter(
                (c) => c.id !== commentId && c.parentId !== commentId,
              ),
            }
          : prev,
      );
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment");
    }
  };

  const handleAdminAddComment = async (
    postId: string,
    text: string,
    parentId?: string,
  ) => {
    try {
      const newComment = await postsService.addComment(postId, text, parentId);
      const mapped = {
        id: newComment.id,
        author: newComment.author_name || "Admin",
        text: newComment.body,
        date: newComment.created_at,
        likes: 0,
        parentId: newComment.parent_id ?? undefined,
      };
      setViewingPost((prev) =>
        prev && prev.id === postId
          ? { ...prev, comments: [...prev.comments, mapped] }
          : prev,
      );
    } catch (err) {
      toast.error("Failed to add comment");
    }
  };

  const handleAdminEditComment = (
    postId: string,
    commentId: string,
    newText: string,
  ) => {
    setViewingPost((prev) =>
      prev && prev.id === postId
        ? {
            ...prev,
            comments: prev.comments.map((c) =>
              c.id === commentId ? { ...c, text: newText } : c,
            ),
          }
        : prev,
    );
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
          onBack={() => {
            setViewingPost(null);
            sessionStorage.removeItem("viewingPostId");
          }}
          onEdit={(post) => {
            setViewingPost(null);
            sessionStorage.removeItem("viewingPostId");
            openEditor(post);
          }}
          onDeleteComment={handleAdminDeleteComment}
          onAddComment={handleAdminAddComment}
          onEditComment={handleAdminEditComment}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">
                Posts
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage waste tips and event posts for residents.
              </p>
            </div>
          </div>
          <Button onClick={() => openEditor()} className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Create Post
          </Button>
        </div>
      </div>

      <PostStats posts={posts} />

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[130px] bg-background">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Waste Tip">Waste Tip</SelectItem>
                <SelectItem value="Event">Event</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border border-border rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Results info ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">
            {filtered.length}
          </span>{" "}
          post{filtered.length !== 1 && "s"}
        </p>
      </div>

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
          onDelete={setDeleteTarget}
        />
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
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
              className="h-8 w-8 text-xs"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Preview Dialog (Resident-style) ── */}
      <Dialog
        open={!!previewPost}
        onOpenChange={(open) => !open && setPreviewPost(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 scrollbar-hide border border-border bg-background shadow-2xl">
          {previewPost && (
            <div className="p-6 sm:p-8 space-y-0">
              <div className="mb-6">
                <Badge
                  variant="outline"
                  className="text-primary border-primary/20 bg-primary/5 uppercase tracking-widest text-[10px] px-3 py-1"
                >
                  Resident Preview
                </Badge>
              </div>

              {/* Hero image */}
              <div className="rounded-2xl overflow-hidden relative bg-card">
                {previewPost.images && previewPost.images.length > 0 ? (
                  <div className="relative w-full min-h-[280px] max-h-[520px]">
                    <div
                      className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-60"
                      style={{
                        backgroundImage: `url(${previewPost.images[previewActiveImageIndex]})`,
                      }}
                    />
                    <img
                      src={previewPost.images[previewActiveImageIndex]}
                      className="relative w-full h-full object-contain max-h-[520px] z-10"
                      alt={previewPost.title}
                    />
                  </div>
                ) : (
                  <div className="w-full h-56 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                    <FileText className="w-12 h-12 text-primary/20" />
                  </div>
                )}
                <div className="absolute top-3 left-3 z-20">
                  <Badge className="text-xs font-semibold bg-background/90 backdrop-blur-sm text-foreground border-border shadow-sm">
                    {previewPost.category}
                  </Badge>
                </div>
              </div>

              {/* Gallery thumbnails */}
              {previewPost.images && previewPost.images.length > 1 && (
                <div className="flex gap-2.5 pt-4 overflow-x-auto pb-1 scrollbar-hide">
                  {previewPost.images.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewActiveImageIndex(i)}
                      className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        i === previewActiveImageIndex
                          ? "border-primary ring-2 ring-primary/20 scale-95"
                          : "border-transparent hover:border-primary/40 grayscale-[0.3] hover:grayscale-0"
                      }`}
                    >
                      <img
                        src={url}
                        className="w-full h-full object-cover"
                        alt={`thumb ${i + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Title */}
              <div className="pt-5 space-y-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-foreground tracking-tight leading-tight">
                  {previewPost.title}
                </h1>
                {previewPost.source && (
                  <p className="text-muted-foreground text-sm">{previewPost.source}</p>
                )}
              </div>

              {/* Meta bar */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-4 border-b border-border text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Admin
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Just now
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {getReadingTime(previewPost.body)}
                </span>
              </div>

              {/* Action bar (like resident) */}
              <div className="flex items-center gap-2 py-3 border-b border-border">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <Heart className="w-4 h-4" /> 0
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" /> 0
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Bookmark className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="py-8">
                <article className="prose prose-sm sm:prose-base max-w-none text-foreground leading-[1.8]">
                  {previewPost.body.split(". ").reduce<string[][]>((acc, sentence, i) => {
                    const pIdx = Math.floor(i / 4);
                    if (!acc[pIdx]) acc[pIdx] = [];
                    acc[pIdx].push(sentence);
                    return acc;
                  }, []).map((para, i) => (
                    <p key={i} className="mb-5 text-foreground/90">{para.join(". ")}.</p>
                  ))}
                </article>
              </div>

              {/* Tags */}
              {previewPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-6 border-b border-border">
                  {previewPost.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/15">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Comments placeholder */}
              <div className="py-6 space-y-4">
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Comments (0)
                </h3>
                <div className="flex gap-3">
                  <Input placeholder="Write a comment..." className="flex-1 bg-card" disabled />
                  <Button size="icon" variant="default" disabled>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center py-4">
                  Be the first to comment on this post!
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Post Editor ── */}
      <PostEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editingPost={editingPost}
        onSave={handleSave}
        onPreview={handlePreview}
        isSaving={isSaving} // <--- ADD THIS LINE
        comments={editingPost?.comments || []}
        onDeleteComment={(commentId) =>
          editingPost && handleAdminDeleteComment(editingPost.id, commentId)
        }
      />

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete "{deleteTarget?.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePost}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPosts;
