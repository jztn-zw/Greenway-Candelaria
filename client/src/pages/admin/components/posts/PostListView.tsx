import { Eye, Clock, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Post, statusStyles, categoryStyles, getReadingTime } from "./types";
import PostActionsDropdown from "./PostActionsDropdown";

interface PostListViewProps {
  posts: Post[];
  onView: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDuplicate: (post: Post) => void;
  onArchive: (post: Post) => void;
  onTogglePublish: (post: Post) => void;
  onDelete: (post: Post) => void;
}

const PostListView = ({
  posts,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onTogglePublish,
  onDelete,
}: PostListViewProps) => {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[35%]">Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">
              <span className="flex items-center justify-end gap-1">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" /> Views
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="flex items-center justify-end gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-primary/80" />{" "}
                Comments
              </span>
            </TableHead>
            <TableHead className="text-right">
              <span className="flex items-center justify-end gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Read
              </span>
            </TableHead>
            <TableHead className="text-right w-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => (
            <TableRow
              key={post.id}
              className="cursor-pointer hover:bg-muted/30 group"
              onClick={() => onView(post)}
            >
              <TableCell>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {post.title}
                  </p>
                  {post.source && (
                    <p className="text-[10px] text-muted-foreground/70 italic line-clamp-1">
                      {post.source}
                    </p>
                  )}
                  <div className="flex gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded-md border border-primary/15"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${categoryStyles[post.category]}`}
                >
                  {post.category}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${statusStyles[post.status]}`}
                >
                  {post.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {post.status === "Scheduled" && post.scheduledDate
                  ? new Date(post.scheduledDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : post.publishedDate || "—"}
              </TableCell>
              <TableCell className="text-right text-sm font-medium tabular-nums text-foreground">
                {post.views.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-sm font-medium tabular-nums text-foreground">
                {post.commentCount || 0}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {getReadingTime(post.body)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PostListView;
