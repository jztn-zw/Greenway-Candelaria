import type { NotificationRow } from "@/services/notificationsService";
import { isValidDateOnly } from "@/utils/date";

const cleanTitle = (title: string) => title.replace(/🚨|⚠️|⚠/g, "").trim();

const getMetadata = (notification: NotificationRow): Record<string, unknown> => {
  try {
    const metadata = typeof notification.metadata === "string"
      ? JSON.parse(notification.metadata)
      : notification.metadata;
    return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  } catch {
    return {};
  }
};

/** Reads a safe calendar date from a schedule notification for its deep link. */
export const getResidentScheduleNotificationDate = (notification: NotificationRow): string | null => {
  if (notification.ref_module !== "schedule") return null;

  const metadataDate = getMetadata(notification).event_date;
  const metadataDateKey = typeof metadataDate === "string"
    ? metadataDate.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/)?.[1]
    : undefined;
  if (isValidDateOnly(metadataDateKey)) return metadataDateKey;

  const messageDateKey = notification.body?.match(/\bScheduled for\s+(\d{4}-\d{2}-\d{2})\b/i)?.[1];
  return isValidDateOnly(messageDateKey) ? messageDateKey : null;
};

/** One title/message contract for the resident feed, bell menu, and detail dialog. */
export const getResidentNotificationPresentation = (notification: NotificationRow) => {
  const title = cleanTitle(notification.title || "");
  const message = notification.body?.trim() || "";
  const metadata = getMetadata(notification);

  if (notification.ref_module === "schedule") {
    return {
      headline: { prefix: "MENRO Candelaria", connector: "added a calendar event:", highlight: title || "Calendar Schedule" },
      message,
    };
  }

  if (notification.ref_module === "announcements" || notification.type === "ANNOUNCEMENT") {
    return {
      headline: { prefix: "MENRO Candelaria", connector: "posted an announcement:", highlight: title || "Official Notice" },
      message,
    };
  }

  if (notification.ref_module === "posts" || notification.type === "NEW_POST") {
    // Existing notifications store the post title in the quoted body, not metadata.
    const legacyPost = message.match(/^["“]([\s\S]+)["”]\s+is now available in Community (?:Posts|Updates)\.$/i);
    const metadataTitle = typeof metadata.post_title === "string" ? metadata.post_title.trim() : "";
    const hasSpecificTitle = title && !/^new community (?:post|update)$/i.test(title);
    const postTitle = metadataTitle || legacyPost?.[1] || (hasSpecificTitle ? title : "");
    const category = String(metadata.category || "").toUpperCase();
    const subject = category === "WASTE_TIP" ? "waste tip" : category === "EVENT" ? "event update" : "community update";

    return {
      headline: {
        prefix: "MENRO Candelaria",
        connector: postTitle ? "posted a community update:" : "posted a new community update",
        highlight: postTitle,
      },
      message: legacyPost || !message ? `Read the latest ${subject} in Community Updates.` : message,
    };
  }

  return {
    headline: { prefix: title || "System Notification", connector: "", highlight: "" },
    message,
  };
};
