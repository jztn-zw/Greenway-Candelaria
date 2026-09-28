import { useInfiniteQuery, useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import notificationsService, { type NotificationFilters } from "@/services/notificationsService";
import { collectorKey, collectorQueryDefaults, useCollectorAction, useCollectorQuery } from "@/lib/collectorQuery";
import { toast } from "@/lib/toast";

type Category = NonNullable<NotificationFilters["category"]>;
const useFeed = (category: Category) => {
  const user = useAuthStore((state) => state.user);
  return useInfiniteQuery({ queryKey: collectorKey(user?.id, "notifications", "feed", category),
    queryFn: ({ pageParam }) => notificationsService.fetchMyNotifications({ category, limit: 30, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: undefined as string | undefined, getNextPageParam: (page) => page.next_cursor ?? undefined,
    ...collectorQueryDefaults, refetchInterval: false, enabled: user?.role === "DRIVER" });
};
export const useCollectorNotifications = () => {
  const client = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const categoryKey = collectorKey(user?.id, "notification-category");
  const selected = useQuery({ queryKey: categoryKey, queryFn: () => "all" as Category, enabled: false, staleTime: Infinity, gcTime: 30 * 60_000 });
  const category = selected.data ?? "all";
  const feed = useFeed(category);
  const recent = useFeed("all");
  const unread = useCollectorQuery("notifications", ["count"], notificationsService.fetchUnreadCount, { refetchInterval: false });
  const runAction = useCollectorAction("notifications");
  const isMutating = useIsMutating({ predicate: (mutation) => mutation.meta?.collectorUserId === user?.id && Array.isArray(mutation.meta?.collectorDomains) && mutation.meta.collectorDomains.includes("notifications") }) > 0;
  const perform = async (action: () => Promise<void>, success?: string) => {
    try { await runAction(action); if (success && useAuthStore.getState().user?.id === user?.id) toast.success(success); }
    catch { toast.error("Could not update notifications. Please try again."); }
  };
  const fetchNotifications = async (filters: NotificationFilters = {}) => {
    if (filters.category && filters.category !== category) { client.setQueryData(categoryKey, filters.category); return; }
    await Promise.all([feed.refetch(), unread.refetch(), ...(category === "all" ? [] : [recent.refetch()])]);
  };
  const rows = feed.data?.pages.flatMap((page) => page.notifications) ?? [];
  const notifications = [...new Map(rows.filter((row) => row.user_id === user?.id).map((row) => [row.id, row])).values()];
  return {
    notifications, recentNotifications: (recent.data?.pages[0]?.notifications ?? []).filter((row) => row.user_id === user?.id).slice(0, 20),
    category, unreadCount: unread.data ?? 0, total: feed.data?.pages[0]?.total ?? 0,
    isLoading: feed.isLoading || feed.isFetchingNextPage, isMutating,
    error: feed.error || unread.error || recent.error ? "Notifications could not be loaded. Please try again." : null,
    nextCursor: feed.hasNextPage ? feed.data?.pages[feed.data.pages.length - 1]?.next_cursor ?? null : null,
    loadMore: async () => { if (feed.hasNextPage && !feed.isFetching) await feed.fetchNextPage(); }, fetchNotifications,
    markAsRead: (id: string) => perform(() => notificationsService.markNotificationAsRead(id)),
    markAllAsRead: () => perform(() => notificationsService.markAllNotificationsAsRead(), "All notifications marked as read"),
    clearAll: () => perform(() => notificationsService.clearAllNotifications(), "Notification history cleared"),
  };
};
