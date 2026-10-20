import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { NotificationRow } from "@/services/notificationsService";
import ResidentTopbar from "./ResidentTopbar";
import api from "@/lib/api";
import { fetchMyNotifications } from "@/services/notificationsService";

const mocks = vi.hoisted(() => ({ notifications: [] as NotificationRow[], markAsRead: vi.fn() }));
vi.mock("@/features/resident/notifications/useResidentNotifications", () => ({ default: () => ({
  notifications: mocks.notifications, unreadCount: 1, markAsRead: mocks.markAsRead,
  markAllAsRead: vi.fn(), isMarkingAll: false, isMutating: false,
}) }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ toggleSidebar: vi.fn() }) }));
vi.mock("@/hooks/useThemeMode", () => ({ useThemeMode: () => "dark" }));

let host: HTMLDivElement;
let root: Root;
const notice = (overrides: Partial<NotificationRow> = {}): NotificationRow => ({
  id: "notification-1", user_id: "resident", type: "SYSTEM", title: "Notice", body: "Details",
  is_read: false, created_at: "2026-09-28 00:00:00", ...overrides,
});
const Location = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};
const renderTopbar = async (path = "/resident") => {
  await act(async () => root.render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResidentTopbar /><Location /></MemoryRouter>));
};
const openMenu = async (path = "/resident") => {
  await renderTopbar(path);
  await act(async () => host.querySelector<HTMLButtonElement>('button[title="Notifications"]')!.click());
};

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.markAsRead.mockReset().mockResolvedValue(undefined);
  mocks.notifications = [notice()];
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); vi.restoreAllMocks(); });

it.each([
  ["/resident", "Resident Dashboard"],
  ["/resident/tracking", "Live Collection Tracking"],
  ["/resident/contents", "Community Posts"],
])("shows the requested topbar title for %s", async (path, title) => {
  await renderTopbar(path);
  expect(host.querySelector('nav[aria-label="Breadcrumb"]')).toHaveTextContent(title);
});

it.each(["2020-01-01T00:00:00Z", "2030-01-01T00:00:00Z"])("uses trusted Philippine time and keeps labels ticking when the device clock is %s", async (deviceTime) => {
  let elapsed = performance.now();
  vi.spyOn(Date, "now").mockReturnValue(Date.parse(deviceTime));
  vi.spyOn(performance, "now").mockImplementation(() => elapsed);
  vi.spyOn(api, "get").mockResolvedValue({ data: { data: {
    notifications: [], total: 0, limit: 20, offset: 0, server_time: "2026-10-06 16:59:00.000",
  } } });
  await fetchMyNotifications();
  mocks.notifications = [notice({ created_at: "2026-10-06 16:55:00" })];
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  await openMenu();
  expect(document.querySelector(".gw-topbar-notification-row")).toHaveTextContent("4m ago");
  elapsed += 60_000;
  vi.mocked(Date.now).mockReturnValue(Date.parse("2040-01-01T00:00:00Z"));
  await act(async () => { vi.advanceTimersByTime(60_000); });
  expect(document.querySelector(".gw-topbar-notification-row")).toHaveTextContent("5m ago");
});

it.each([
  ["NEW_POST", "posts", "/resident/contents?post=detail-1"],
  ["REPORT_UPDATE", "reports", "/resident/my-reports?report=detail-1"],
  ["ANNOUNCEMENT", "announcements", "/resident/notifications?announcement=detail-1"],
  ["TRUCK_IS_NEAR", "tracking", "/resident/schedule"],
] as const)("opens the %s destination while its read receipt is pending", async (type, ref_module, destination) => {
  let finishRead!: () => void;
  mocks.markAsRead.mockImplementationOnce(() => new Promise<void>(resolve => { finishRead = resolve; }));
  mocks.notifications = [notice({ type, ref_module, ref_id: "detail-1" })];
  await openMenu();
  await act(async () => document.querySelector<HTMLButtonElement>(".gw-topbar-notification-row")!.click());
  expect(host.querySelector('[data-testid="location"]')).toHaveTextContent(destination);
  expect(document.querySelector(".gw-topbar-notification-panel")).toBeNull();
  expect(mocks.markAsRead).toHaveBeenCalledExactlyOnceWith("notification-1");
  await act(async () => finishRead());
});

it("opens a schedule notification on its exact resident calendar date", async () => {
  let finishRead!: () => void;
  mocks.markAsRead.mockImplementationOnce(() => new Promise<void>(resolve => { finishRead = resolve; }));
  mocks.notifications = [notice({ type: "ANNOUNCEMENT", ref_module: "schedule", ref_id: "event-1", metadata: { event_date: "2099-01-01" } })];
  await openMenu();
  await act(async () => document.querySelector<HTMLButtonElement>(".gw-topbar-notification-row")!.click());
  expect(host.querySelector('[data-testid="location"]')).toHaveTextContent("/resident/schedule?date=2099-01-01");
  expect(document.querySelector(".gw-topbar-notification-panel")).toBeNull();
  expect(mocks.markAsRead).toHaveBeenCalledExactlyOnceWith("notification-1");
  await act(async () => finishRead());
});

it("opens a collection reminder immediately while its read receipt is pending", async () => {
  let finishRead!: () => void;
  mocks.markAsRead.mockImplementationOnce(() => new Promise<void>(resolve => { finishRead = resolve; }));
  mocks.notifications = [notice({ type: "COLLECTION_REMINDER" })];
  await openMenu();
  await act(async () => document.querySelector<HTMLButtonElement>(".gw-topbar-notification-row")!.click());
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Details");
  expect(document.querySelector(".gw-topbar-notification-panel")).toBeNull();
  await act(async () => finishRead());
});

it("reveals cached older notifications on scroll without a simulated loading delay", async () => {
  mocks.notifications = Array.from({ length: 18 }, (_, index) => notice({ id: `notice-${index}`, title: `Notice ${index}` }));
  await openMenu();
  expect(document.querySelectorAll(".gw-topbar-notification-row")).toHaveLength(6);
  await act(async () => document.querySelector(".gw-topbar-notification-scroll")!.dispatchEvent(new Event("scroll")));
  expect(document.querySelectorAll(".gw-topbar-notification-row")).toHaveLength(12);
  expect(document.querySelector('[aria-label="Loading older notifications"]')).toBeNull();
});
