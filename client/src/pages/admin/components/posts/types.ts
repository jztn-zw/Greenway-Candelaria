export type PostCategory = "Waste Tip" | "Event";
export type PostStatus = "Draft" | "Published" | "Scheduled" | "Unpublished" | "Archived";

export interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
  parentId?: string;
  likes: number;
}

export interface Post {
  id: string;
  title: string;
  body: string;
  source: string;
  category: PostCategory;
  status: PostStatus;
  featured: boolean;
  author: string;
  publishedDate: string | null;
  lastEdited: string;
  views: number;
  commentCount: number;
  tags: string[];
  images: string[];
  scheduledDate: string | null;
  commentsEnabled: boolean;
  comments: Comment[];
}

export const statusStyles: Record<PostStatus, string> = {
  Draft: "bg-muted/90 text-foreground border-border backdrop-blur-sm",
  Published: "bg-emerald-500/90 text-white border-emerald-400/50 backdrop-blur-sm",
  Scheduled: "bg-amber-500/90 text-white border-amber-400/50 backdrop-blur-sm",
  Unpublished: "bg-destructive/90 text-white border-destructive/50 backdrop-blur-sm",
  Archived: "bg-muted/90 text-muted-foreground border-border backdrop-blur-sm",
};

export const categoryStyles: Record<PostCategory, string> = {
  "Waste Tip": "bg-[hsl(var(--forest))]/90 text-white border-[hsl(var(--forest))]/50 backdrop-blur-sm",
  Event: "bg-primary/90 text-primary-foreground border-primary/50 backdrop-blur-sm",
};

// types.ts

export const getReadingTime = (body: string): string => {
  const text = body.trim();
  if (!text) return "0 min read";

  const words = text.split(/\s+/).length;
  const wordsPerMinute = 200;
  const totalMinutes = words / wordsPerMinute;

  if (totalMinutes < 1) {
    const seconds = Math.max(5, Math.floor(totalMinutes * 60));
    const roundedSeconds = Math.ceil(seconds / 5) * 5;
    return `${roundedSeconds} sec read`;
  }

  const mins = Math.ceil(totalMinutes);
  return `${mins} min read`;
};
