import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CollectorSchedule from "./CollectorSchedule";
import { fetchCalendarEvents, type CalendarEvent } from "@/services/scheduleService";
import { getEventColors, indexMonthEvents } from "@/components/calendar/calendar.utils";
import { EventModal } from "@/features/admin/schedule/EventModal";

vi.mock("@/services/scheduleService", () => ({ fetchCalendarEvents: vi.fn() }));
const sample: CalendarEvent = {
  id: "event-1", title: "Dispatch briefing", description: "Instructions for all collectors",
  event_date: "2026-09-25", end_date: "2026-09-30", event_type: "PRIVATE_EVENT", visibility: "PRIVATE", status: "ONGOING",
};
let host: HTMLDivElement;
let root: Root;
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient(); notifyManager.setScheduler(queueMicrotask);
  useAuthStore.setState({ user: { id: "collector", role: "DRIVER" } as never, token: "session" });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-26T17:00:00Z")); // September 27, 1 AM Manila.
  vi.clearAllMocks();
  vi.mocked(fetchCalendarEvents).mockResolvedValue([sample]);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); client.clear(); notifyManager.setScheduler((callback) => setTimeout(callback, 0)); host.remove(); vi.useRealTimers(); });
const render = async () => { await act(async () => root.render(<QueryClientProvider client={client}><CollectorSchedule /></QueryClientProvider>)); };
const dateButton = (day: number) => host.querySelector<HTMLButtonElement>(`button[aria-label*="September ${day}, 2026"]`)!;

it("separates loading, empty, and failed requests without claiming there are no collection duties", async () => {
  let resolve!: (events: CalendarEvent[]) => void;
  vi.mocked(fetchCalendarEvents).mockReturnValue(new Promise((done) => { resolve = done; }));
  await render();
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Loading schedule");
  expect(host.textContent).toContain("Loading schedule calendar");
  expect(host.textContent).toContain("Loading schedule events");
  expect(host.querySelector('button[aria-label*="September"]')).toBeNull();
  expect(host.textContent).not.toContain("No internal events scheduled");
  await act(async () => resolve([]));
  expect(host.textContent).toContain("No internal events scheduled");
  expect(host.textContent).not.toContain("No collection duties");
  vi.mocked(fetchCalendarEvents).mockRejectedValue(new Error("Temporary outage"));
  await act(async () => host.querySelector<HTMLButtonElement>('[title="Next Month"]')!.click());
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Schedule unavailable");
  expect(host.textContent).not.toContain("No internal events scheduled");
});

it("shows the shared admin event read-only, preserving its range and Manila date", async () => {
  await render();
  expect(fetchCalendarEvents).toHaveBeenCalledWith({ view: "collector", month: "2026-09", event_type: "PRIVATE_EVENT", visibility: "PRIVATE" });
  expect(dateButton(27).getAttribute("aria-current")).toBe("date");
  expect(dateButton(27).getAttribute("aria-pressed")).toBe("true");
  const aside = host.querySelector("aside")!;
  expect(aside.textContent).toContain("Dispatch briefing");
  expect(aside.textContent).toContain("Sep 25, 2026 – Sep 30, 2026");
  expect(aside.querySelector('[title="Schedule actions"]')).toBeNull();
});

it("provides focusable date buttons and keeps Today available after selecting another day", async () => {
  await render();
  const nextDay = dateButton(28);
  nextDay.focus();
  expect(document.activeElement).toBe(nextDay);
  expect(nextDay.type).toBe("button");
  await act(async () => nextDay.click());
  expect(dateButton(28).getAttribute("aria-pressed")).toBe("true");
  const today = [...host.querySelectorAll("button")].find((button) => button.textContent === "Today")!;
  expect(today).toBeDefined();
  await act(async () => today.click());
  expect(dateButton(27).getAttribute("aria-pressed")).toBe("true");
  expect(fetchCalendarEvents).toHaveBeenCalledTimes(1);
});

it("ignores late responses from a previous month and refreshes only the active month", async () => {
  await render();
  let resolve!: (events: CalendarEvent[]) => void;
  vi.mocked(fetchCalendarEvents).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await act(async () => host.querySelector<HTMLButtonElement>('[title="Next Month"]')!.click());
  expect(host.querySelector("h1")?.textContent).toBe("Internal schedule");
  expect(host.textContent).toContain("Loading schedule calendar");
  expect(host.querySelector("aside")?.textContent).toContain("Loading schedule events");
  expect(host.textContent).not.toContain("No internal events scheduled");
  vi.mocked(fetchCalendarEvents).mockResolvedValue([{ ...sample, title: "November event", event_date: "2026-11-01", end_date: null }]);
  await act(async () => host.querySelector<HTMLButtonElement>('[title="Next Month"]')!.click());
  await act(async () => resolve([{ ...sample, title: "October event", event_date: "2026-10-01", end_date: null }]));
  expect(host.querySelector("aside")?.textContent).toContain("November event");
  expect(host.querySelector("aside")?.textContent).not.toContain("October event");
  expect(host.querySelector("aside")?.textContent).not.toContain("Dispatch briefing");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(120000);
    window.dispatchEvent(new Event("focus"));
  });
  expect(fetchCalendarEvents).toHaveBeenCalledTimes(5);
  expect(vi.mocked(fetchCalendarEvents).mock.calls.slice(3).every(([options]) => options?.month === "2026-11")).toBe(true);
});

it("keeps cached events visible during background refresh and returning to a loaded month", async () => {
  await render();
  let resolve!: (events: CalendarEvent[]) => void;
  vi.mocked(fetchCalendarEvents).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(host.querySelector("aside")?.textContent).toContain("Dispatch briefing");
  expect(host.querySelector('[role="status"]')).toBeNull();
  await act(async () => resolve([sample]));
  vi.mocked(fetchCalendarEvents).mockResolvedValue([]);
  await act(async () => host.querySelector<HTMLButtonElement>('[title="Next Month"]')!.click());
  await act(async () => host.querySelector<HTMLButtonElement>('[title="Previous Month"]')!.click());
  expect(host.querySelector('[role="status"]')).toBeNull();
  await act(async () => dateButton(27).click());
  expect(host.querySelector("aside")?.textContent).toContain("Dispatch briefing");
  expect(host.querySelector('[role="status"]')).toBeNull();
  expect(fetchCalendarEvents).toHaveBeenCalledTimes(3);
});

it("keeps colors stable and indexes spanning events only within the displayed month", () => {
  const spanning = { ...sample, event_date: "2026-12-30", end_date: "2027-01-02" };
  expect([...indexMonthEvents([spanning], 2027, 0).keys()]).toEqual(["2027-01-01", "2027-01-02"]);
  const original = getEventColors([sample]).get(sample.id);
  expect(getEventColors([{ ...sample, id: "other" }, sample]).get(sample.id)).toBe(original);
});

it("allows admin to save corrected instructions on an ongoing event without changing its start", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  await act(async () => root.render(<EventModal isOpen event={sample} defaultDate="2026-09-27" onClose={() => {}} onSubmit={onSubmit} />));
  const form = document.body.querySelector("form")!;
  await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ event_date: "2026-09-25", end_date: "2026-09-30" }));
});
