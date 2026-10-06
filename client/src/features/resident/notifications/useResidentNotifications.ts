import { useResidentMutation,useResidentQuery } from "@/lib/residentQuery";
import { toast } from "@/lib/toast";
import notificationsService,{ type NotificationFilters } from "@/services/notificationsService";
import { fetchNotificationWindow } from "@/lib/notificationHistory";
import { useCallback } from "react";
import { usePendingAction } from "@/hooks/usePendingAction";

const useResidentNotifications = (filters: NotificationFilters = {}) => {
  const params: NotificationFilters = { limit: 30, offset: 0, web_category: "all", ...filters };
  const query = useResidentQuery("notifications", ["history", params], () => fetchNotificationWindow(params), {
    keepPreviousData: params.web_category === "all" && params.offset === 0 && (params.limit ?? 30) > 30,
  });
  const markingAll = usePendingAction();
  const clearing = usePendingAction();
  const markRead = useResidentMutation(notificationsService.markNotificationAsRead, "notifications");
  const markAll = useResidentMutation(notificationsService.markAllNotificationsAsRead, "notifications");
  const clear = useResidentMutation(notificationsService.clearAllNotifications, "notifications");
  const markContent = useResidentMutation(notificationsService.markContentNotificationsAsRead, "notifications");
  const markContentAsRead = useCallback(async (postId: string) => {
    try { await markContent(postId); } catch { toast.error("Could not mark notification as read"); }
  }, [markContent]);
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
  const notifications = query.data?.notifications ?? [];
  return {
    notifications, unreadCount: query.data?.unread_count ?? 0,
    unreadContentCount: query.data?.unread_content_count ?? 0, markContentAsRead,
    total: query.data?.total ?? 0, historyTotal: query.data?.history_total ?? 0, recentCount: query.data?.recent_count ?? 0, offset: query.data?.offset ?? params.offset ?? 0,
    isLoading: query.isLoading, isRefreshing: query.isFetching, hasLoadedData: query.data !== undefined, error: query.error,
    fetchNotifications: query.refetch, markAsRead,
    isMarkingAll: markingAll.isPending, isClearing: clearing.isPending,
    isMutating: markingAll.isPending || clearing.isPending,
    markAllAsRead: () => clearing.isPending ? undefined : markingAll.run(markAllAsRead),
    clearAll: () => markingAll.isPending ? undefined : clearing.run(clearAll),
  };
};
export default useResidentNotifications;
