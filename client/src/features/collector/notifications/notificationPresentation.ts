import type { NotificationRow } from "@/services/notificationsService";
import { getResidentNotificationPresentation } from "@/features/resident/notifications/notificationPresentation";
import { getCollectorNotificationTitle } from "./notificationRouting";
import { formatDateOnly } from "@/utils/date";

const formatLegacyScheduleMessage = (message: string) => {
  const match = message.match(/^Scheduled for (\d{4}-\d{2}-\d{2})(?: to (\d{4}-\d{2}-\d{2}))?(?:\s+—\s+([\s\S]*))?$/i);
  if (!match) return message;
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const start = formatDateOnly(match[1], options);
  const end = match[2] ? formatDateOnly(match[2], options) : "";
  if (!start || (match[2] && !end)) return message;
  const details = match[3]?.trim();
  return `Scheduled for ${start}${end ? ` through ${end}` : ""}.${details ? `\n\nDetails: ${details}` : ""}`;
};

/** Shared message presentation for the collector feed, bell menu, and dialog. */
export const getCollectorNotificationPresentation = (notification: NotificationRow) => {
  const title = getCollectorNotificationTitle(notification);
  const message = notification.body?.trim() || "";

  if (notification.ref_module === "schedule") {
    return { headline: { prefix: "MENRO Candelaria", connector: "added a new calendar event:", highlight: title || "Calendar Schedule" }, message: formatLegacyScheduleMessage(message) };
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
