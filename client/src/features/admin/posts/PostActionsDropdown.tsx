import {
  Archive,
  ArchiveRestore,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Post } from "./types";

interface PostActionsDropdownProps {
  post: Post;
  onView: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDuplicate: (post: Post) => void;
  onArchive: (post: Post) => void;
  onTogglePublish: (post: Post) => void;
  onToggleFeatured?: (post: Post) => void;
  onDelete: (post: Post) => void;
}

const PostActionsDropdown = ({
  post,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onTogglePublish,
  onToggleFeatured,
  onDelete,
}: PostActionsDropdownProps) => {
  const isArchived = post.status === "Archived";
  const isPublished = post.status === "Published";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 rounded-xl cursor-pointer"
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl border-border/80 p-1 shadow-md">
        <DropdownMenuItem
          onClick={() => onView(post)}
          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2"
        >
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onEdit(post)}
          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2"
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDuplicate(post)}
          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2"
        >
          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          Duplicate
        </DropdownMenuItem>
        {onToggleFeatured && !isArchived && (
          <DropdownMenuItem
            onClick={() => onToggleFeatured(post)}
            className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2"
          >
            {post.featured ? (
              <StarOff className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <Star className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {post.featured ? "Unfeature" : "Feature Post"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={() => onArchive(post)}
          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2"
        >
          {isArchived ? (
            <ArchiveRestore className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Archive className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          {isArchived ? "Restore" : "Archive"}
        </DropdownMenuItem>
        {!isArchived && (
          <DropdownMenuItem
            onClick={() => onTogglePublish(post)}
            className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2"
          >
            <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
            {isPublished ? "Unpublish" : "Publish"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={() => onDelete(post)}
          className="text-xs font-medium text-destructive focus:text-destructive cursor-pointer rounded-lg px-2.5 py-1.5 flex items-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PostActionsDropdown;
