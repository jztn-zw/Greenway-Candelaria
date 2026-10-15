import { describe, expect, it } from "vitest";
import type { NotificationRow } from "@/services/notificationsService";
import { getResidentNotificationPresentation, getResidentScheduleNotificationDate } from "./notificationPresentation";

const notification = (overrides: Partial<NotificationRow> = {}): NotificationRow => ({
  id: "notice", user_id: "resident", type: "NEW_POST", title: "New Community Post",
  body: '"sadsad" is now available in Community Posts.', is_read: false,
  ref_module: "posts", created_at: "2026-10-03 00:00:00", ...overrides,
});

describe("resident notification presentation", () => {
  it("gets a valid schedule date from metadata and falls back to its message", () => {
    expect(getResidentScheduleNotificationDate(notification({
      ref_module: "schedule", metadata: { event_date: "2099-01-01T00:00:00.000Z" }, body: "Scheduled for 2099-02-02.",
    }))).toBe("2099-01-01");
    expect(getResidentScheduleNotificationDate(notification({
      ref_module: "schedule", metadata: { event_date: "2099-02-30" }, body: "Scheduled for 2099-02-02.",
    }))).toBe("2099-02-02");
    expect(getResidentScheduleNotificationDate(notification({
      ref_module: "schedule", metadata: { event_date: "not-a-date" }, body: "Scheduled for 2099-02-30.",
    }))).toBeNull();
  });

  it("puts an existing post's title in the headline and uses the resident module name", () => {
    expect(getResidentNotificationPresentation(notification({ metadata: { category: "WASTE_TIP" } }))).toEqual({
      headline: { prefix: "MENRO Candelaria", connector: "posted a community update:", highlight: "sadsad" },
      message: "Read the latest waste tip in Community Updates.",
    });
  });

  it("keeps quotes within legacy post titles intact", () => {
    expect(getResidentNotificationPresentation(notification({
      body: '"A "clean" community" is now available in Community Posts.',
    })).headline.highlight).toBe('A "clean" community');
  });

  it("accepts a post title from serialized metadata and preserves custom messages", () => {
    expect(getResidentNotificationPresentation(notification({
      metadata: JSON.stringify({ post_title: "Cleanup day", category: "EVENT" }),
      body: "Join the community cleanup this Saturday.",
    }))).toEqual({
      headline: { prefix: "MENRO Candelaria", connector: "posted a community update:", highlight: "Cleanup day" },
      message: "Join the community cleanup this Saturday.",
    });
  });

  it("handles missing post details and malformed metadata without repeating a generic title", () => {
    expect(getResidentNotificationPresentation(notification({ metadata: "{invalid", body: "" }))).toEqual({
      headline: { prefix: "MENRO Candelaria", connector: "posted a new community update", highlight: "" },
      message: "Read the latest community update in Community Updates.",
    });
  });

  it("uses the same announcement structure without changing announcement details", () => {
    expect(getResidentNotificationPresentation(notification({
      type: "ANNOUNCEMENT", ref_module: "announcements", title: "⚠️ Schedule advisory", body: "Collection starts at 6:00 AM.",
    }))).toEqual({
      headline: { prefix: "MENRO Candelaria", connector: "posted an announcement:", highlight: "Schedule advisory" },
      message: "Collection starts at 6:00 AM.",
    });
  });

  it("presents a schedule-linked announcement as a calendar event", () => {
    expect(getResidentNotificationPresentation(notification({
      type: "ANNOUNCEMENT", ref_module: "schedule", title: "Barangay clean-up", body: "Scheduled for 2099-01-01.",
    }))).toEqual({
      headline: { prefix: "MENRO Candelaria", connector: "added a calendar event:", highlight: "Barangay clean-up" },
      message: "Scheduled for 2099-01-01.",
    });
  });

  it.each<NotificationRow["type"]>(["COLLECTION_REMINDER", "TRUCK_IS_NEAR", "COLLECTION_DONE", "MISSED_COLLECTION", "REPORT_UPDATE", "SYSTEM"])(
    "preserves the title and important details for %s alerts",
    (type) => {
      const presentation = getResidentNotificationPresentation(notification({
        type, ref_module: null, title: "Report Updated: RPT-2026-00035", body: "Your report is now Dispatched (In Progress).",
      }));
      expect(presentation.headline.prefix).toBe("Report Updated: RPT-2026-00035");
      expect(presentation.message).toBe("Your report is now Dispatched (In Progress).");
    },
  );
});
