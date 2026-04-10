import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  Clock,
  Calendar,
  User,
  MessageCircle,
  Send,
  Trash2,
  Edit2,
  Star,
  Leaf,
  Sparkles,
  MoreHorizontal,
  Heart,
  CornerDownRight,
  X,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Post,
  Comment,
  statusStyles,
  categoryStyles,
  getReadingTime,
} from "./types";

// ─── Collapsible Replies ───────────────────────────────────

const CollapsibleReplies = ({
  replies,
  renderComment,
}: {
  replies: Comment[];
  renderComment: (comment: Comment, isReply?: boolean) => React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors ml-8 mb-2"
      >
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
        {isOpen ? "Hide" : "View"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
      </button>
      {isOpen && (
        <div className="space-y-2">
          {replies.map((reply) => renderComment(reply, true))}
        </div>
      )}
    </div>
  );
};

// ─── Helpers ───────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  try {
    const normalized =
      dateStr.includes("Z") || dateStr.includes("+")
        ? dateStr
        : dateStr.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d`;
    return new Date(normalized).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Types ─────────────────────────────────────────────────

interface AdminPostDetailProps {
  post: Post;
  onBack: () => void;
  onEdit: (post: Post) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onAddComment: (postId: string, text: string, parentId?: string) => void;
  onEditComment?: (postId: string, commentId: string, newText: string) => void;
}

// ─── Component ─────────────────────────────────────────────

const AdminPostDetail = ({
  post,
  onBack,
  onEdit,
  onDeleteComment,
  onAddComment,
  onEditComment,
}: AdminPostDetailProps) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0); // Track which image is clicked
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [likedComments, setLikedComments] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`liked_comments_${post.id}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  // ✅ Dynamic: use first image from post.images (Cloudinary URL)
  // Falls back to gradient placeholder if no images uploaded
  const imageUrl =
    post.images && post.images.length > 0
      ? post.images[activeImageIndex]
      : null;
  const CardIcon = post.category === "Waste Tip" ? Leaf : Sparkles;

  // ─── Comment handlers ──────────────────────────────────

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    onAddComment(post.id, newComment.trim());
    setNewComment("");
  };

  const handleReply = (commentId: string) => {
    if (!replyText.trim()) return;
    onAddComment(post.id, replyText.trim(), commentId);
    setReplyText("");
    setReplyingTo(null);
  };

  const toggleLikeComment = (commentId: string) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      try {
        localStorage.setItem(
          `liked_comments_${post.id}`,
          JSON.stringify([...next]),
        );
      } catch {}
      return next;
    });
  };

  const handleEditComment = (commentId: string) => {
    if (!editCommentText.trim()) return;
    onEditComment?.(post.id, commentId, editCommentText.trim());
    setEditingCommentId(null);
    setEditCommentText("");
  };

  const topLevelComments = post.comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) =>
    post.comments.filter((c) => c.parentId === parentId);

  // ─── Comment renderer ──────────────────────────────────

  const renderComment = (comment: Comment, isReply = false) => {
    const isLiked = likedComments.has(comment.id);
    const likeCount = comment.likes + (isLiked ? 1 : 0);
    const isEditing = editingCommentId === comment.id;

    return (
      <div
        key={comment.id}
        className={`${isReply ? "ml-8 border-l-2 border-primary/10 pl-4" : ""}`}
      >
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 group/comment">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {comment.author}
                  {comment.author === "Admin" && (
                    <span className="ml-1.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatRelativeDate(comment.date)}
                </span>
              </div>

              {isEditing ? (
                <div className="ml-9 mt-2 flex gap-2">
                  <Input
                    value={editCommentText}
                    onChange={(e) => setEditCommentText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleEditComment(comment.id)
                    }
                    className="flex-1 h-8 text-sm bg-background"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8"
                    onClick={() => handleEditComment(comment.id)}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditCommentText("");
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2 ml-9">
                  {comment.text}
                </p>
              )}
            </div>

            {/* 3-dot menu */}
            {!isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover/comment:opacity-100 transition-all text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditCommentText(comment.text);
                    }}
                    className="gap-2 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteComment(post.id, comment.id)}
                    className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Like & Reply actions */}
          {!isEditing && (
            <div className="ml-9 flex items-center gap-3">
              <button
                onClick={() => toggleLikeComment(comment.id)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                  isLiked
                    ? "text-destructive"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isLiked ? "fill-destructive" : ""}`}
                />
                {likeCount > 0 && likeCount}
              </button>

              {replyingTo === comment.id ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder="Write a reply as Admin..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleReply(comment.id)
                    }
                    className="flex-1 h-8 text-sm bg-background"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8"
                    onClick={() => handleReply(comment.id)}
                    disabled={!replyText.trim()}
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                !isReply && (
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1"
                  >
                    <CornerDownRight className="w-3 h-3" /> Reply
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Threaded replies - collapsible */}
        {getReplies(comment.id).length > 0 && (
          <CollapsibleReplies
            replies={getReplies(comment.id)}
            renderComment={renderComment}
          />
        )}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-0">
      {/* ── Back + Edit ── */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Posts
        </button>
        <Button
          onClick={() => onEdit(post)}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit Post
        </Button>
      </div>

      {/* ── Hero image ── */}
      <div className="rounded-2xl overflow-hidden relative bg-card">
        {imageUrl ? (
          // ✅ Dynamic Cloudinary image with blurred background effect
          <div className="relative w-full min-h-[280px] max-h-[420px]">
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-60"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
            <img
              src={imageUrl}
              alt={post.title}
              className="relative w-full h-full object-contain max-h-[420px] z-10"
            />
          </div>
        ) : (
          // ✅ Fallback gradient when no image uploaded
          <div
            className={`w-full h-56 flex items-center justify-center bg-gradient-to-br ${
              post.category === "Waste Tip"
                ? "from-canopy via-forest to-primary/80"
                : "from-forest via-primary/60 to-leaf/40"
            }`}
          >
            <CardIcon className="w-12 h-12 text-canopy-foreground/20" />
          </div>
        )}

        {/* Floating badges */}
        <div className="absolute top-3 left-3 z-20 flex gap-1.5">
          <Badge
            className={`text-xs font-semibold border ${categoryStyles[post.category]} shadow-sm`}
          >
            {post.category}
          </Badge>
          <Badge
            className={`text-xs font-semibold border ${statusStyles[post.status]} shadow-sm`}
          >
            {post.status}
          </Badge>
        </div>
        {post.featured && (
          <div className="absolute top-3 right-3 z-20">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow" />
          </div>
        )}
      </div>

      {/* ── Multiple images gallery (if more than 1) ── */}
      {post.images && post.images.length > 1 && (
        <div className="flex gap-2.5 pt-4 overflow-x-auto pb-1 scrollbar-hide">
          {post.images.map((url, i) => (
            <button
              key={i}
              onClick={() => setActiveImageIndex(i)} // Update hero image on click
              className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all duration-200 outline-none ${
                i === activeImageIndex
                  ? "border-primary ring-2 ring-primary/20 scale-95"
                  : "border-transparent hover:border-primary/40 grayscale-[0.3] hover:grayscale-0"
              }`}
            >
              <img
                src={url}
                alt={`${post.title} thumb ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Title ── */}
      <div className="pt-5 space-y-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-foreground tracking-tight leading-tight">
          {post.title}
        </h1>
        {post.source && (
          <p className="text-sm text-muted-foreground italic">{post.source}</p>
        )}
      </div>

      {/* ── Meta bar ── */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-4 border-b border-border text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> {post.author}
        </span>
        {post.publishedDate && (
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {post.publishedDate}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> {getReadingTime(post.body)}
        </span>
        <span className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" /> {post.views} views
        </span>
      </div>

      {/* ── Body ── */}
      <div className="py-8">
        <article className="prose prose-sm sm:prose-base max-w-none text-foreground leading-[1.8]">
          {post.body
            .split(". ")
            .reduce<string[][]>((acc, sentence, i) => {
              const pIdx = Math.floor(i / 4);
              if (!acc[pIdx]) acc[pIdx] = [];
              acc[pIdx].push(sentence);
              return acc;
            }, [])
            .map((para, i) => (
              <p key={i} className="mb-5 text-foreground/90">
                {para.join(". ")}.
              </p>
            ))}
        </article>
      </div>

      {/* ── Tags ── */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-6 border-b border-border">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/15"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Comments ── */}
      <div className="py-6 space-y-4 overflow-visible">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-lg text-foreground">
            Comments ({post.comments.length})
          </h3>
        </div>

        {/* Add comment as admin */}
        <div className="flex gap-3">
          <Input
            placeholder="Reply as Admin..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
            className="flex-1 min-w-0 bg-card"
          />
          <Button
            size="icon"
            variant="default"
            onClick={handleSendComment}
            disabled={!newComment.trim()}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Comment list */}
        {topLevelComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet.
          </p>
        ) : (
          <div className="space-y-3 overflow-visible">
            {topLevelComments.map((comment) => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPostDetail;
