import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Post, statusStyles, categoryStyles } from "./types";
import PostActionsDropdown from "./PostActionsDropdown";
import PostImagePlaceholder from "./PostImagePlaceholder";

interface PostListViewProps {
  posts: Post[];
  onView: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDuplicate: (post: Post) => void;
  onArchive: (post: Post) => void;
  onTogglePublish: (post: Post) => void;
  onToggleFeatured?: (post: Post) => void;
  onDelete: (post: Post) => void;
}

const PostListView = ({
  posts,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onTogglePublish,
  onToggleFeatured,
  onDelete,
}: PostListViewProps) => {
  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
              <TableHead className="w-[42%] text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                Article
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Date
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Views
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Reacts
              </TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider pr-4 w-[80px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => {
              const hasImage = Boolean(
                post.images &&
                  post.images.length > 0 &&
                  typeof post.images[0] === "string" &&
                  post.images[0].trim().length > 0,
              );

              return (
                <TableRow
                  key={post.id}
                  className="cursor-pointer hover:bg-muted/40 dark:hover:bg-muted/25 transition-colors group border-b border-border/50 last:border-0"
                  onClick={() => onView(post)}
                >
                  {/* Article Info with 56x40 Media Thumbnail */}
                  <TableCell className="pl-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail with Featured badge */}
                      <div className="relative w-14 h-10 rounded-xl overflow-hidden shrink-0 border border-border/70 bg-muted/40 shadow-2xs">
                        {hasImage ? (
                          <img
                            src={post.images[0]}
                            alt=""
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <PostImagePlaceholder
                            category={post.category}
                            title={post.title}
                          />
                        )}

                        {post.featured && (
                          <div
                            className="absolute top-1 left-1 w-4 h-4 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-xs"
                            title="Featured on Resident Carousel"
                          >
                            <Sparkles className="w-2.5 h-2.5 fill-white text-white" />
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {post.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="text-[11px] truncate max-w-[160px]">
                            {post.source || post.author || "MENRO Candelaria"}
                          </span>
                          {post.tags && post.tags.length > 0 && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <div className="flex items-center gap-1.5">
                                {post.tags.slice(0, 2).map((tag) => (
                                   <span
                                     key={tag}
                                     className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md border border-primary/20"
                                   >
                                     #{tag.replace(/^#+/, "")}
                                   </span>
                                 ))}
                                 {post.tags.length > 2 && (
                                   <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                                     +{post.tags.length - 2} more
                                   </span>
                                 )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Clean Category Pill (No Icon) */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs pointer-events-none ${
                        categoryStyles[post.category] ||
                        "bg-primary/15 text-primary border-primary/30"
                      }`}
                    >
                      {post.category}
                    </Badge>
                  </TableCell>

                  {/* Clean Status Pill (No Icon) */}
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 shadow-2xs pointer-events-none ${
                        statusStyles[post.status] ||
                        "bg-muted text-foreground border-border"
                      }`}
                    >
                      {post.status}
                    </Badge>
                  </TableCell>

                  {/* Date */}
                  <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {post.status === "Scheduled" && post.scheduledDate
                      ? new Date(post.scheduledDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : post.publishedDate || "—"}
                  </TableCell>

                  {/* Views */}
                  <TableCell className="py-3 text-right text-xs font-semibold tabular-nums text-foreground/80">
                    {post.views.toLocaleString()}
                  </TableCell>

                  {/* Reacts */}
                  <TableCell className="py-3 text-right text-xs font-semibold tabular-nums text-foreground/80">
                    {(post.likes || 0).toLocaleString()}
                  </TableCell>

                  {/* Actions (Single clean 3-dot menu) */}
                  <TableCell className="pr-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end">
                      <PostActionsDropdown
                        post={post}
                        onView={onView}
                        onEdit={onEdit}
                        onDuplicate={onDuplicate}
                        onArchive={onArchive}
                        onTogglePublish={onTogglePublish}
                        onToggleFeatured={onToggleFeatured}
                        onDelete={onDelete}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PostListView;
