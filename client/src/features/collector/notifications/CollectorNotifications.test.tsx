import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import CollectorNotifications from "./CollectorNotifications";
import type { NotificationRow } from "@/services/notificationsService";
const state = vi.hoisted(() => ({ notifications: [] as NotificationRow[], unreadCount: 0, total: 0, isLoading: false, isMutating: false, isRefreshing: false, hasLoadedData: false,
  category: "all" as const, error: null as string | null, nextCursor: null, loadMore: vi.fn(), fetchNotifications: vi.fn(), markAsRead: vi.fn(), markAllAsRead: vi.fn(), clearAll: vi.fn() }));
vi.mock("@/hooks/useNotifications", () => ({ default: () => state }));
vi.mock("./CollectorNotificationModal", () => ({ default: () => null }));
const row = (id: string): NotificationRow => ({ id, user_id: "collector", type: "SYSTEM", title: `Alert ${id}`, body: "Details", is_read: false, created_at: "2026-09-27 00:00:00" });
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  vi.clearAllMocks(); state.notifications = []; state.error = null; state.hasLoadedData = false; state.isRefreshing = false;
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Element.prototype.scrollIntoView = vi.fn();
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const render = async () => { await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><CollectorNotifications /></MemoryRouter>)); };
it("renders API failure and retry instead of claiming the inbox is empty", async () => {
  state.error = "Notifications could not be loaded"; await render();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("This page couldn't load");
  expect(host.textContent).not.toContain("No driver alerts found");
  await act(async () => [...host.querySelectorAll("button")].find((b) => b.textContent === "Try again")!.click());
  expect(state.fetchNotifications).toHaveBeenCalled();
});
it("keeps loaded notifications visible when a refresh fails", async () => {
  state.notifications = [row("cached")]; state.hasLoadedData = true; state.error = "offline";
  await render();
  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(host.querySelector('[role="status"]')).toHaveTextContent("may be outdated");
  expect(host.textContent).toContain("Alert cached");
  await act(async () => [...host.querySelectorAll("button")].find((b) => b.textContent === "Try again")!.click());
  expect(state.fetchNotifications).toHaveBeenCalledOnce();
});
it("uses keyboard-accessible notification buttons", async () => {
  state.notifications = [row("1")]; await render();
  const alert = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("Alert 1"))!;
  expect(alert.type).toBe("button"); await act(async () => alert.click());
  expect(state.markAsRead).toHaveBeenCalledWith("1");
});
it("requires confirmation before clearing all categories", async () => {
  state.notifications = [row("1")]; await render();
  await act(async () => [...host.querySelectorAll("button")].find((b) => b.textContent === "Clear all")!.click());
  expect(state.clearAll).not.toHaveBeenCalled();
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("every category");
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')].find((b) => b.textContent === "Clear all")!.click());
  expect(state.clearAll).toHaveBeenCalledOnce();
});
it("returns to a valid page when notifications shrink", async () => {
  state.notifications = Array.from({ length: 31 }, (_, i) => row(String(i + 1))); await render();
  await act(async () => [...host.querySelectorAll("button")].find((b) => b.textContent === "3")!.click());
  expect(host.textContent).toContain("Alert 31");
  state.notifications = [row("new")]; await render();
  expect(host.textContent).toContain("Alert new"); expect(host.textContent).not.toContain("No driver alerts found");
});
