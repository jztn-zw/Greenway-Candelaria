import api from "@/lib/api";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  ref_id?: string | null;
  ref_module?: string | null;
  created_at: string;
}

export interface SendNotificationPayload {
  user_ids: string[];
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
  ref_id?: string | null;
  ref_module?: string | null;
}

export const fetchMyNotifications = async (
  limit = 10,
): Promise<NotificationRow[]> => {
  const res = await api.get<{ data: NotificationRow[] }>("/notifications", {
    params: { limit },
  });
  return res.data.data ?? [];
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
  await api.put(`/notifications/${id}/read`);
};

export const sendNotification = async (
  payload: SendNotificationPayload,
): Promise<void> => {
  await api.post("/notifications/send", payload);
};
