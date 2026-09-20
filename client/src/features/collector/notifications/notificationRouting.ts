import type { NotificationRow } from "@/services/notificationsService";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  Megaphone,
  SkipForward,
  Truck,
} from "lucide-react";

type CollectorNotificationDestination = "route-map" | "route-history" | "profile" | "messages";

const getMetadata = (notification: NotificationRow): Record<string, unknown> => {
  if (!notification.metadata) return {};
  if (typeof notification.metadata === "string") {
    try {
      return JSON.parse(notification.metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return notification.metadata;
};

export const getCollectorNotificationDestination = (notification: NotificationRow): string | null => {
  const metadata = getMetadata(notification);
  const destination = metadata.destination as CollectorNotificationDestination | undefined;

  if (destination === "route-map") return "/collector/route-map";
  if (destination === "route-history" && notification.ref_id) {
    return `/collector/route-history?route=${encodeURIComponent(notification.ref_id)}`;
  }
  if (destination === "profile") return "/collector/profile";
  if (destination === "messages") return null;

  if (notification.ref_module === "routes") return "/collector/route-map";
  if (notification.ref_module === "drivers") return "/collector/profile";
  if (notification.ref_module === "driver-messages") return null;
  return null;
};

export const getCollectorNotificationCategory = (notification: NotificationRow) => {
  if (notification.ref_module === "routes" || notification.ref_module === "tracking") return "routes";
  if (notification.ref_module === "announcements" || notification.type === "ANNOUNCEMENT") return "announcements";
  return "dispatch";
};

export const getCollectorNotificationTitle = (notification: NotificationRow) => {
  const title = (notification.title || "").replace(/[🚨⚠️]/g, "").trim();

  if (notification.ref_module === "driver-messages") return "New message from MENRO Office";
  if (notification.ref_module === "drivers") return "Truck assignment updated";
  if (notification.ref_module === "announcements" || notification.type === "ANNOUNCEMENT") {
    return "New community announcement";
  }
  if (notification.ref_module === "routes") {
    if (/assigned/i.test(title)) return "New route assigned";
    if (/cancelled/i.test(title)) return "Route cancelled";
    if (/active|updated/i.test(title)) return "Route updated";
  }

  return title || "System update";
};

export const getCollectorNotificationVisual = (notification: NotificationRow) => {
  if (notification.ref_module === "routes" || notification.ref_module === "tracking") {
    return { Icon: Truck, style: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" };
  }
  if (notification.type === "COLLECTION_REMINDER") {
    return { Icon: CalendarClock, style: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" };
  }
  if (notification.type === "COLLECTION_DONE") {
    return { Icon: CheckCircle2, style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  }
  if (notification.type === "MISSED_COLLECTION") {
    return { Icon: SkipForward, style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  }
  if (notification.type === "REPORT_UPDATE") {
    return { Icon: FileText, style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
  }
  if (notification.type === "ANNOUNCEMENT") {
    return { Icon: Megaphone, style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  }
  return { Icon: Bell, style: "bg-primary/10 text-primary border-primary/20" };
};

export const getCollectorNotificationLabel = (notification: NotificationRow) => {
  if (notification.ref_module === "routes" || notification.ref_module === "tracking") return "Route";
  if (notification.ref_module === "drivers") return "Assignment";
  if (notification.ref_module === "driver-messages") return "Dispatch";
  if (notification.ref_module === "announcements" || notification.type === "ANNOUNCEMENT") return "Announcement";
  return notification.type === "SYSTEM" ? "System" : "Alert";
};
