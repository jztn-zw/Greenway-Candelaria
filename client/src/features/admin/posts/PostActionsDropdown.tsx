import { MoreHorizontal } from "lucide-react";
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
          className="h-8 w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl border-border/80 p-1 shadow-md">
        <DropdownMenuItem
          onClick={() => onView(post)}
          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
        >
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onEdit(post)}
          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDuplicate(post)}
          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
        >
          Duplicate
        </DropdownMenuItem>
        {onToggleFeatured && !isArchived && (
          <DropdownMenuItem
            onClick={() => onToggleFeatured(post)}
            className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
          >
            {post.featured ? "Unfeature" : "Feature Post"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={() => onArchive(post)}
          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
        >
          {isArchived ? "Restore" : "Archive"}
        </DropdownMenuItem>
        {!isArchived && (
          <DropdownMenuItem
            onClick={() => onTogglePublish(post)}
            className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
          >
            {isPublished ? "Unpublish" : "Publish"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={() => onDelete(post)}
          className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PostActionsDropdown;
