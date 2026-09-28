import { useCollectorNotifications } from "./useCollectorNotifications";
import { useEffect } from "react";
import useAuthStore from "@/store/authStore";
import useNotificationsStore from "@/store/notificationsStore";

export const useNotifications = () => {
  const user = useAuthStore((state) => state.user);
  const collector = useCollectorNotifications();

  const notifications = useNotificationsStore((state) => state.notifications);
  const category = useNotificationsStore((state) => state.category);
  const recentNotifications = useNotificationsStore((state) => state.recentNotifications);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const total = useNotificationsStore((state) => state.total);
  const isLoading = useNotificationsStore((state) => state.isLoading);
  const error = useNotificationsStore((state) => state.error);
  const isMutating = useNotificationsStore((state) => state.isMutating);
  const nextCursor = useNotificationsStore((state) => state.nextCursor);
  const loadMore = useNotificationsStore((state) => state.loadMore);
  const initialized = useNotificationsStore((state) => state.initialized);

  const fetchNotifications = useNotificationsStore((state) => state.fetchNotifications);
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);
  const clearAll = useNotificationsStore((state) => state.clearAll);
  const initSocket = useNotificationsStore((state) => state.initSocket);

  useEffect(() => {
    if (!user?.id || user.role === "DRIVER") return;

    const cleanup = initSocket(user);
    if (!useNotificationsStore.getState().initialized) {
      fetchNotifications();
    }

    return cleanup;
  }, [user, initialized, fetchNotifications, initSocket]);

  return user?.role === "DRIVER" ? collector : {
    notifications,
    recentNotifications,
    category,
    unreadCount,
    total,
    isLoading,
    error,
    isMutating,
    nextCursor,
    loadMore,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
};

export default useNotifications;
