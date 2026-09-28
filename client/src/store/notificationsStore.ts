import { create } from "zustand";
import notificationsService, { type NotificationRow, type NotificationFilters } from "@/services/notificationsService";
import useAuthStore from "@/store/authStore";
import { getSocket } from "@/lib/socket";
import { toast } from "@/lib/toast";
import { getCollectorNotificationCategory } from "@/features/collector/notifications/notificationRouting";

interface UserInfo { id: string; role?: string; barangay_id?: string }
interface NotificationsState {
  userId: string | null;
  notifications: NotificationRow[];
  recentNotifications: NotificationRow[];
  unreadCount: number;
  total: number;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  initialized: boolean;
  category: NonNullable<NotificationFilters["category"]>;
  nextCursor: string | null;
  fetchNotifications: (params?: NotificationFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  addNotification: (notification: NotificationRow) => void;
  removeNotificationsByReference: (reference: { ref_module: string; ref_id: string }) => void;
  updateNotificationsByReference: (reference: { ref_module: string; ref_id: string; changes: Partial<NotificationRow> }) => void;
  resetSession: () => void;
  initSocket: (user: UserInfo) => () => void;
}
let session = 0;
let request = 0;
let arrival = 0;
const arrivals = new Map<string, number>();
const removals = new Map<string, number>();
let registered = false;
let joinRooms: (() => void) | null = null;
const empty = { notifications: [] as NotificationRow[], recentNotifications: [] as NotificationRow[], unreadCount: 0, total: 0, isLoading: false,
  isMutating: false, error: null, initialized: false, category: "all" as const, nextCursor: null };
const unique = (rows: NotificationRow[]) => [...new Map(rows.map((row) => [row.id, row])).values()];

export const useNotificationsStore = create<NotificationsState>((set, get) => {
  // Mutations commit only after server success. No old snapshot can overwrite
  // another account or a notification received while the request was pending.
  const mutate = async (operation: () => Promise<void>, commit: () => void) => {
    if (get().isMutating || !get().userId) return;
    const epoch = session;
    set({ isMutating: true });
    try {
      await operation();
      if (epoch !== session) return;
      commit();
    } catch {
      if (epoch === session) toast.error("Could not update notifications. Please try again.");
    } finally {
      if (epoch === session) set({ isMutating: false });
    }
  };
  return {
    ...empty, userId: null,
    resetSession: () => {
      session++; request++; arrivals.clear(); removals.clear();
      if (get().userId) {
        const socket = getSocket();
        if (joinRooms) socket.off("connect", joinRooms);
        socket.disconnect();
      }
      joinRooms = null;
      set({ ...empty, userId: null });
    },
    fetchNotifications: async (params = {}) => {
      if (!get().userId) return;
      const category = params.category ?? get().category;
      const append = Boolean(params.cursor);
      if (get().isLoading && category === get().category) return;
      const epoch = session;
      const fetchId = ++request;
      const startedAt = arrival;
      set({ isLoading: true, error: null, category,
        ...(!append && category !== get().category ? { notifications: [], nextCursor: null } : {}) });
      try {
        const [data, unread] = await Promise.all([
          notificationsService.fetchMyNotifications({ ...params, category, limit: 30 }),
          notificationsService.fetchUnreadCount(),
        ]);
        if (epoch !== session || fetchId !== request) return;
        const fetched = data.notifications.filter((row) => row.user_id === get().userId && (removals.get(`${row.ref_module}:${row.ref_id}`) ?? 0) <= startedAt);
        const fetchedIds = new Set(fetched.map((row) => row.id));
        const live = get().notifications.filter((row) => (arrivals.get(row.id) ?? 0) > startedAt && !fetchedIds.has(row.id));
        set({ notifications: unique(append ? [...get().notifications, ...fetched] : [...live, ...fetched]),
          ...(category === "all" && !append ? { recentNotifications: unique([...live, ...fetched]).slice(0, 20) } : {}),
          unreadCount: Math.max(unread, unique([...live, ...fetched]).filter((row) => !row.is_read).length), total: data.total, nextCursor: data.next_cursor ?? null,
          isLoading: false, initialized: true });
        for (const [id, sequence] of arrivals) if (sequence <= startedAt) arrivals.delete(id);
        for (const [reference, sequence] of removals) if (sequence <= startedAt) removals.delete(reference);
      } catch {
        if (epoch !== session || fetchId !== request) return;
        set({ isLoading: false, initialized: true, error: "Notifications could not be loaded. Please try again." });
      }
    },
    loadMore: async () => {
      const cursor = get().nextCursor;
      if (cursor) await get().fetchNotifications({ cursor });
    },
    markAsRead: async (id) => {
      await mutate(() => notificationsService.markNotificationAsRead(id), () => {
        const unread = [...get().notifications, ...get().recentNotifications].some((row) => row.id === id && !row.is_read);
        const wasLoading = get().isLoading;
        ++request;
        set((state) => ({ isLoading: false, notifications: state.notifications.map((row) => row.id === id ? { ...row, is_read: true } : row),
          recentNotifications: state.recentNotifications.map((row) => row.id === id ? { ...row, is_read: true } : row),
          unreadCount: Math.max(0, state.unreadCount - Number(unread)) }));
        if (wasLoading) void get().fetchNotifications();
      });
    },
    markAllAsRead: async () => {
      await mutate(() => notificationsService.markAllNotificationsAsRead(), () => {
        ++request; set((state) => ({ isLoading: false, unreadCount: 0, recentNotifications: state.recentNotifications.map((row) => ({ ...row, is_read: true })), notifications: state.notifications.map((row) => ({ ...row, is_read: true })) }));
        toast.success("All notifications marked as read");
        void get().fetchNotifications();
      });
    },
    clearAll: async () => {
      await mutate(() => notificationsService.clearAllNotifications(), () => {
        ++request; set({ isLoading: false });
        toast.success("Notification history cleared");
        set({ notifications: [], recentNotifications: [], unreadCount: 0, total: 0, nextCursor: null });
        void get().fetchNotifications();
      });
    },
    addNotification: (row) => {
      if (row.user_id !== get().userId || [...get().notifications, ...get().recentNotifications].some((n) => n.id === row.id)) return;
      arrivals.set(row.id, ++arrival);
      const matches = get().category === "all" || getCollectorNotificationCategory(row) === get().category;
      set((state) => ({ recentNotifications: unique([row, ...state.recentNotifications]).slice(0, 20), notifications: matches ? [row, ...state.notifications] : state.notifications,
        unreadCount: state.unreadCount + Number(!row.is_read), total: state.total + Number(matches) }));
    },
    removeNotificationsByReference: ({ ref_module, ref_id }) => {
      const matches = (row: NotificationRow) => row.ref_module === ref_module && row.ref_id === ref_id;
      removals.set(`${ref_module}:${ref_id}`, ++arrival);
      const removed = unique([...get().notifications, ...get().recentNotifications]).filter(matches);
      set((state) => ({ notifications: state.notifications.filter((row) => !matches(row)),
        recentNotifications: state.recentNotifications.filter((row) => !matches(row)),
        unreadCount: Math.max(0, state.unreadCount - removed.filter((row) => !row.is_read).length),
        total: Math.max(0, state.total - get().notifications.filter(matches).length) }));
    },
    updateNotificationsByReference: ({ ref_module, ref_id, changes }) => {
      const update = (row: NotificationRow) => row.ref_module === ref_module && row.ref_id === ref_id
        ? { ...row, title: changes.title ?? row.title, body: changes.body ?? row.body, metadata: changes.metadata ?? row.metadata } : row;
      set((state) => ({ recentNotifications: state.recentNotifications.map(update), notifications: state.notifications.map(update) }));
    },
    initSocket: (user) => {
      if (get().userId !== user.id) { get().resetSession(); set({ userId: user.id }); }
      const socket = getSocket();
      const token = localStorage.getItem("token");
      const previousToken = (socket.auth as { token?: string }).token;
      socket.auth = { token };
      if (joinRooms) socket.off("connect", joinRooms);
      joinRooms = () => {
        socket.emit("notifications:join_user");
        if (user.barangay_id) socket.emit("notifications:join_barangay", user.barangay_id);
        if (user.role === "ADMIN") socket.emit("notifications:join_admins");
      };
      socket.on("connect", joinRooms);
      if (!registered) {
        registered = true;
        socket.on("notification:new", (row: NotificationRow) => get().addNotification(row));
        socket.on("notification:remove_ref", get().removeNotificationsByReference);
        socket.on("notification:update_ref", get().updateNotificationsByReference);
      }
      if (previousToken !== token) { socket.disconnect(); socket.connect(); }
      else if (socket.connected) joinRooms();
      else socket.connect();
      return () => {};
    },
  };
});
// Reset synchronously when auth changes, before the next screen can render.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id || state.token !== previous.token) useNotificationsStore.getState().resetSession();
});
export default useNotificationsStore;
