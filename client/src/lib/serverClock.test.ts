import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { formatRelativeTime } from "@/utils/date";

beforeEach(() => vi.resetModules());
afterEach(() => vi.restoreAllMocks());

it.each(["2020-01-01T00:00:00Z", "2040-01-01T00:00:00Z"])("uses trusted time for all shared relative ages and Philippine calendar fields when the PC is %s", async (deviceTime) => {
  const { syncServerClock } = await import("./serverClock");
  const { formatRelativeTime, getManilaNow } = await import("@/utils/date");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(deviceTime));
  vi.spyOn(performance, "now").mockReturnValue(0);
  syncServerClock("2026-10-06 16:59:00.000", 0);
  try {
    expect(formatRelativeTime("2026-10-06 16:55:00")).toBe("4m ago");
    expect(getManilaNow()).toMatchObject({ dateKey: "2026-10-07", hour: 0, weekday: "Wednesday" });
  } finally { vi.useRealTimers(); }
});

it("shows the saved Philippine date and time before a trusted clock is available", async () => {
  const { getServerNow } = await import("./serverClock");
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2040-01-01T00:00:00Z"));
  expect(getServerNow()).toBeNull();
  expect(formatRelativeTime("2026-10-06 16:55:00", { now: getServerNow() })).toBe("Oct 7, 2026, 12:55 AM");
});

it("preserves the last trusted sample when a delayed or malformed response arrives", async () => {
  const { getServerNow, syncServerClock } = await import("./serverClock");
  let elapsed = 1_000;
  vi.spyOn(performance, "now").mockImplementation(() => elapsed);
  syncServerClock("2026-10-06 16:59:00.000", 1_000);
  elapsed = 61_000;
  syncServerClock("2026-10-06 15:59:00.000", 500);
  syncServerClock("invalid", 61_000);
  expect(getServerNow()).toBe(Date.parse("2026-10-06T17:00:00Z"));
  expect(formatRelativeTime("2026-10-06 16:55:00", { now: getServerNow() })).toBe("5m ago");
});

it("accounts for response transit using elapsed time instead of the device wall clock", async () => {
  const { getServerNow, syncServerClock } = await import("./serverClock");
  vi.spyOn(performance, "now").mockReturnValue(2_000);
  vi.spyOn(Date, "now").mockReturnValue(0);
  syncServerClock("2026-10-06 16:59:00.000", 0);
  expect(getServerNow()).toBe(Date.parse("2026-10-06T16:59:01Z"));
});

it("saves Philippine picker fields as UTC and restores them across midnight", async () => {
  const { fromManilaCalendarDate, toManilaCalendarDate, formatManilaDateTime } = await import("@/utils/date");
  const chosen = new Date(2026, 9, 7, 0, 30);
  const instant = fromManilaCalendarDate(chosen);
  expect(instant.toISOString()).toBe("2026-10-06T16:30:00.000Z");
  const restored = toManilaCalendarDate(instant.toISOString());
  expect([restored.getFullYear(), restored.getMonth(), restored.getDate(), restored.getHours(), restored.getMinutes()]).toEqual([2026, 9, 7, 0, 30]);
  expect(formatManilaDateTime("2026-10-06 16:30:00", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })).toBe("Oct 7, 2026, 12:30 AM");
});
