import { AlertTriangle, Bell, CalendarDays, CheckCircle2, FileText, Megaphone, MessageSquare, Newspaper, Truck } from "lucide-react";
import type { NotificationRow } from "@/services/notificationsService";
import { getResidentNotificationPresentation } from "@/features/resident/notifications/notificationPresentation";

export type AdminCategory = "all" | "operations" | "reports" | "content" | "announcements";

export const getAdminCategory = (notification: NotificationRow): AdminCategory => {
  const { ref_module: module, type } = notification;
  if (module === "reports" || type === "REPORT_UPDATE") return "reports";
  if (module === "announcements" || type === "ANNOUNCEMENT") return "announcements";
  if (module === "posts" || type === "NEW_POST") return "content";
  if (["tracking", "routes", "drivers", "trucks", "truck-breakdowns", "schedule", "driver-messages"].includes(module || "") ||
    ["COLLECTION_REMINDER", "TRUCK_IS_NEAR", "COLLECTION_DONE", "MISSED_COLLECTION"].includes(type)) return "operations";
  return "all";
};

export const getAdminNotificationMetadata = (notification: Pick<NotificationRow, "metadata">): Record<string, unknown> => {
  try {
    const metadata = typeof notification.metadata === "string" ? JSON.parse(notification.metadata) : notification.metadata;
    return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  } catch {
    return {};
  }
};

/** One headline/message contract for the admin feed, bell menu, and detail dialog. */
export const getAdminNotificationPresentation = (notification: NotificationRow) => {
  const cleanedTitle = (notification.title || "").replace(/🚨|⚠️|⚠/g, "").trim();
  const repeatedTitle = cleanedTitle.match(/^(.+?):\s*\1$/i);
  const normalizedTitle = repeatedTitle ? repeatedTitle[1] : cleanedTitle;
  const title = normalizedTitle || "System Notification";
  const message = notification.body?.trim() || "";
  const category = getAdminCategory(notification);

  if (category === "content" || category === "announcements") {
    const presentation = getResidentNotificationPresentation({ ...notification, title: normalizedTitle });
    // Generated post previews use the module name shown in the admin portal.
    return { ...presentation, message: category === "content" && presentation.message !== message
      ? presentation.message.replace("in Community Updates.", "in Community Posts.") : presentation.message };
  }

  const newReport = title.match(/^New Report:\s*(.+)$/i);
  if (category === "reports" && newReport) {
    return { headline: { prefix: "A resident", connector: "submitted a waste report:", highlight: newReport[1] }, message };
  }

  const collectorMessage = title.match(/^New Collector Message:\s*(.+)$/i);
  if (collectorMessage) {
    return { headline: { prefix: collectorMessage[1], connector: "sent a message", highlight: "" }, message };
  }

  const breakdown = title.match(/^Truck breakdown(?::\s*(.+))?$/i);
  if (notification.ref_module === "truck-breakdowns" && breakdown) {
    const metadata = getAdminNotificationMetadata(notification);
    const driver = typeof metadata.driver_name === "string" ? metadata.driver_name.trim() : "";
    const truckName = typeof metadata.truck_name === "string" ? metadata.truck_name.trim() : "";
    const truckPlate = typeof metadata.truck_plate === "string" ? metadata.truck_plate.trim() : "";
    const truck = truckName || truckPlate || breakdown[1] || "";
    return { headline: { prefix: driver || "A collector", connector: truck ? "reported a truck breakdown:" : "reported a truck breakdown", highlight: truck }, message };
  }

  const routeOutcome = title.match(/^Route (Completed|Ended):\s*(.+)$/i);
  if (routeOutcome) {
    return { headline: { prefix: routeOutcome[2], connector: routeOutcome[1].toLowerCase() === "completed" ? "completed its route" : "ended its route", highlight: "" }, message };
  }

  const gpsLost = title.match(/^GPS Signal Lost:\s*(.+)$/i);
  if (gpsLost) {
    return { headline: { prefix: gpsLost[1], connector: "lost its GPS signal", highlight: "" }, message };
  }

  // Preserve custom and historical alert details instead of inventing an actor or outcome.
  return { headline: { prefix: title, connector: "", highlight: "" }, message };
};

export const getNotificationIconAndStyle = (notification: NotificationRow) => {
  const category = getAdminCategory(notification);
  if (category === "reports") return { Icon: FileText, style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
  if (category === "announcements") return { Icon: Megaphone, style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  if (category === "content") return { Icon: Newspaper, style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
  if (notification.type === "MISSED_COLLECTION") return { Icon: AlertTriangle, style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  if (notification.type === "COLLECTION_DONE") return { Icon: CheckCircle2, style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  if (category === "operations") return {
    Icon: notification.ref_module === "truck-breakdowns" ? AlertTriangle : notification.type === "SYSTEM" ? MessageSquare : notification.type === "COLLECTION_REMINDER" ? CalendarDays : Truck,
    style: notification.ref_module === "truck-breakdowns" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" : "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  };
  return { Icon: Bell, style: "bg-primary/10 text-primary border-primary/20" };
};

export const getAdminNotificationDestination = (notification: NotificationRow): string | null => {
  if (notification.ref_module === "truck-breakdowns") return null;
  const category = getAdminCategory(notification);
  const id = notification.ref_id ? encodeURIComponent(notification.ref_id) : null;
  if (notification.ref_module === "driver-messages") {
    const metadata = getAdminNotificationMetadata(notification);
    if (typeof metadata.driver_id === "string" && typeof metadata.message_id === "string") {
      return `/admin/tracking?messageDriver=${encodeURIComponent(metadata.driver_id)}&message=${encodeURIComponent(metadata.message_id)}`;
    }
    return "/admin/tracking";
  }
  if (category === "reports") return id ? `/admin/reports?report=${id}` : "/admin/reports";
  if (category === "content") return id ? `/admin/posts?post=${id}` : "/admin/posts";
  if (category === "announcements") return "/admin/announcements";
  if (notification.ref_module === "schedule" || notification.type === "COLLECTION_REMINDER") return "/admin/schedule";
  if (category === "operations") return "/admin/tracking";
  return null;
};
