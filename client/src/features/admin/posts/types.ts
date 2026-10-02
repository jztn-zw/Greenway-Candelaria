import { getStatusBadgeStyle, getCategoryBadgeColors } from "@/components/ui/badgeStyles";
export type PostCategory = "Waste Tip" | "Event";
export type PostStatus = "Draft" | "Published" | "Scheduled" | "Unpublished" | "Archived";

export interface Post {
  id: string;
  title: string;
  body: string;
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
  Published: getStatusBadgeStyle("Published").className,
  Draft: getStatusBadgeStyle("Draft").className,
  Scheduled: getStatusBadgeStyle("Scheduled").className,
  Archived: getStatusBadgeStyle("Archived").className,
  Unpublished: getStatusBadgeStyle("Unpublished").className,
};

export const categoryStyles: Record<string, string> = {
  "Waste Tip": getCategoryBadgeColors("Waste Tip").className,
  Event: getCategoryBadgeColors("Event").className,
};
