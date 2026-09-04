export type PostCategory = "Waste Tip" | "Event";
export type PostStatus = "Draft" | "Published" | "Scheduled" | "Unpublished" | "Archived";

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
  likes: number;
  tags: string[];
  images: string[];
  scheduledDate: string | null;
}

export const statusStyles: Record<PostStatus, string> = {
  Published: "bg-background/95 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 dark:border-emerald-400/40 backdrop-blur-md shadow-2xs",
  Draft: "bg-background/95 dark:bg-zinc-900/90 text-slate-700 dark:text-slate-300 border-slate-500/40 dark:border-slate-500/40 backdrop-blur-md shadow-2xs",
  Scheduled: "bg-background/95 dark:bg-zinc-900/90 text-amber-700 dark:text-amber-300 border-amber-500/50 dark:border-amber-400/40 backdrop-blur-md shadow-2xs",
  Archived: "bg-background/95 dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 border-zinc-400/40 dark:border-zinc-700 backdrop-blur-md shadow-2xs",
  Unpublished: "bg-background/95 dark:bg-zinc-900/90 text-destructive dark:text-rose-400 border-destructive/50 dark:border-destructive/40 backdrop-blur-md shadow-2xs",
};

export const categoryStyles: Record<string, string> = {
  "Waste Tip": "bg-background/95 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 dark:border-emerald-400/40 backdrop-blur-md shadow-2xs",
  Event: "bg-background/95 dark:bg-zinc-900/90 text-amber-700 dark:text-amber-300 border-amber-500/50 dark:border-amber-400/40 backdrop-blur-md shadow-2xs",
};
