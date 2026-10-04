import { describe, expect, it } from "vitest";
import type { NotificationRow } from "@/services/notificationsService";
import { getAdminNotificationPresentation, getAdminNotificationDestination } from "./notificationPresentation";

const notice = (overrides: Partial<NotificationRow> = {}): NotificationRow => ({
  id: "notice", user_id: "admin", type: "SYSTEM", title: "Notice", body: "Important details.",
  is_read: false, created_at: "2026-10-04T12:00:00Z", ...overrides,
});

describe("admin notification presentation", () => {
  it.each([
    { title: "New Report: RPT-2026-00038", type: "REPORT_UPDATE" as const, ref_module: "reports", prefix: "A resident", connector: "submitted a waste report:", highlight: "RPT-2026-00038" },
    { title: "New Collector Message: Alex", ref_module: "driver-messages", prefix: "Alex", connector: "sent a message", highlight: "" },
    { title: "New Collector Message: Alex", ref_module: "tracking", prefix: "Alex", connector: "sent a message", highlight: "" },
    { title: "Route Completed: Truck 1", ref_module: "tracking", prefix: "Truck 1", connector: "completed its route", highlight: "" },
    { title: "Route Ended: Truck 1", ref_module: "tracking", prefix: "Truck 1", connector: "ended its route", highlight: "" },
    { title: "GPS Signal Lost: Truck 1", ref_module: "tracking-stale-gps", prefix: "Truck 1", connector: "lost its GPS signal", highlight: "" },
  ])("formats $title without losing its details", ({ title, type, ref_module, prefix, connector, highlight }) => {
    const row = notice({ title, type: type ?? "SYSTEM", ref_module, body: "3 completed, 2 missed out of 5 stops.\nCheck the collector's update." });
    expect(getAdminNotificationPresentation(row)).toEqual({ headline: { prefix, connector, highlight }, message: row.body });
  });

  it("keeps breakdown urgency and uses only the supplied collector and truck names", () => {
    const row = notice({ title: "🚨 Truck breakdown: Truck 2", ref_module: "truck-breakdowns",
      body: "Alex reported Engine issue (critical road hazard).", metadata: JSON.stringify({ driver_name: "Alex", truck_name: "Truck 2", urgent: true, description: "Engine stopped." }) });
    expect(getAdminNotificationPresentation(row)).toEqual({
      headline: { prefix: "Alex", connector: "reported a truck breakdown:", highlight: "Truck 2" }, message: row.body,
    });
  });

  it.each(["{invalid", "null", "[]", { driver_name: 42, truck_name: null }, null])("handles missing or invalid breakdown metadata: %j", metadata => {
    expect(getAdminNotificationPresentation(notice({ title: "Truck breakdown: Truck 2", ref_module: "truck-breakdowns", metadata } as Partial<NotificationRow>)).headline)
      .toEqual({ prefix: "A collector", connector: "reported a truck breakdown:", highlight: "Truck 2" });
  });

  it("uses the resident content structure with the admin module name for legacy post messages", () => {
    expect(getAdminNotificationPresentation(notice({ type: "NEW_POST", ref_module: "posts", title: "New Community Post",
      body: '"Waste segregation" is now available in Community Posts.', metadata: { category: "WASTE_TIP" } }))).toEqual({
      headline: { prefix: "MENRO Candelaria", connector: "posted a community update:", highlight: "Waste segregation" },
      message: "Read the latest waste tip in Community Posts.",
    });
  });

  it("preserves custom post messages and metadata titles", () => {
    expect(getAdminNotificationPresentation(notice({ type: "NEW_POST", ref_module: "posts", title: "New Community Post",
      body: "Join the cleanup in Community Updates.", metadata: { post_title: "Cleanup day" } }))).toEqual({
      headline: { prefix: "MENRO Candelaria", connector: "posted a community update:", highlight: "Cleanup day" },
      message: "Join the cleanup in Community Updates.",
    });
  });

  it("uses the resident announcement structure", () => {
    expect(getAdminNotificationPresentation(notice({ type: "ANNOUNCEMENT", ref_module: "announcements", title: "⚠️ Collection advisory" })))
      .toEqual({ headline: { prefix: "MENRO Candelaria", connector: "posted an announcement:", highlight: "Collection advisory" }, message: "Important details." });
  });

  it("does not invent a post or announcement title when it is missing", () => {
    expect(getAdminNotificationPresentation(notice({ type: "NEW_POST", title: "", body: "", ref_module: "posts" })))
      .toEqual({ headline: { prefix: "MENRO Candelaria", connector: "posted a new community update", highlight: "" }, message: "Read the latest community update in Community Posts." });
    expect(getAdminNotificationPresentation(notice({ type: "ANNOUNCEMENT", title: "", ref_module: "announcements" })).headline.highlight)
      .toBe("Official Notice");
  });

  it.each<NotificationRow["type"]>(["COLLECTION_REMINDER", "TRUCK_IS_NEAR", "COLLECTION_DONE", "MISSED_COLLECTION", "REPORT_UPDATE", "SYSTEM"])(
    "preserves custom wording for %s notifications", type => {
      expect(getAdminNotificationPresentation(notice({ type, title: "⚠️ Area update", body: "The route is paused. Do not dispatch another truck." })))
        .toEqual({ headline: { prefix: "Area update", connector: "", highlight: "" }, message: "The route is paused. Do not dispatch another truck." });
    },
  );

  it("removes a duplicated legacy headline and provides a safe empty-title fallback", () => {
    expect(getAdminNotificationPresentation(notice({ title: "Route Update: Route Update" })).headline.prefix).toBe("Route Update");
    expect(getAdminNotificationPresentation(notice({ title: " ⚠️ ", body: "" })))
      .toEqual({ headline: { prefix: "System Notification", connector: "", highlight: "" }, message: "" });
  });

  it("preserves the exact collector message destination", () => {
    const row = notice({ title: "New Collector Message: Alex", ref_module: "driver-messages", metadata: { driver_id: "driver-1", message_id: "message-1" } });
    getAdminNotificationPresentation(row);
    expect(getAdminNotificationDestination(row)).toBe("/admin/tracking?messageDriver=driver-1&message=message-1");
  });

  it.each(["null", "[]", "{invalid"])("keeps a safe message destination with legacy metadata: %s", metadata => {
    expect(getAdminNotificationDestination(notice({ ref_module: "driver-messages", metadata }))).toBe("/admin/tracking");
  });
});
