import { beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "./authStore";
import store from "./notificationsStore";
import service, { type NotificationRow } from "@/services/notificationsService";
vi.mock("@/services/notificationsService", () => ({ default: {
  fetchMyNotifications: vi.fn(), fetchUnreadCount: vi.fn(), markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(), clearAllNotifications: vi.fn(),
} }));
vi.mock("@/lib/socket", () => ({ getSocket: () => ({ auth: {}, on: vi.fn(), off: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connect: vi.fn() }) }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const row = (id: string, user_id = "A"): NotificationRow => ({ id, user_id, type: "SYSTEM", title: id, body: "Private dispatch", is_read: false, created_at: "2026-09-27 01:00:00" });
const deferred = <T,>() => { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((a,b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
beforeEach(() => {
  vi.resetAllMocks(); store.getState().resetSession(); store.getState().initSocket({ id: "A" });
  vi.mocked(service.fetchMyNotifications).mockResolvedValue({ notifications: [], total: 0, limit: 30, offset: 0, next_cursor: null });
  vi.mocked(service.fetchUnreadCount).mockResolvedValue(0);
});
it("does not restore an old account after a pending clear fails", async () => {
  store.getState().addNotification(row("private-A"));
  const pending = deferred<void>(); vi.mocked(service.clearAllNotifications).mockReturnValue(pending.promise);
  const action = store.getState().clearAll();
  store.getState().initSocket({ id: "B" }); store.getState().addNotification(row("private-B", "B"));
  pending.reject(new Error("offline")); await action;
  expect(store.getState().notifications.map((n) => n.id)).toEqual(["private-B"]);
});
it("rejects late list responses after account switch", async () => {
  const pending = deferred<Awaited<ReturnType<typeof service.fetchMyNotifications>>>(); vi.mocked(service.fetchMyNotifications).mockReturnValue(pending.promise);
  const load = store.getState().fetchNotifications(); store.getState().initSocket({ id: "B" });
  pending.resolve({ notifications: [row("private-A")], total: 1, limit: 30, offset: 0 }); await load;
  expect(store.getState().notifications).toEqual([]);
});
it("clears notification memory synchronously on logout", () => {
  useAuthStore.setState({ user: { id: "A" } as NonNullable<ReturnType<typeof useAuthStore.getState>["user"]> });
  store.getState().initSocket({ id: "A" }); store.getState().addNotification(row("private"));
  useAuthStore.setState({ user: null, token: null });
  expect(store.getState().userId).toBeNull(); expect(store.getState().notifications).toEqual([]);
});
it("preserves new socket alerts when a mutation fails", async () => {
  store.getState().addNotification(row("old")); const pending = deferred<void>();
  vi.mocked(service.markAllNotificationsAsRead).mockReturnValue(pending.promise);
  const action = store.getState().markAllAsRead(); store.getState().addNotification(row("new"));
  pending.reject(new Error("offline")); await action;
  expect(store.getState().notifications.map((n) => n.id)).toEqual(["new", "old"]);
  expect(store.getState().unreadCount).toBe(2);
});
it("bounds the initial request and loads older pages only on demand", async () => {
  vi.mocked(service.fetchMyNotifications).mockResolvedValue({ notifications: [row("1")], total: 10000, limit: 30, offset: 0, next_cursor: "cursor" });
  await store.getState().fetchNotifications(); expect(service.fetchMyNotifications).toHaveBeenCalledTimes(1);
  await store.getState().loadMore(); expect(service.fetchMyNotifications).toHaveBeenLastCalledWith({ category: "all", cursor: "cursor", limit: 30 });
  expect(store.getState().notifications).toHaveLength(1);
});
it("does not resurrect records absent from the server", async () => {
  store.getState().addNotification(row("deleted")); await store.getState().fetchNotifications();
  expect(store.getState().notifications).toEqual([]); expect(store.getState().unreadCount).toBe(0);
});
it("preserves only alerts received during a list request", async () => {
  const pending = deferred<Awaited<ReturnType<typeof service.fetchMyNotifications>>>(); vi.mocked(service.fetchMyNotifications).mockReturnValue(pending.promise);
  store.getState().addNotification(row("stale")); const load = store.getState().fetchNotifications(); store.getState().addNotification(row("live"));
  pending.resolve({ notifications: [], total: 0, limit: 30, offset: 0 }); await load;
  expect(store.getState().notifications.map((n) => n.id)).toEqual(["live"]);
  expect(store.getState().unreadCount).toBe(1);
});
it("does not restore a removed reference from an in-flight query", async () => {
  const item = { ...row("removed"), ref_module: "announcements", ref_id: "announcement" };
  const pending = deferred<Awaited<ReturnType<typeof service.fetchMyNotifications>>>(); vi.mocked(service.fetchMyNotifications).mockReturnValue(pending.promise);
  const load = store.getState().fetchNotifications(); store.getState().removeNotificationsByReference({ ref_module: "announcements", ref_id: "announcement" });
  pending.resolve({ notifications: [item], total: 1, limit: 30, offset: 0 }); await load;
  expect(store.getState().notifications).toEqual([]);
});
it("reports an API error distinctly from an empty inbox", async () => {
  vi.mocked(service.fetchMyNotifications).mockRejectedValue(new Error("offline")); await store.getState().fetchNotifications();
  expect(store.getState().error).toContain("could not be loaded"); expect(store.getState().isLoading).toBe(false);
});
it("ignores another user's events and does not count already-read arrivals", () => {
  store.getState().addNotification(row("foreign", "B")); store.getState().addNotification({ ...row("read"), is_read: true });
  expect(store.getState().unreadCount).toBe(0); expect(store.getState().notifications.map((n) => n.id)).toEqual(["read"]);
});
