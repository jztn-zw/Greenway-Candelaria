import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { NotificationRow } from "@/services/notificationsService";
import AdminNotifications from "./AdminNotifications";
import AdminTopbar from "@/app/layouts/admin/AdminTopbar";

const mocks = vi.hoisted(() => ({ notifications: [] as NotificationRow[], markAsRead: vi.fn() }));
vi.mock("./useAdminNotifications", () => ({ default: () => ({
  notifications: mocks.notifications, total: mocks.notifications.length, historyTotal: mocks.notifications.length, offset: 0, unreadCount: 1, isLoading: false, hasLoadedData: true,
  error: null, markAsRead: mocks.markAsRead, markAllAsRead: vi.fn(), clearAll: vi.fn(), isMutating: false,
}) }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ toggleSidebar: vi.fn() }) }));
vi.mock("@/hooks/useThemeMode", () => ({ useThemeMode: () => "dark" }));
afterEach(cleanup);
beforeEach(() => mocks.markAsRead.mockReset().mockResolvedValue(undefined));

const notice = (overrides: Partial<NotificationRow>): NotificationRow => ({
  id: "notice", user_id: "admin", type: "SYSTEM", title: "Notice", body: "Important details.",
  is_read: false, created_at: "2026-10-04T12:00:00Z", ...overrides,
});

function renderSource(source: "page" | "bell", notification: NotificationRow) {
  mocks.notifications = [notification];
  render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/admin/notifications"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {source === "page" ? <AdminNotifications /> : <AdminTopbar />}
  </MemoryRouter></QueryClientProvider>);
  if (source === "bell") fireEvent.click(screen.getByTitle("Notifications"));
  return document.querySelector<HTMLButtonElement>(source === "page" ? ".resident-notification-row" : ".gw-topbar-notification-row")!;
}

it.each(["page", "bell"] as const)("shows the same structured community message in the %s", source => {
  const row = renderSource(source, notice({ type: "NEW_POST", ref_module: "posts", title: "New Community Post",
    body: '"Waste tips" is now available in Community Posts.', metadata: { category: "WASTE_TIP" } }));
  expect(row).toHaveTextContent("MENRO Candelaria posted a community update: Waste tips");
  expect(row).toHaveTextContent("Read the latest waste tip in Community Posts.");
  expect(row).not.toHaveTextContent("is now available");
});

it.each(["page", "bell"] as const)("keeps the complete headline and breakdown details when opening from the %s", async source => {
  const row = renderSource(source, notice({ ref_module: "truck-breakdowns", title: "Truck breakdown: Truck 2",
    body: "Alex reported an engine issue (critical road hazard).",
    metadata: { driver_name: "Alex", truck_name: "Truck 2", category: "Engine issue", urgent: true, description: "Engine stopped near the route entrance." } }));
  expect(row).toHaveTextContent("Alex reported a truck breakdown: Truck 2");
  await act(async () => row.click());
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("Alex reported a truck breakdown: Truck 2");
  expect(dialog).toHaveTextContent("Critical Road Hazard");
  expect(dialog).toHaveTextContent("Engine stopped near the route entrance.");
  expect(mocks.markAsRead).toHaveBeenCalledExactlyOnceWith("notice");
});

it("opens a legacy breakdown with serialized null metadata using the original message", async () => {
  const row = renderSource("page", notice({ ref_module: "truck-breakdowns", title: "Truck breakdown: Truck 2", metadata: "null", body: "Collector reported an engine issue." }));
  await act(async () => row.click());
  expect(screen.getByRole("dialog")).toHaveTextContent("Collector reported an engine issue.");
});
