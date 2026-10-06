import api from "@/lib/api";
import { syncServerClock } from "@/lib/serverClock";

export interface NotificationRow {
  id: string;
  user_id: string;
  type:
    | "COLLECTION_REMINDER"
    | "TRUCK_IS_NEAR"
    | "COLLECTION_DONE"
    | "REPORT_UPDATE"
    | "NEW_POST"
    | "ANNOUNCEMENT"
    | "MISSED_COLLECTION"
    | "SYSTEM";
  title: string;
  body: string;
  is_read: boolean | number;
  ref_id?: string | null;
  ref_module?: string | null;
  metadata?: Record<string, unknown> | string | null;
  created_at: string;
}

export interface NotificationsResponse {
  server_time?: string;
  notifications: NotificationRow[];
  total: number;
  limit: number;
  offset: number;
  next_cursor?: string | null;
  unread_count?: number;
  history_total?: number;
  recent_count?: number;
  unread_content_count?: number;
}

export interface NotificationFilters {
  limit?: number;
  offset?: number;
  type?: string;
  is_read?: string;
  cursor?: string;
  category?: "all" | "routes" | "dispatch" | "announcements";
  web_category?: "all" | `admin:${"operations" | "reports" | "content" | "announcements"}` | `resident:${"collection" | "reports" | "content" | "announcements"}`;
}

export const fetchMyNotifications = async (
  params: NotificationFilters = {},
): Promise<NotificationsResponse> => {
  const requestedAt = performance.now();
  const res = await api.get<{ data: NotificationsResponse }>("/notifications", {
    params,
  });
  syncServerClock(res.data.data.server_time, requestedAt);
  return res.data.data;
};

export const fetchUnreadCount = async (): Promise<number> => {
  const res = await api.get<{ data: { unread: number } }>("/notifications/unread-count");
  return res.data.data.unread;
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await api.put(`/notifications/${id}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.put("/notifications/read-all");
};
export const markContentNotificationsAsRead = async (postId: string): Promise<void> => {
  if (!postId?.trim()) throw new Error("A post is required to mark its notifications as read.");
  await api.put("/notifications/read-all", { category: "content", post_id: postId });
};

export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};

export const clearAllNotifications = async (): Promise<void> => {
  await api.delete("/notifications/clear");
};

const notificationsService = {
  fetchMyNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markContentNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
};

export default notificationsService;
