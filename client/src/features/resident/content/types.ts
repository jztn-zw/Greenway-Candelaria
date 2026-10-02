import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { formatManilaDateTime, parseApiTimestamp } from "@/utils/date";

export interface PostItem {
  id: string;
  title: string;
  body: string;
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

export function getCategoryBadgeStyle(cat: string): { bg: string; text: string; border: string; dot: string } {
  return getCategoryBadgeColors(cat);
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
  const date = parseApiTimestamp(dateStr);
  if (date) {
    return {
      month: formatManilaDateTime(date, { month: "short" }).toUpperCase(),
      day: formatManilaDateTime(date, { day: "numeric" }),
      formatted: formatManilaDateTime(date, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  }

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

