export type NotificationType =
  | "collection-reminder"
  | "truck-near"
  | "collection-done"
  | "schedule-change"
  | "schedule-event"
  | "system-announcement"
  | "announcement"
  | "system"
  | "missed-collection"
  | "report-update"
  | "new-content";

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
