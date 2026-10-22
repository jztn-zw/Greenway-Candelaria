import LoadingImage from "@/components/common/LoadingImage";
import { formatManilaDateTime } from "@/utils/date";
import { Star, Eye, Heart, ChevronRight } from "lucide-react";
import { adminCommunityStyles as postStyles } from "@/components/common/communityContentStyles";
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
    <>
    <div className={postStyles.compactList}>
      {posts.map((post) => (
        <article key={post.id} className={postStyles.listRow}>
          <div className="flex min-w-0 items-start gap-2">
            <button type="button" onClick={() => onView(post)} aria-label={`View post: ${post.title}`}
              className="min-w-0 flex-1 text-left rounded-lg cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
              <span className="flex min-w-0 items-start justify-between gap-2">
                <span className="gw-heading min-w-0 break-words [overflow-wrap:anywhere] text-sm text-foreground line-clamp-2">{post.title}</span>
                <ChevronRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">{post.author}</span>
            </button>
            <PostActionsDropdown post={post} onView={onView} onEdit={onEdit} onDuplicate={onDuplicate}
              onArchive={onArchive} onTogglePublish={onTogglePublish} onToggleFeatured={onToggleFeatured} onDelete={onDelete} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={`text-ui-overline pointer-events-none ${categoryStyles[post.category]}`}>{post.category}</Badge>
            <Badge variant="outline" className={`text-ui-overline pointer-events-none ${statusStyles[post.status]}`}>{post.status}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 pt-2 text-ui-caption text-muted-foreground">
            <span className="min-w-0 break-words">{post.status === "Scheduled" && post.scheduledDate
              ? formatManilaDateTime(post.scheduledDate, { month: "short", day: "numeric", year: "numeric" })
              : post.publishedDate || "Not published"}</span>
            <span className="ml-auto inline-flex items-center gap-1" aria-label={`${post.views} views`}><Eye aria-hidden="true" className="size-3.5" />{post.views.toLocaleString()}</span>
            <span className="inline-flex items-center gap-1" aria-label={`${post.likes || 0} reactions`}><Heart aria-hidden="true" className="size-3.5" />{(post.likes || 0).toLocaleString()}</span>
          </div>
        </article>
      ))}
    </div>
    <div className={postStyles.table}>
      <div className="overflow-x-auto">
        <Table className="min-w-[850px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
              <TableHead className="w-[42%] text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                Post
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
                          <LoadingImage
                            src={post.images[0]}
                            alt=""
                            className="w-full h-full object-cover object-center transition-transform duration-300"
                          />
                        ) : (
                          <PostImagePlaceholder
                            category={post.category}
                            title={post.title}
                            compact
                          />
                        )}

                        {post.featured && (
                          <div
                            className="absolute top-1 left-1 w-4 h-4 rounded-full bg-amber-500/90 text-white flex items-center justify-center shadow-xs"
                            title="Featured on Resident Carousel"
                          >
                            <Star className="w-2.5 h-2.5 fill-current" />
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {post.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="text-ui-caption truncate max-w-[160px]">
                            {post.author || "MENRO Candelaria"}
                          </span>
                          {post.tags && post.tags.length > 0 && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <div className="flex items-center gap-1.5">
                                {post.tags.slice(0, 2).map((tag) => (
                                   <span
                                     key={tag}
                                     className="text-ui-overline bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md border border-primary/20"
                                   >
                                     #{tag.replace(/^#+/, "")}
                                   </span>
                                 ))}
                                 {post.tags.length > 2 && (
                                   <span className="inline-flex items-center text-ui-overline font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
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
                      className={`text-xs font-semibold border rounded-md px-2.5 py-0.5 shadow-2xs pointer-events-none ${
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
                      className={`text-xs font-semibold border rounded-md px-2.5 py-0.5 shadow-2xs pointer-events-none ${
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
                      ? formatManilaDateTime(post.scheduledDate, {
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
    </>
  );
};

export default PostListView;
