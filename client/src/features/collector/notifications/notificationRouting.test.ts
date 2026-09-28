import { afterEach, expect, it, vi } from "vitest";
import { getCollectorNotificationDestination, getCollectorNotificationTitle, matchesCollectorRouteAlert, openCollectorNotification } from "./notificationRouting";
import type { NotificationRow } from "@/services/notificationsService";
const row: NotificationRow = { id: "1", user_id: "1", type: "SYSTEM", title: "Truck 🚚 assignment removed", body: "Details", is_read: false, created_at: "2026-09-27 00:00:00" };
afterEach(() => vi.useRealTimers());
it("preserves meaningful titles and complete emoji characters", () => {
  expect(getCollectorNotificationTitle({ ...row, ref_module: "drivers" })).toBe(row.title);
  expect(getCollectorNotificationTitle({ ...row, title: "🚨 Route cancelled ⚠️" })).toBe("Route cancelled");
});
it("handles malformed and non-object metadata safely", () => {
  for (const metadata of ["null", "[]", "broken", "42"]) expect(getCollectorNotificationDestination({ ...row, metadata })).toBeNull();
});
it("does not open today's map for an old route alert or a deleted template", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-27T00:00:00Z"));
  expect(getCollectorNotificationDestination({ ...row, ref_module: "routes", metadata: { destination: "route-map", collection_date: "2026-09-26" } })).toBeNull();
  expect(getCollectorNotificationDestination({ ...row, ref_module: "routes", ref_id: "template", metadata: { destination: "route-history" } })).toBeNull();
  expect(getCollectorNotificationDestination({ ...row, metadata: { destination: "route-map", collection_date: "2026-09-27", route_ids: ["template"] } })).toBe("/collector/route-map?date=2026-09-27&template=template");
});

it("links route history with an exact run ID, never a template ID", () => {
  expect(getCollectorNotificationDestination({ ...row, ref_module: "routes", ref_id: "template", metadata: { destination: "route-history", run_id: "run / ?" } })).toBe("/collector/route-history?route=run%20%2F%20%3F");
  for (const run_id of [undefined, "", "  ", 123]) {
    expect(getCollectorNotificationDestination({ ...row, ref_module: "routes", ref_id: "template", metadata: { destination: "route-history", run_id } })).toBeNull();
  }
});

it("keeps route identities in links and uses the Manila date across midnight", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-27T17:00:00Z"));
  const destination = getCollectorNotificationDestination({ ...row, ref_module: "routes", metadata: JSON.stringify({ destination: "route-map", collection_date: "2026-09-28", route_ids: ["a&b", "second", "second", null, 1] }) });
  expect(destination).toBe("/collector/route-map?date=2026-09-28&template=a%26b&template=second");
  expect(getCollectorNotificationDestination({ ...row, ref_module: "routes", ref_id: "legacy-template", metadata: { destination: "route-map", collection_date: "2026-09-28" } })).toBe("/collector/route-map?date=2026-09-28&template=legacy-template");
  expect(getCollectorNotificationDestination({ ...row, metadata: { destination: "route-map", collection_date: "2026-09-28" } })).toBeNull();
});

it("prevents a route notification from showing a different assignment or day", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-28T00:00:00Z"));
  const params = new URLSearchParams("date=2026-09-28&template=expected&template=another");
  expect(matchesCollectorRouteAlert(params, { routeId: "run", templateRouteId: "expected" })).toBe(true);
  expect(matchesCollectorRouteAlert(params, { routeId: "run", templateRouteId: "different" })).toBe(false);
  expect(matchesCollectorRouteAlert(params, null)).toBe(false);
  expect(matchesCollectorRouteAlert(params, { routeId: "run" })).toBe(false);
  params.set("run", "specific-run");
  expect(matchesCollectorRouteAlert(params, { routeId: "run", templateRouteId: "expected" })).toBe(false);
  expect(matchesCollectorRouteAlert(params, { routeId: "specific-run", templateRouteId: "expected" })).toBe(true);
  vi.setSystemTime(new Date("2026-09-28T17:00:00Z"));
  expect(matchesCollectorRouteAlert(params, { routeId: "specific-run", templateRouteId: "expected" })).toBe(false);
  expect(matchesCollectorRouteAlert(new URLSearchParams(), null)).toBe(true);
});

it("opens dispatch messages directly and leaves informational alerts in their modal", () => {
  const navigate = vi.fn();
  const listener = vi.fn();
  window.addEventListener("collector:open-messages", listener);
  try {
    expect(openCollectorNotification({ ...row, ref_module: "driver-messages", metadata: { message_id: "message", route_id: "run" } }, navigate)).toBe(true);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ messageId: "message", routeId: "run" });
    expect(openCollectorNotification({ ...row, ref_module: "driver-messages", metadata: "bad-json" }, navigate)).toBe(true);
    expect((listener.mock.calls[1][0] as CustomEvent).detail.messageId).toBeUndefined();
    expect(openCollectorNotification({ ...row, ref_module: "drivers" }, navigate)).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/collector/profile");
    navigate.mockClear();
    for (const notification of [
      { ...row, type: "ANNOUNCEMENT" as const, ref_module: "announcements" },
      { ...row, ref_module: "routes", metadata: { destination: "notification" } },
      { ...row, metadata: { destination: "https://example.com" } },
    ]) expect(openCollectorNotification(notification, navigate)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  } finally { window.removeEventListener("collector:open-messages", listener); }
});
