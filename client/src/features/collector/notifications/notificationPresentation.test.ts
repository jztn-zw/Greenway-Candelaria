import { expect, it } from "vitest";
import { CalendarClock, MessageSquare, Megaphone, Newspaper, Truck } from "lucide-react";
import type { NotificationRow } from "@/services/notificationsService";
import { getCollectorNotificationPresentation } from "./notificationPresentation";
import { getCollectorNotificationVisual } from "./notificationRouting";

const row: NotificationRow = { id: "notice", user_id: "collector", type: "SYSTEM", title: "Route updated", body: "Original details.\nCheck with dispatch.", is_read: false, created_at: "2026-10-05T00:00:00Z" };

it("uses resident announcement wording and preserves its complete message", () => {
  expect(getCollectorNotificationPresentation({ ...row, type: "ANNOUNCEMENT", title: "Holiday collection" })).toEqual({
    headline: { prefix: "MENRO Candelaria", connector: "posted an announcement:", highlight: "Holiday collection" }, message: row.body,
  });
  expect(getCollectorNotificationPresentation({ ...row, ref_module: "announcements", title: "" }).headline.highlight).toBe("Official Notice");
});

it("uses the resident community-update preview for legacy post notifications", () => {
  const presentation = getCollectorNotificationPresentation({ ...row, type: "NEW_POST", title: "New Community Post", body: '"Sort your waste" is now available in Community Posts.', metadata: JSON.stringify({ category: "WASTE_TIP" }) });
  expect(presentation.headline.highlight).toBe("Sort your waste");
  expect(presentation.message).toBe("Read the latest waste tip in Community Updates.");
});

it("formats known dispatch messages while preserving custom dispatch titles", () => {
  expect(getCollectorNotificationPresentation({ ...row, ref_module: "driver-messages", title: "New Dispatch Message" })).toEqual({
    headline: { prefix: "Dispatch", connector: "sent a message", highlight: "" }, message: row.body,
  });
  expect(getCollectorNotificationPresentation({ ...row, ref_module: "driver-messages", title: "Urgent route instructions" }).headline.prefix).toBe("Urgent route instructions");
});

it("presents MENRO schedule alerts with their calendar destination and visual", () => {
  expect(getCollectorNotificationPresentation({ ...row, ref_module: "schedule", title: "MENRO briefing" })).toEqual({
    headline: { prefix: "MENRO Candelaria", connector: "added a new calendar event:", highlight: "MENRO briefing" }, message: row.body,
  });
  expect(getCollectorNotificationPresentation({ ...row, ref_module: "schedule", body: "Scheduled for 2026-10-18 to 2026-10-20 — Route planning." }).message)
    .toBe("Scheduled for October 18, 2026 through October 20, 2026.\nRoute planning.");
  expect(getCollectorNotificationVisual({ ...row, ref_module: "schedule" }).Icon).toBe(CalendarClock);
});

it.each(["SYSTEM", "COLLECTION_REMINDER", "COLLECTION_DONE", "MISSED_COLLECTION", "TRUCK_IS_NEAR", "REPORT_UPDATE"] as const)("preserves original %s route and system messages", (type) => {
  expect(getCollectorNotificationPresentation({ ...row, type, metadata: "invalid-json" })).toEqual({
    headline: { prefix: row.title, connector: "", highlight: "" }, message: row.body,
  });
});

it("keeps a safe fallback for empty titles and invalid metadata", () => {
  expect(getCollectorNotificationPresentation({ ...row, title: "", body: "", metadata: "[]" })).toEqual({
    headline: { prefix: "System update", connector: "", highlight: "" }, message: "",
  });
});

it("uses consistent icons for messages, content, announcements, and truck assignments", () => {
  expect(getCollectorNotificationVisual({ ...row, ref_module: "driver-messages" }).Icon).toBe(MessageSquare);
  expect(getCollectorNotificationVisual({ ...row, ref_module: "announcements" }).Icon).toBe(Megaphone);
  expect(getCollectorNotificationVisual({ ...row, type: "NEW_POST" }).Icon).toBe(Newspaper);
  expect(getCollectorNotificationVisual({ ...row, ref_module: "drivers" }).Icon).toBe(Truck);
});
