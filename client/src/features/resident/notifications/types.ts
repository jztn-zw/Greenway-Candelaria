export type NotificationType =
  | "collection-reminder"
  | "truck-near"
  | "collection-done"
  | "schedule-change"
  | "system-announcement"
  | "announcement"
  | "system"
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
  created_at?: string;
  read: boolean;
  /** Extra payload for modals */
  details?: string;
}