export type NotificationType =
  | "collection-reminder"
  | "truck-near"
  | "collection-done"
  | "schedule-change"
  | "system-announcement"
  | "missed-collection"
  | "report-update"
  | "new-content";

export type NotificationCategory = "all" | "collection" | "reports" | "content" | "announcements";

export interface ResidentNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  /** Extra payload for modals */
  details?: string;
}

export const categoryForType: Record<NotificationType, NotificationCategory> = {
  "collection-reminder": "collection",
  "truck-near": "collection",
  "collection-done": "collection",
  "schedule-change": "collection",
  "missed-collection": "collection",
  "system-announcement": "announcements",
  "report-update": "reports",
  "new-content": "content",
};
