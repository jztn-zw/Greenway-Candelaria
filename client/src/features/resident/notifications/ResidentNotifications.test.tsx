import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResidentNotifications from "./ResidentNotifications";
import type { NotificationRow } from "@/services/notificationsService";

const mocks = vi.hoisted(() => ({ clearAll: vi.fn(), markAsRead: vi.fn(), fetchResident: vi.fn(), isLoading: false, notifications: [] as NotificationRow[] }));
vi.mock("./useResidentNotifications", () => ({ default: () => ({ notifications: mocks.notifications, unreadCount: 1, isLoading: mocks.isLoading, error: null, fetchNotifications: vi.fn(), markAsRead: mocks.markAsRead, markAllAsRead: vi.fn(), clearAll: mocks.clearAll }) }));
vi.mock("@/lib/residentQuery", () => ({ useResidentFetch: () => mocks.fetchResident }));
vi.mock("../announcements/ResidentAnnouncementModal", () => ({ default: ({ open, announcementId }: { open: boolean; announcementId?: string }) => open ? <div role="dialog">Announcement {announcementId}</div> : null }));
const Location = () => <output data-testid="location">{useLocation().pathname}</output>;
const notice = (overrides: Partial<NotificationRow> = {}): NotificationRow => ({ id: "notice", user_id: "resident", type: "SYSTEM", title: "Notice", body: "Details", is_read: false, created_at: "2026-09-28 00:00:00", ...overrides });
const render = async (entry = "/resident/notifications") => {
  await act(async () => root.render(<MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResidentNotifications /><Location /></MemoryRouter>));
};
let host: HTMLDivElement; let root: Root;
beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.clearAll.mockReset().mockResolvedValue(undefined);
  mocks.markAsRead.mockReset().mockResolvedValue(undefined);
  mocks.fetchResident.mockReset();
  mocks.isLoading = false;
  mocks.notifications = [notice()];
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  await render();
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

it.each(["SYSTEM", "COLLECTION_REMINDER", "COLLECTION_DONE", "MISSED_COLLECTION"] as const)("opens %s details while its read receipt is still pending", async (type) => {
  let finishRead!: () => void;
  mocks.markAsRead.mockImplementationOnce(() => new Promise<void>(resolve => { finishRead = resolve; }));
  mocks.notifications = [notice({ type })];
  await render();
  await act(async () => host.querySelector<HTMLButtonElement>(".resident-notification-row")!.click());
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Details");
  expect(mocks.markAsRead).toHaveBeenCalledExactlyOnceWith("notice");
  await act(async () => finishRead());
});

it.each([["NEW_POST", "posts", "/resident/contents"], ["REPORT_UPDATE", "reports", "/resident/my-reports"]] as const)("opens %s destination without waiting for its read receipt", async (type, ref_module, pathname) => {
  let finishRead!: () => void;
  mocks.markAsRead.mockImplementationOnce(() => new Promise<void>(resolve => { finishRead = resolve; }));
  mocks.notifications = [notice({ type, ref_module, ref_id: "detail-1" })];
  await render();
  await act(async () => host.querySelector<HTMLButtonElement>(".resident-notification-row")!.click());
  expect(host.querySelector('[data-testid="location"]')).toHaveTextContent(pathname);
  await act(async () => finishRead());
});

it("opens the announcement shell immediately and leaves fetching/read tracking to the modal", async () => {
  mocks.notifications = [notice({ type: "ANNOUNCEMENT", ref_module: "announcements", ref_id: "announcement-1" })];
  await render();
  await act(async () => host.querySelector<HTMLButtonElement>(".resident-notification-row")!.click());
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Announcement announcement-1");
  expect(mocks.fetchResident).not.toHaveBeenCalled();
  expect(mocks.markAsRead).not.toHaveBeenCalled();
});

it("opens an announcement deep link before notification history has loaded", async () => {
  await act(async () => root.unmount());
  root = createRoot(host);
  mocks.notifications = [];
  mocks.isLoading = true;
  await render("/resident/notifications?announcement=announcement-1");
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Announcement announcement-1");
  expect(mocks.fetchResident).not.toHaveBeenCalled();
});

it("shows a real pending live check and ignores it if a newer notification was opened", async () => {
  let finishRoutes!: (routes: unknown[]) => void;
  mocks.fetchResident.mockImplementation((_domain, parts) => parts[0] === "today"
    ? new Promise(resolve => { finishRoutes = resolve; })
    : Promise.resolve([{ truck_id: "truck-1", truck_status: "ON_THE_WAY", last_ping: new Date().toISOString() }]));
  mocks.notifications = [notice({ id: "truck", type: "TRUCK_IS_NEAR", ref_module: "tracking", ref_id: "route-1" }), notice()];
  await render();
  const rows = host.querySelectorAll<HTMLButtonElement>(".resident-notification-row");
  await act(async () => rows[0].click());
  expect(rows[0]).toHaveAttribute("aria-busy", "true");
  expect(rows[0]).toBeDisabled();
  await act(async () => rows[1].click());
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Details");
  await act(async () => finishRoutes([{ route_id: "route-1", route_status: "ACTIVE", truck_id: "truck-1" }]));
  expect(host.querySelector('[data-testid="location"]')).toHaveTextContent("/resident/notifications");
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Details");
});

it("navigates to tracking only after confirming the truck alert is current", async () => {
  mocks.fetchResident.mockImplementation((_domain, parts) => Promise.resolve(parts[0] === "today"
    ? [{ route_id: "route-1", route_status: "ACTIVE", truck_id: "truck-1" }]
    : [{ truck_id: "truck-1", truck_status: "ON_THE_WAY", last_ping: new Date().toISOString() }]));
  mocks.notifications = [notice({ type: "TRUCK_IS_NEAR", ref_module: "tracking", ref_id: "route-1" })];
  await render();
  await act(async () => host.querySelector<HTMLButtonElement>(".resident-notification-row")!.click());
  expect(host.querySelector('[data-testid="location"]')).toHaveTextContent("/resident/tracking");
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
