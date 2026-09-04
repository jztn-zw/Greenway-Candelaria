export interface PostItem {
  id: string;
  title: string;
  body: string;
  source?: string;
  category: "WASTE_TIP" | "EVENT" | string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
  is_featured: boolean | number;
  view_count: number;
  like_count: number;
  is_liked: boolean;
  scheduled_at?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at?: string;
  author_name?: string;
  author_avatar?: string;
  images: string[];
  tags: string[];
}

export function formatCategory(cat: string): string {
  switch (cat) {
    case "WASTE_TIP":
      return "Waste Tip";
    case "EVENT":
      return "Community Event";
    case "NEWS":
      return "News & Advisory";
    case "ANNOUNCEMENT":
      return "Announcement";
    default:
      return cat ? cat.replace(/_/g, " ") : "Update";
  }
}

export function getCategoryBadgeStyle(cat: string): { bg: string; text: string; border: string } {
  switch (cat) {
    case "WASTE_TIP":
      return {
        bg: "bg-background/95 dark:bg-zinc-900/90 backdrop-blur-md shadow-xs",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-500/50 dark:border-emerald-400/40",
      };
    case "EVENT":
      return {
        bg: "bg-background/95 dark:bg-zinc-900/90 backdrop-blur-md shadow-xs",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-500/50 dark:border-amber-400/40",
      };
    case "NEWS":
    case "ANNOUNCEMENT":
      return {
        bg: "bg-background/95 dark:bg-zinc-900/90 backdrop-blur-md shadow-xs",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-500/50 dark:border-blue-400/40",
      };
    default:
      return {
        bg: "bg-background/95 dark:bg-zinc-900/90 backdrop-blur-md shadow-xs",
        text: "text-primary dark:text-emerald-300",
        border: "border-primary/50 dark:border-primary/40",
      };
  }
}

export function getReadingTime(text: string = ""): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

export function parsePostDate(dateStr?: string | null): {
  month: string;
  day: string;
  formatted: string;
} {
  if (!dateStr) {
    return { month: "—", day: "—", formatted: "Recent" };
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return {
        month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
        day: d.getDate().toString(),
        formatted: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
    }
  } catch {}

  const match = String(dateStr).match(/([a-zA-Z]+)\s+(\d+),\s*(\d+)/);
  if (match) {
    const month = match[1].slice(0, 3).toUpperCase();
    const day = match[2];
    return {
      month,
      day,
      formatted: `${match[1].slice(0, 3)} ${day}, ${match[3]}`,
    };
  }

  return { month: "—", day: "—", formatted: dateStr };
}

