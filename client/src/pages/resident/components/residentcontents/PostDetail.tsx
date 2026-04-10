import { useState, useRef } from "react";
import {
  ArrowLeft, Heart, MessageCircle, Bookmark, Share2, Clock, Calendar, Send, User,
  Trash2, Edit2, X, CornerDownRight, MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContentPost, estimateReadingTime, formatEventDate, isEventPast } from "./contentData";

export interface PostComment {
  id: string;
  author: string;
  text: string;
  date: string;
  isOwn: boolean;
  parentId?: string;
  likes: number;
}

interface PostDetailProps {
  post: ContentPost;
  onBack: () => void;
  relatedPosts: ContentPost[];
  onOpenPost: (post: ContentPost) => void;
  isLiked: boolean;
  isSaved: boolean;
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
}

const CURRENT_USER = "You";

function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Handle relative strings like "2 days ago", "Just now"
      return dateStr;
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

const PostDetail = ({
  post, onBack, relatedPosts, onOpenPost, isLiked, isSaved, onToggleLike, onToggleSave,
}: PostDetailProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const readingTime = estimateReadingTime(post.body);

  // Comments state
  const [comments, setComments] = useState<PostComment[]>(() => {
    const seeds: PostComment[] = [];
    if (post.comments > 0) {
      const mockComments = [
        { author: "Maria Santos", text: "Very helpful tips! Thanks for sharing.", date: "2 days ago", likes: 3 },
        { author: "Juan Dela Cruz", text: "We should share this to more barangays!", date: "1 day ago", likes: 1 },
        { author: "Ana Reyes", text: "Great initiative! Count me in.", date: "5 hours ago", likes: 2 },
      ];
      for (let i = 0; i < Math.min(post.comments, mockComments.length); i++) {
        seeds.push({ id: `seed-${i}`, ...mockComments[i], isOwn: false });
      }
    }
    return seeds;
  });
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: PostComment = {
      id: `c-${Date.now()}`,
      author: CURRENT_USER,
      text: newComment.trim(),
      date: "Just now",
      isOwn: true,
      likes: 0,
    };
    setComments((prev) => [...prev, comment]);
    setNewComment("");
  };

  const handleDeleteComment = (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
  };

  const handleEditComment = (id: string) => {
    if (!editText.trim()) return;
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, text: editText.trim() } : c));
    setEditingId(null);
    setEditText("");
  };

  const handleReply = (parentId: string) => {
    if (!replyText.trim()) return;
    const reply: PostComment = {
      id: `r-${Date.now()}`,
      author: CURRENT_USER,
      text: replyText.trim(),
      date: "Just now",
      isOwn: true,
      parentId,
      likes: 0,
    };
    setComments((prev) => [...prev, reply]);
    setReplyText("");
    setReplyingTo(null);
  };

  const toggleLikeComment = (commentId: string) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: post.title, text: post.description, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const isPast = isEventPast(post.eventDate);
  const evtDate = post.eventDate ? formatEventDate(post.eventDate) : null;

  const topLevelComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const renderComment = (comment: PostComment, isReply = false) => {
    const isLikedComment = likedComments.has(comment.id);
    const likeCount = comment.likes + (isLikedComment ? 1 : 0);

    return (
      <div key={comment.id} className={`${isReply ? "ml-8 border-l-2 border-primary/10 pl-4" : ""}`}>
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 group/comment">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {comment.author}
                  {comment.isOwn && (
                    <span className="ml-1.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">You</span>
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground">{formatRelativeDate(comment.date)}</span>
              </div>
              {editingId === comment.id ? (
                <div className="ml-9 mt-2 flex gap-2">
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEditComment(comment.id)}
                    className="flex-1 h-8 text-sm bg-background"
                    autoFocus
                  />
                  <Button size="sm" variant="default" className="h-8" onClick={() => handleEditComment(comment.id)}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditingId(null); setEditText(""); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2 ml-9">{comment.text}</p>
              )}
            </div>
            {/* 3-dot menu for own comments */}
            {comment.isOwn && editingId !== comment.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 opacity-0 group-hover/comment:opacity-100 transition-all text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onClick={() => { setEditingId(comment.id); setEditText(comment.text); }}
                    className="gap-2 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDeleteComment(comment.id)}
                    className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Like & Reply actions */}
          {editingId !== comment.id && (
            <div className="ml-9 flex items-center gap-3">
              <button
                onClick={() => toggleLikeComment(comment.id)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${isLikedComment ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Heart className={`w-3.5 h-3.5 ${isLikedComment ? "fill-destructive" : ""}`} />
                {likeCount > 0 && likeCount}
              </button>
              {replyingTo === comment.id ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReply(comment.id)}
                    className="flex-1 h-8 text-sm bg-background"
                    autoFocus
                  />
                  <Button size="sm" variant="default" className="h-8" onClick={() => handleReply(comment.id)} disabled={!replyText.trim()}>
                    <Send className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => { setReplyingTo(null); setReplyText(""); }}>
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

        {/* Replies */}
        {getReplies(comment.id).length > 0 && (
          <div className="mt-2 space-y-2">
            {getReplies(comment.id).map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-0">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Content
      </button>

      {/* Hero image */}
      <div className="rounded-2xl overflow-hidden relative bg-card">
        {post.images.length > 0 ? (
          <div className="relative w-full min-h-[280px] max-h-[520px]">
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-60"
              style={{ backgroundImage: `url(${post.images[0]})` }}
            />
            <img
              src={post.images[0]}
              alt={post.title}
              className="relative w-full h-full object-contain max-h-[520px] z-10"
            />
          </div>
        ) : (
          <div className="w-full h-56 bg-gradient-to-br from-muted/50 to-muted" />
        )}
        <div className="absolute top-3 left-3 z-20">
          <Badge className="text-xs font-semibold bg-background/90 backdrop-blur-sm text-foreground border-border shadow-sm">
            {post.badge}
          </Badge>
        </div>
        {post.badge === "Event" && evtDate && (
          <div className="absolute top-3 right-3 z-20 bg-background/95 backdrop-blur rounded-xl p-2.5 text-center shadow-lg min-w-[56px]">
            <span className="block text-[10px] font-bold text-primary tracking-wider">{evtDate.month}</span>
            <span className="block text-xl font-display font-black text-foreground leading-none">{evtDate.day}</span>
            {isPast && <span className="block text-[9px] font-semibold text-destructive mt-0.5">PAST</span>}
          </div>
        )}
      </div>

      {/* Title & source */}
      <div className="pt-5 space-y-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-foreground tracking-tight leading-tight">
          {post.title}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
          {post.description}
        </p>
      </div>

      {/* Meta bar */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 py-4 border-b border-border text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> {post.author}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> {post.date}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> {readingTime} min read
        </span>
        {post.source && (
          <span className="text-xs text-muted-foreground/70 basis-full sm:basis-auto">{post.source}</span>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 py-3 border-b border-border">
        <Button
          variant="ghost" size="sm"
          onClick={() => onToggleLike(post.id)}
          className={`gap-1.5 ${isLiked ? "text-destructive" : "text-muted-foreground"}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-destructive" : ""}`} />
          {post.likes + (isLiked ? 1 : 0)}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <MessageCircle className="w-4 h-4" /> {comments.length}
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost" size="icon"
          onClick={() => onToggleSave(post.id)}
          className={isSaved ? "text-primary" : "text-muted-foreground"}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? "fill-primary" : ""}`} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleShare} className="text-muted-foreground">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Body */}
      <div ref={contentRef} className="py-8">
        <article className="prose prose-sm sm:prose-base max-w-none text-foreground leading-[1.8]">
          {post.body.split(". ").reduce<string[][]>((acc, sentence, i) => {
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
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-6 border-b border-border">
          {post.tags.map((tag) => (
            <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/15">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Comments section */}
      <div className="py-6 space-y-4 border-b border-border">
        <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Comments ({comments.length})
        </h3>

        {/* Add comment */}
        <div className="flex gap-3">
          <Input
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            className="flex-1 bg-card"
          />
          <Button size="icon" variant="default" onClick={handleAddComment} disabled={!newComment.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Comments list */}
        {topLevelComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Be the first to comment on this post!
          </p>
        ) : (
          <div className="space-y-3">
            {topLevelComments.map((comment) => renderComment(comment))}
          </div>
        )}
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="py-8 space-y-4">
          <h3 className="font-display font-bold text-lg text-foreground">Related Posts</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedPosts.map((rp) => (
              <button
                key={rp.id}
                onClick={() => onOpenPost(rp)}
                className="text-left rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all duration-300 group"
              >
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 mb-2">
                  {rp.badge}
                </Badge>
                <h4 className="font-display text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                  {rp.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{rp.description}</p>
                <span className="text-[11px] text-muted-foreground/70 mt-2 block">{rp.date}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetail;
