import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResidentNotifications from "./ResidentNotifications";

const mocks = vi.hoisted(() => ({ clearAll: vi.fn(), markAsRead: vi.fn(), notifications: [{ id: "notice", user_id: "resident", type: "SYSTEM", title: "Notice", body: "Details", is_read: false, created_at: "2026-09-28 00:00:00" }] }));
vi.mock("./useResidentNotifications", () => ({ default: () => ({ notifications: mocks.notifications, unreadCount: 1, isLoading: false, error: null, fetchNotifications: vi.fn(), markAsRead: mocks.markAsRead, markAllAsRead: vi.fn(), clearAll: mocks.clearAll }) }));
vi.mock("@/lib/residentQuery", () => ({ useResidentFetch: () => vi.fn() }));
vi.mock("../announcements/ResidentAnnouncementModal", () => ({ default: () => null }));
let host: HTMLDivElement; let root: Root;
beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.clearAll.mockReset().mockResolvedValue(undefined);
  mocks.markAsRead.mockReset().mockResolvedValue(undefined);
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResidentNotifications /></MemoryRouter>));
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const click = async (name: string, scope: ParentNode = document) => { await act(async () => [...scope.querySelectorAll("button")].find(b => b.textContent?.trim() === name)!.click()); };

it("opens a focusable unread notification and marks only that notification as read", async () => {
  expect(host.querySelector("h1")).toHaveTextContent("Notifications");
  expect(host.querySelector("header")).toHaveTextContent("1 unread");
  const row = [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Notice") && button.textContent?.includes("Details"))!;
  row.focus();
  expect(document.activeElement).toBe(row);
  await act(async () => row.click());
  expect(mocks.markAsRead).toHaveBeenCalledExactlyOnceWith("notice");
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Details");
  expect(mocks.clearAll).not.toHaveBeenCalled();
});

it("requires confirmation before clearing resident notification history", async () => {
  await click("Clear all", host); expect(mocks.clearAll).not.toHaveBeenCalled();
  expect(document.querySelector('[role="alertdialog"]')).toHaveTextContent("every category");
  await click("Cancel"); expect(mocks.clearAll).not.toHaveBeenCalled();
  await click("Clear all", host); await click("Clear all", document.querySelector('[role="alertdialog"]')!);
  expect(mocks.clearAll).toHaveBeenCalledOnce(); expect(document.querySelector('[role="alertdialog"]')).toBeNull();
});
it("blocks dismissal and duplicate clears while the request is pending", async () => {
  let resolveClear!: () => void;
  mocks.clearAll.mockImplementationOnce(() => new Promise<void>(resolve => { resolveClear = resolve; }));
  await click("Clear all", host); await click("Clear all", document.querySelector('[role="alertdialog"]')!);
  const dialog = document.querySelector('[role="alertdialog"]')!;
  expect([...dialog.querySelectorAll("button")].every(b => b.disabled)).toBe(true);
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(dialog).toBeInTheDocument(); expect(mocks.clearAll).toHaveBeenCalledOnce();
  await act(async () => resolveClear()); expect(document.querySelector('[role="alertdialog"]')).toBeNull();
});
