import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import notificationsService from "@/services/notificationsService";
import useAuthStore from "@/store/authStore";
import useAdminNotifications from "@/features/admin/notifications/useAdminNotifications";
import useResidentNotifications from "@/features/resident/notifications/useResidentNotifications";
vi.mock("@/services/notificationsService", () => ({ default: {
  fetchMyNotifications: vi.fn(), markNotificationAsRead: vi.fn(), markAllNotificationsAsRead: vi.fn(), markContentNotificationsAsRead: vi.fn(), clearAllNotifications: vi.fn(),
} }));
const row = { id: "notice", user_id: "user", type: "SYSTEM" as const, title: "Notice", body: "Fixture", is_read: false, created_at: "2026-10-05 00:00:00" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(notificationsService.fetchMyNotifications).mockResolvedValue({ notifications: [row], total: 10000, limit: 30, offset: 0, unread_count: 9000, history_total: 10000, recent_count: 12 });
});
const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
for (const [role, useNotifications] of [["ADMIN", useAdminNotifications], ["RESIDENT", useResidentNotifications]] as const) {
  it(`${role} loads one visible notification window and keeps full unread counts`, async () => {
    useAuthStore.setState({ user: { id: "user", role } as never, token: "session" });
    const { result } = renderHook(() => useNotifications(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(notificationsService.fetchMyNotifications).toHaveBeenCalledTimes(1);
    expect(result.current.unreadCount).toBe(9000); expect(result.current.total).toBe(10000);
    expect(result.current.notifications).toEqual([row]);
  });
  it(`${role} fetches the selected history page and category directly`, async () => {
    useAuthStore.setState({ user: { id: "user", role } as never, token: "session" });
    const { result } = renderHook(() => useNotifications({ limit: 15, offset: 30, web_category: `${role === "ADMIN" ? "admin" : "resident"}:reports` }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(notificationsService.fetchMyNotifications).toHaveBeenCalledExactlyOnceWith({ limit: 15, offset: 30, web_category: `${role === "ADMIN" ? "admin" : "resident"}:reports` });
  });
}
it("keeps an expanded admin menu visible while the next window loads", async () => {
  useAuthStore.setState({ user: { id: "user", role: "ADMIN" } as never, token: "session" });
  const { result, rerender } = renderHook(({ limit }) => useAdminNotifications({ limit }), { initialProps: { limit: 30 }, wrapper: wrapper() });
  await waitFor(() => expect(result.current.notifications).toEqual([row]));
  vi.mocked(notificationsService.fetchMyNotifications).mockImplementation(() => new Promise(() => {}));
  rerender({ limit: 36 });
  expect(result.current.notifications).toEqual([row]); expect(result.current.unreadCount).toBe(9000);
});
it("marks resident content alerts without downloading their older pages", async () => {
  useAuthStore.setState({ user: { id: "user", role: "RESIDENT" } as never, token: "session" });
  vi.mocked(notificationsService.fetchMyNotifications).mockResolvedValue({ notifications: [], total: 10000, history_total: 10000, unread_count: 9000, unread_content_count: 400, limit: 30, offset: 0 });
  const { result } = renderHook(() => useResidentNotifications(), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.unreadContentCount).toBe(400));
  await act(async () => { await result.current.markContentAsRead("opened-post"); });
  expect(notificationsService.markContentNotificationsAsRead).toHaveBeenCalledExactlyOnceWith("opened-post");
  expect(notificationsService.markAllNotificationsAsRead).not.toHaveBeenCalled();
});
