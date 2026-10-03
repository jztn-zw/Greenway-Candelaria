import { Calendar, Check, Eye, Heart, Share2, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostMetadataProps {
  date?: string | null;
  author?: string | null;
  views?: number;
  reactions?: number;
}

export function PostMetadata({ date, author, views, reactions }: PostMetadataProps) {
  const authorName = author || "MENRO Candelaria";
  return (
    <div className="community-post-metadata flex min-w-0 flex-col items-start gap-3 text-left text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="community-post-metadata-primary flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {date || "Just now"}
        </span>
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5" title={authorName}>
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{authorName}</span>
        </span>
      </div>
      {(views !== undefined || reactions !== undefined) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {views !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
              <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span><span className="font-semibold tabular-nums text-foreground">{views.toLocaleString()}</span>{" "}{views === 1 ? "view" : "views"}</span>
            </span>
          )}
          {reactions !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
              <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span><span className="font-semibold tabular-nums text-foreground">{reactions.toLocaleString()}</span>{" "}{reactions === 1 ? "reaction" : "reactions"}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface PostActionsProps {
  reactionCount: number;
  isLiked?: boolean;
  reactionPending?: boolean;
  linkCopied?: boolean;
  preview?: boolean;
  onToggleReaction?: () => void;
  onShare?: () => void;
}

export function PostActions({ reactionCount, isLiked = false, reactionPending = false, linkCopied = false, preview = false, onToggleReaction, onShare }: PostActionsProps) {
  const buttonClass = "h-8 max-w-full gap-1.5 px-2 py-1.5 text-[11px] md:h-9 md:px-3 md:py-2 md:text-xs [&_svg]:size-3 md:[&_svg]:size-3.5";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={isLiked ? "destructive-outline" : "outline"}
        className={buttonClass}
        onClick={onToggleReaction}
        disabled={preview || reactionPending || !onToggleReaction}
        aria-label={isLiked ? "Remove reaction" : "React to post"}
        aria-pressed={isLiked}
        aria-busy={reactionPending}
        title={preview ? "Reactions are unavailable in preview" : undefined}
      >
        <Heart className={isLiked ? "fill-current" : undefined} aria-hidden="true" />
        <span className="min-w-0 truncate"><span className="tabular-nums">{reactionCount.toLocaleString()}</span>{" "}{reactionCount === 1 ? "reaction" : "reactions"}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className={buttonClass}
        onClick={onShare}
        disabled={preview || !onShare}
        title={preview ? "Sharing is unavailable in preview" : undefined}
      >
        {linkCopied ? <Check className="text-primary" aria-hidden="true" /> : <Share2 aria-hidden="true" />}
        <span aria-live="polite" className={`min-w-0 truncate ${linkCopied ? "text-primary" : ""}`}>{linkCopied ? "Link copied" : "Share post"}</span>
      </Button>
    </div>
  );
}
