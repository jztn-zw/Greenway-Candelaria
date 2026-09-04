import { useEffect } from "react";
import useAuthStore from "@/store/authStore";
import useNotificationsStore from "@/store/notificationsStore";

export const useNotifications = () => {
  const user = useAuthStore((state) => state.user);

  const notifications = useNotificationsStore((state) => state.notifications);
  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const total = useNotificationsStore((state) => state.total);
  const isLoading = useNotificationsStore((state) => state.isLoading);
  const initialized = useNotificationsStore((state) => state.initialized);

  const fetchNotifications = useNotificationsStore((state) => state.fetchNotifications);
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);
  const clearAll = useNotificationsStore((state) => state.clearAll);
  const initSocket = useNotificationsStore((state) => state.initSocket);

  useEffect(() => {
    if (!user?.id) return;

    if (!initialized) {
      fetchNotifications();
    }

    const cleanup = initSocket(user);
    return cleanup;
  }, [user?.id, initialized]);

  return {
    notifications,
    unreadCount,
    total,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
};

export default useNotifications;
