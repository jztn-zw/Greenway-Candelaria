import { create } from "zustand";
import notificationsService, {
  NotificationRow,
} from "@/services/notificationsService";
import { getSocket } from "@/lib/socket";
import { toast } from "@/lib/toast";

interface UserInfo {
  id: string;
  role?: string;
  barangay_id?: string;
}

interface NotificationsState {
  notifications: NotificationRow[];
  unreadCount: number;
  total: number;
  isLoading: boolean;
  initialized: boolean;

  fetchNotifications: (params?: { limit?: number; offset?: number; type?: string }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  addNotification: (notification: NotificationRow) => void;
  removeNotificationsByReference: (reference: { ref_module: string; ref_id: string }) => void;
  initSocket: (user: UserInfo) => () => void;
}

let socketListenerRegistered = false;
let activeNotificationUserId: string | null = null;
let joinNotificationRooms: (() => void) | null = null;

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  isLoading: false,
  initialized: false,

  fetchNotifications: async (params = {}) => {
    try {
      set({ isLoading: true });
      const requestedLimit = params.limit ?? 100;
      const [initialData, unread] = await Promise.all([
        notificationsService.fetchMyNotifications({ ...params, limit: requestedLimit }),
        notificationsService.fetchUnreadCount(),
      ]);

      // The Notifications page filters and paginates locally. Fetch the full
      // history rather than silently treating the first API page as the whole list.
      const data =
        params.offset === undefined &&
        params.type === undefined &&
        initialData.total > initialData.notifications.length
          ? await notificationsService.fetchMyNotifications({
              ...params,
              limit: initialData.total,
              offset: 0,
            })
          : initialData;

      set({
        notifications: data.notifications || [],
        total: data.total || 0,
        unreadCount: unread,
        isLoading: false,
        initialized: true,
      });
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    // Optimistic UI update across all components immediately
    const existing = get().notifications.find((n) => n.id === id);
    const wasUnread = Boolean(existing && !existing.is_read);
    const previousUnreadCount = get().unreadCount;

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n,
      ),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));

    try {
      await notificationsService.markNotificationAsRead(id);
    } catch (err) {
      console.error("Failed to mark notification as read in API:", err);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id && existing ? { ...n, is_read: existing.is_read } : n,
        ),
        unreadCount: previousUnreadCount,
      }));
      toast.error("Could not mark notification as read");
    }
  },

  markAllAsRead: async () => {
    // Optimistic UI update
    const previousNotifications = get().notifications;
    const previousUnreadCount = get().unreadCount;
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));

    try {
      await notificationsService.markAllNotificationsAsRead();
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read in API:", err);
      set({ notifications: previousNotifications, unreadCount: previousUnreadCount });
      toast.error("Could not mark all notifications as read");
    }
  },

  clearAll: async () => {
    // Optimistic UI update
    const previousNotifications = get().notifications;
    const previousUnreadCount = get().unreadCount;
    const previousTotal = get().total;
    set({
      notifications: [],
      unreadCount: 0,
      total: 0,
    });

    try {
      await notificationsService.clearAllNotifications();
      toast.success("Notification history cleared");
    } catch (err) {
      console.error("Failed to clear notifications in API:", err);
      set({
        notifications: previousNotifications,
        unreadCount: previousUnreadCount,
        total: previousTotal,
      });
      toast.error("Could not clear notification history");
    }
  },

  addNotification: (newNotif: NotificationRow) => {
    set((state) => {
      // Deduplicate: if notification with same ID is already present, do not add duplicate
      if (state.notifications.some((n) => n.id === newNotif.id)) {
        return state;
      }

      return {
        notifications: [newNotif, ...state.notifications],
        unreadCount: state.unreadCount + 1,
        total: state.total + 1,
      };
    });
  },

  removeNotificationsByReference: ({ ref_module, ref_id }) => {
    set((state) => {
      const removed = state.notifications.filter(
        (notification) => notification.ref_module === ref_module && notification.ref_id === ref_id,
      );
      if (removed.length === 0) return state;
      const unreadRemoved = removed.filter((notification) => !notification.is_read).length;
      return {
        notifications: state.notifications.filter(
          (notification) => notification.ref_module !== ref_module || notification.ref_id !== ref_id,
        ),
        unreadCount: Math.max(0, state.unreadCount - unreadRemoved),
        total: Math.max(0, state.total - removed.length),
      };
    });
  },

  initSocket: (user: UserInfo) => {
    if (!user || !user.id) return () => {};

    // This store is shared for the whole browser profile. Clear the previous
    // account's in-memory notifications when a different user logs in.
    if (activeNotificationUserId !== user.id) {
      activeNotificationUserId = user.id;
      set({
        notifications: [],
        unreadCount: 0,
        total: 0,
        initialized: false,
      });
    }

    const socket = getSocket();
    const token = localStorage.getItem("token");
    const previousToken = (socket.auth as { token?: string } | undefined)?.token;

    // A Socket.IO connection keeps its handshake token. Refresh it after a
    // logout/login, then rejoin after every reconnect because socket rooms are
    // cleared by the server whenever a connection drops.
    socket.auth = { token };
    const joinRooms = () => {
      socket.emit("notifications:join_user");
      if (user.barangay_id) {
        socket.emit("notifications:join_barangay", user.barangay_id);
      }
      if (user.role === "ADMIN") {
        socket.emit("notifications:join_admins");
      }
    };

    if (joinNotificationRooms) {
      socket.off("connect", joinNotificationRooms);
    }
    joinNotificationRooms = joinRooms;
    socket.on("connect", joinRooms);

    if (previousToken !== token) {
      socket.disconnect();
      socket.connect();
    } else if (socket.connected) {
      joinRooms();
    } else {
      socket.connect();
    }

    if (!socketListenerRegistered) {
      socketListenerRegistered = true;

      socket.on("notification:new", (newNotif: NotificationRow) => {
        get().addNotification(newNotif);
      });
      socket.on("notification:remove_ref", (reference: { ref_module: string; ref_id: string }) => {
        get().removeNotificationsByReference(reference);
      });
    }

    return () => {};
  },
}));

export default useNotificationsStore;
