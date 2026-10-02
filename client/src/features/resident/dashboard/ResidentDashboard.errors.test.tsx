import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResidentDashboard from "./ResidentDashboard";
import useAuthStore from "@/store/authStore";
import { fetchLiveTrucks } from "@/services/trackingService";
import { fetchMyReports } from "@/services/reportsService";
import { fetchRoutes } from "@/services/routesService";
import { fetchCalendarEvents } from "@/services/scheduleService";
import { fetchAnnouncements } from "@/services/announcementsService";
import postsService from "@/services/postsService";

vi.mock("@/services/trackingService", () => ({ fetchLiveTrucks: vi.fn() }));
vi.mock("@/services/reportsService", () => ({ fetchMyReports: vi.fn() }));
vi.mock("@/services/routesService", () => ({ fetchRoutes: vi.fn() }));
vi.mock("@/services/scheduleService", () => ({ fetchCalendarEvents: vi.fn() }));
vi.mock("@/services/announcementsService", () => ({ fetchAnnouncements: vi.fn(), fetchAnnouncementById: vi.fn(), markAsRead: vi.fn() }));
vi.mock("@/services/postsService", () => ({ default: { getPage: vi.fn() } }));

let client: QueryClient;
let root: Root;
let host: HTMLDivElement;
let previousAuth: ReturnType<typeof useAuthStore.getState>;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  notifyManager.setScheduler(queueMicrotask);
  vi.resetAllMocks();
  previousAuth = useAuthStore.getState();
  useAuthStore.setState({ user: { id: "resident-retry", full_name: "Yuki", role: "RESIDENT", barangay_id: "b1", street_id: "s1" } as never, token: "session" });
  vi.mocked(fetchLiveTrucks).mockResolvedValue([]);
  vi.mocked(fetchMyReports).mockResolvedValue({ reports: [], total: 0, page: 1, limit: 1, totalPages: 1 });
  vi.mocked(fetchRoutes).mockResolvedValue([]);
  vi.mocked(fetchCalendarEvents).mockResolvedValue([]);
  vi.mocked(fetchAnnouncements).mockResolvedValue([]);
  vi.mocked(postsService.getPage).mockResolvedValue({ posts: [], total: 0, page: 1, limit: 12, totalPages: 1 });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount()); client.clear(); host.remove();
  useAuthStore.setState(previousAuth);
  notifyManager.setScheduler((callback) => setTimeout(callback, 0));
});
const render = async () => {
  await act(async () => root.render(<QueryClientProvider client={client}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResidentDashboard /></MemoryRouter></QueryClientProvider>));
};
const retryButtons = () => [...host.querySelectorAll("button")].filter((button) => button.textContent?.trim() === "Try again");

it("uses one retry for multiple unavailable sections and leaves healthy requests alone", async () => {
  vi.mocked(fetchCalendarEvents).mockRejectedValue(new Error("offline"));
  vi.mocked(fetchAnnouncements).mockRejectedValue(new Error("offline"));
  await render();
  expect(host.textContent).toContain("Calendar couldn't load");
  expect(host.textContent).toContain("Announcements couldn't load");
  expect(host.textContent).toContain("Yuki");
  expect(retryButtons()).toHaveLength(1);
  const calendarAttempts = vi.mocked(fetchCalendarEvents).mock.calls.length;
  const announcementAttempts = vi.mocked(fetchAnnouncements).mock.calls.length;
  vi.mocked(fetchCalendarEvents).mockResolvedValue([]);
  vi.mocked(fetchAnnouncements).mockResolvedValue([]);
  await act(async () => retryButtons()[0].click());
  expect(fetchCalendarEvents).toHaveBeenCalledTimes(calendarAttempts + 1);
  expect(fetchAnnouncements).toHaveBeenCalledTimes(announcementAttempts + 1);
  expect(fetchLiveTrucks).toHaveBeenCalledTimes(1);
  expect(fetchMyReports).toHaveBeenCalledTimes(1);
  expect(fetchRoutes).toHaveBeenCalledTimes(1);
  expect(postsService.getPage).toHaveBeenCalledTimes(1);
  expect(retryButtons()).toHaveLength(0);
});

it("deduplicates the calendar refresh notice and keeps one busy retry until failed requests recover", async () => {
  await render();
  vi.mocked(fetchCalendarEvents).mockRejectedValueOnce(new Error("offline"));
  vi.mocked(fetchLiveTrucks).mockRejectedValueOnce(new Error("offline"));
  await act(async () => { await client.refetchQueries({ predicate: ({ queryKey }) => queryKey[2] === "schedule" || queryKey[2] === "tracking" }); });
  expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
  expect(retryButtons()).toHaveLength(1);
  let finishCalendar!: (events: []) => void;
  let finishLive!: (trucks: []) => void;
  vi.mocked(fetchCalendarEvents).mockImplementationOnce(() => new Promise((resolve) => { finishCalendar = resolve; }));
  vi.mocked(fetchLiveTrucks).mockImplementationOnce(() => new Promise((resolve) => { finishLive = resolve; }));
  await act(async () => retryButtons()[0].click());
  expect(host.querySelector('button[aria-busy="true"]')).toBeDisabled();
  expect(host.textContent).toContain("Yuki");
  expect(fetchCalendarEvents).toHaveBeenCalledTimes(3);
  expect(fetchLiveTrucks).toHaveBeenCalledTimes(3);
  await act(async () => finishCalendar([]));
  expect(host.querySelector('button[aria-busy="true"]')).toBeDisabled();
  await act(async () => finishLive([]));
  expect(retryButtons()).toHaveLength(0);
  expect(fetchMyReports).toHaveBeenCalledTimes(1);
});
