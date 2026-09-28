import { useResidentMutation, useResidentQuery } from "@/lib/residentQuery";
import { toast } from "@/lib/toast";
import notificationsService from "@/services/notificationsService";
import { useCallback } from "react";

const fetchHistory = async () => {
  const first = await notificationsService.fetchMyNotifications({ limit: 100 });
  const notifications = [...first.notifications];
  // Bounded pages rather than starting an unbounded number of parallel requests.
  for (let offset = first.notifications.length; offset < first.total; offset += 100) {
    const page = await notificationsService.fetchMyNotifications({ limit: 100, offset });
    if (!page.notifications.length) break;
    notifications.push(...page.notifications);
  }
  return [...new Map(notifications.map((item) => [item.id, item])).values()];
};

const useResidentNotifications = () => {
  const query = useResidentQuery("notifications", ["history"], fetchHistory);
  const markRead = useResidentMutation(notificationsService.markNotificationAsRead, "notifications");
  const markAll = useResidentMutation(notificationsService.markAllNotificationsAsRead, "notifications");
  const clear = useResidentMutation(notificationsService.clearAllNotifications, "notifications");
  const markAsRead = useCallback(async (id: string) => {
    try { await markRead(id); } catch { toast.error("Could not mark notification as read"); }
  }, [markRead]);
  const markAllAsRead = useCallback(async () => {
    try { await markAll(); toast.success("All notifications marked as read"); }
    catch { toast.error("Could not mark all notifications as read"); }
  }, [markAll]);
  const clearAll = useCallback(async () => {
    try { await clear(); toast.success("Notification history cleared"); }
    catch { toast.error("Could not clear notification history"); }
  }, [clear]);
  const notifications = query.data ?? [];
  return {
    notifications, unreadCount: notifications.filter((item) => !item.is_read).length,
    total: notifications.length, isLoading: query.isLoading, error: query.error,
    fetchNotifications: query.refetch, markAsRead, markAllAsRead, clearAll,
  };
};
export default useResidentNotifications;
