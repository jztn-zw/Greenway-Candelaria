import { Eye, Clock, Star, Calendar, Leaf, CalendarDays, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Post, statusStyles, categoryStyles, getReadingTime } from "./types";
import PostActionsDropdown from "./PostActionsDropdown";

interface PostCardProps {
  post: Post;
  onView: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDuplicate: (post: Post) => void;
  onArchive: (post: Post) => void;
  onTogglePublish: (post: Post) => void;
  onDelete: (post: Post) => void;
}

const PostCard = ({
  post, onView, onEdit, onDuplicate, onArchive, onTogglePublish, onDelete,
}: PostCardProps) => {
  const isEvent = post.category === "Event";

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden flex flex-col group hover:shadow-lg hover:border-border/80 transition-all duration-300 cursor-pointer"
      onClick={() => onView(post)}
    >
      {/* Card header */}
      <div className="h-40 sm:h-44 relative overflow-hidden">
        {post.images && post.images.length > 0 ? (
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className={`absolute inset-0 ${isEvent ? "bg-gradient-to-br from-primary via-primary/80 to-primary/60" : "bg-gradient-to-br from-[hsl(var(--forest))] via-[hsl(var(--forest))]/80 to-[hsl(var(--leaf))]/60"} group-hover:scale-105 transition-transform duration-500 origin-center`}
          >
            {/* Decorative shapes */}
            <div
              className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${isEvent ? "bg-primary-foreground/10" : "bg-white/10"}`}
            />
            <div
              className={`absolute right-8 -top-4 w-16 h-16 rounded-full ${isEvent ? "bg-primary-foreground/[0.07]" : "bg-white/[0.07]"}`}
            />
            <div
              className={`absolute left-1/2 bottom-2 w-10 h-10 rotate-45 ${isEvent ? "bg-primary-foreground/[0.05]" : "bg-white/[0.05]"}`}
            />
          </div>
        )}
        {/* Overlay for image cards */}
        {post.images && post.images.length > 0 && (
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
        )}

        {/* Floating badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge
            className={`text-[10px] font-semibold border shadow-sm ${categoryStyles[post.category]}`}
          >
            {post.category}
          </Badge>
          <Badge
            className={`text-[10px] font-semibold border shadow-sm ${statusStyles[post.status]}`}
          >
            {post.status}
          </Badge>
        </div>
        {post.featured && (
          <div className="absolute top-3 right-3">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow" />
          </div>
        )}
        {post.status === "Scheduled" && post.scheduledDate && (
          <div className="absolute bottom-3 left-3">
            <span className="text-[10px] font-medium text-foreground bg-card/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1 shadow-sm">
              <Calendar className="w-3 h-3" />
              {new Date(post.scheduledDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 space-y-2.5">
        <h3 className="font-display text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-2">
          {post.title}
        </h3>
        {post.source && (
          <p className="text-[10px] text-muted-foreground/70 italic line-clamp-1">
            {post.source}
          </p>
        )}
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {post.body}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-md border border-primary/15"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}
        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-2 border-t border-border">
          <span className="font-medium text-foreground">{post.author}</span>
          {post.publishedDate && <span>{post.publishedDate}</span>}
          <div className="flex items-center gap-2.5 ml-auto">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" /> {post.views}
            </span>
            <span className="flex items-center gap-0.5" title="Total Comments">
              <MessageCircle className="w-3 h-3" />{" "}
              {post.commentCount}
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> {getReadingTime(post.body)}
            </span>
          </div>
        </div>
        {/* Actions */}
        <div
          className="flex items-center justify-end pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <PostActionsDropdown
            post={post}
            onView={onView}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onTogglePublish={onTogglePublish}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default PostCard;
