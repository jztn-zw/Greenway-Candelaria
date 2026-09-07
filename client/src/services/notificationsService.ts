import api from "@/lib/api";

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
  notifications: NotificationRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface SendNotificationPayload {
  user_ids: string[];
  type: NotificationRow["type"];
  title: string;
  body: string;
  ref_id?: string | null;
  ref_module?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const fetchMyNotifications = async (
  params: { limit?: number; offset?: number; type?: string; is_read?: string } = {},
): Promise<NotificationsResponse> => {
  const res = await api.get<{ data: NotificationsResponse }>("/notifications", {
    params,
  });
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

export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/notifications/${id}`);
};

export const clearAllNotifications = async (): Promise<void> => {
  await api.delete("/notifications/clear");
};

export const sendNotification = async (
  payload: SendNotificationPayload,
): Promise<void> => {
  await api.post("/notifications/send", payload);
};

const notificationsService = {
  fetchMyNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  sendNotification,
};

export default notificationsService;
