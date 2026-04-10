export type CollectorNotificationType =
  | "admin-message"
  | "route-alert"
  | "skip-acknowledged"
  | "route-completed"
  | "system-alert";

export type CollectorNotificationCategory = "all" | "operations" | "routes" | "system";

export const categoryForType: Record<CollectorNotificationType, CollectorNotificationCategory> = {
  "admin-message": "operations",
  "route-alert": "routes",
  "skip-acknowledged": "routes",
  "route-completed": "routes",
  "system-alert": "system",
};

export interface CollectorNotification {
  id: string;
  type: CollectorNotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  /** Extra payload for modals */
  details?: string;
}
