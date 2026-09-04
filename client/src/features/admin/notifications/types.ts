export type AdminNotificationType =
  | "new-report"
  | "stale-report"
  | "announcement-sent"
  | "new-resident"
  | "truck-inactive"
  | "driver-message"
  | "missing-route"
  | "failed-login"
  | "driver-offline";

export type AdminNotificationCategory = "all" | "reports" | "operations" | "content" | "system";

export const categoryForType: Record<AdminNotificationType, AdminNotificationCategory> = {
  "new-report": "reports",
  "stale-report": "reports",
  "announcement-sent": "content",
  "new-resident": "system",
  "truck-inactive": "operations",
  "driver-message": "operations",
  "missing-route": "operations",
  "failed-login": "system",
  "driver-offline": "system",
};

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  module: string;
  link?: string;
}
