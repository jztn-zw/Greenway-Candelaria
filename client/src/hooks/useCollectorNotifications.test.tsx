import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { useCollectorNotifications } from "./useCollectorNotifications";
import service, { type NotificationRow } from "@/services/notificationsService";
vi.mock("@/services/notificationsService", () => ({ default: { fetchMyNotifications: vi.fn(), fetchUnreadCount: vi.fn(), markNotificationAsRead: vi.fn(), markAllNotificationsAsRead: vi.fn(), clearAllNotifications: vi.fn() } }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
let root: Root; let host: HTMLElement; let client: QueryClient;
let state: ReturnType<typeof useCollectorNotifications>;
const row = (id: string): NotificationRow => ({ id, user_id: "collector", type: "SYSTEM", title: id, body: "Dispatch", is_read: false, created_at: "2026-09-28 01:00:00" });
beforeEach(() => {
  vi.resetAllMocks(); notifyManager.setScheduler(queueMicrotask);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useAuthStore.setState({ user: { id: "collector", role: "DRIVER" } as never, token: "session" });
  vi.mocked(service.fetchMyNotifications).mockResolvedValue({ notifications: [row("one")], total: 31, limit: 30, offset: 0, next_cursor: "older" });
  vi.mocked(service.fetchUnreadCount).mockResolvedValue(31);
  vi.mocked(service.markNotificationAsRead).mockResolvedValue(undefined);
  client = new QueryClient(); host = document.createElement("div"); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); client.clear(); notifyManager.setScheduler((callback) => setTimeout(callback, 0)); });
const View = () => { state = useCollectorNotifications(); return <p>{state.notifications.map((item) => item.id).join(",")}:{state.unreadCount}:{state.error ?? "ready"}</p>; };
const mount = async (twice = false) => { await act(async () => root.render(<QueryClientProvider client={client}><View />{twice && <View />}</QueryClientProvider>)); };
it("header and page share requests, unread count, and cached pagination", async () => {
  await mount(true); expect(service.fetchMyNotifications).toHaveBeenCalledTimes(1); expect(service.fetchUnreadCount).toHaveBeenCalledTimes(1);
  vi.mocked(service.fetchMyNotifications).mockResolvedValueOnce({ notifications: [row("older")], total: 31, limit: 30, offset: 0, next_cursor: null });
  await act(async () => { await state.loadMore(); });
  expect(state.notifications.map((item) => item.id)).toEqual(["one", "older"]);
  expect(service.fetchMyNotifications).toHaveBeenLastCalledWith({ category: "all", limit: 30, cursor: "older" });
});
it("server category filters keep recent bell notifications independent", async () => {
  await mount();
  vi.mocked(service.fetchMyNotifications).mockResolvedValue({ notifications: [row("dispatch")], total: 1, limit: 30, offset: 0, next_cursor: null });
  await act(async () => { await state.fetchNotifications({ category: "dispatch" }); });
  expect(state.category).toBe("dispatch"); expect(state.notifications[0].id).toBe("dispatch");
  expect(state.recentNotifications[0].id).toBe("one");
});
it("failed mutations preserve messages and do not retry writes", async () => {
  await mount(); vi.mocked(service.markNotificationAsRead).mockRejectedValue(new Error("offline"));
  await act(async () => { await state.markAsRead("one"); });
  expect(service.markNotificationAsRead).toHaveBeenCalledTimes(1);
  expect(state.notifications[0].is_read).toBe(false);
});
it("refresh errors retain cached notifications and expose a retry state", async () => {
  await mount(); vi.mocked(service.fetchMyNotifications).mockRejectedValue(new Error("offline"));
  await act(async () => { await state.fetchNotifications(); });
  expect(state.notifications[0].id).toBe("one"); expect(state.error).toContain("could not be loaded");
});
it("retry refreshes the filtered page and the separate bell feed without duplicating the all feed", async () => {
  await mount();
  vi.mocked(service.fetchMyNotifications).mockClear();
  await act(async () => { await state.fetchNotifications(); });
  expect(service.fetchMyNotifications).toHaveBeenCalledTimes(1);
  await act(async () => { await state.fetchNotifications({ category: "dispatch" }); });
  vi.mocked(service.fetchMyNotifications).mockImplementation(async (filters) => {
    if (filters?.category === "all") throw new Error("Bell unavailable");
    return { notifications: [row("dispatch")], total: 1, limit: 30, offset: 0, next_cursor: null };
  });
  await act(async () => { await state.fetchNotifications(); });
  expect(state.error).toContain("could not be loaded");
  vi.mocked(service.fetchMyNotifications).mockImplementation(async (filters) => ({ notifications: [row(filters?.category === "all" ? "new-bell" : "new-dispatch")], total: 1, limit: 30, offset: 0, next_cursor: null }));
  await act(async () => { await state.fetchNotifications({ category: "dispatch" }); });
  expect(state.error).toBeNull();
  expect(state.recentNotifications[0].id).toBe("new-bell");
  expect(state.notifications[0].id).toBe("new-dispatch");
});
it("old notifications disappear immediately when another collector signs in", async () => {
  await mount(); vi.mocked(service.fetchMyNotifications).mockReturnValue(new Promise(() => {}));
  await act(async () => useAuthStore.setState({ user: { id: "other", role: "DRIVER" } as never }));
  expect(state.notifications).toEqual([]); expect(state.recentNotifications).toEqual([]);
});
