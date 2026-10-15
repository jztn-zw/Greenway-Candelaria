import type { NotificationRow } from "@/services/notificationsService";
import { getResidentNotificationPresentation } from "@/features/resident/notifications/notificationPresentation";
import { getCollectorNotificationTitle } from "./notificationRouting";

/** Shared message presentation for the collector feed, bell menu, and dialog. */
export const getCollectorNotificationPresentation = (notification: NotificationRow) => {
  const title = getCollectorNotificationTitle(notification);
  const message = notification.body?.trim() || "";

  if (notification.ref_module === "schedule") {
    return { headline: { prefix: "MENRO Candelaria", connector: "added a schedule:", highlight: title || "Calendar Schedule" }, message };
  }

  if (notification.ref_module === "announcements" || notification.type === "ANNOUNCEMENT" ||
      notification.ref_module === "posts" || notification.type === "NEW_POST") {
    return getResidentNotificationPresentation(notification);
  }

  if (notification.ref_module === "driver-messages" && /^New Dispatch Message$/i.test(title)) {
    return { headline: { prefix: "Dispatch", connector: "sent a message", highlight: "" }, message };
  }

  // Keep the original route, assignment, and custom alert details.
  return { headline: { prefix: title, connector: "", highlight: "" }, message };
};
