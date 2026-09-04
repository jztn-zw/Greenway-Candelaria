import {
  MoreHorizontal, Eye, Edit2, Copy, Archive, ArchiveRestore, Globe, GlobeLock, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Post } from "./types";

interface PostActionsDropdownProps {
  post: Post;
  onView: (post: Post) => void;
  onEdit: (post: Post) => void;
  onDuplicate: (post: Post) => void;
  onArchive: (post: Post) => void;
  onTogglePublish: (post: Post) => void;
  onDelete: (post: Post) => void;
}

const PostActionsDropdown = ({
  post, onView, onEdit, onDuplicate, onArchive, onTogglePublish, onDelete,
}: PostActionsDropdownProps) => {
  const isArchived = post.status === "Archived";
  const isPublished = post.status === "Published";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onView(post)} className="gap-2 text-xs">
          <Eye className="w-3.5 h-3.5" /> View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(post)} className="gap-2 text-xs">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(post)} className="gap-2 text-xs">
          <Copy className="w-3.5 h-3.5" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onArchive(post)} className="gap-2 text-xs">
          {isArchived ? (
            <><ArchiveRestore className="w-3.5 h-3.5" /> Restore</>
          ) : (
            <><Archive className="w-3.5 h-3.5" /> Archive</>
          )}
        </DropdownMenuItem>
        {!isArchived && (
          <DropdownMenuItem onClick={() => onTogglePublish(post)} className="gap-2 text-xs">
            {isPublished ? (
              <><GlobeLock className="w-3.5 h-3.5" /> Unpublish</>
            ) : (
              <><Globe className="w-3.5 h-3.5" /> Publish</>
            )}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(post)}
          className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PostActionsDropdown;
