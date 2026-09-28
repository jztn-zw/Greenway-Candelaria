import type { NotificationRow } from "@/services/notificationsService";
import { getManilaNow } from "@/utils/date";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  Megaphone,
  SkipForward,
  Truck,
} from "lucide-react";

const referenceId = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export const getMetadata = (notification: NotificationRow): Record<string, unknown> => {
  if (!notification.metadata) return {};
  if (typeof notification.metadata === "string") {
    try {
      const parsed: unknown = JSON.parse(notification.metadata);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof notification.metadata === "object" && !Array.isArray(notification.metadata) ? notification.metadata : {};
};

export const getCollectorNotificationDestination = (notification: NotificationRow): string | null => {
  const metadata = getMetadata(notification);
  const destination = metadata.destination;

  if (destination === "route-map") {
    if (metadata.collection_date !== getManilaNow().dateKey) return null;
    const templates = Array.isArray(metadata.route_ids)
      ? metadata.route_ids.filter(referenceId)
      : notification.ref_module === "routes" && referenceId(notification.ref_id) ? [notification.ref_id] : [];
    const runId = referenceId(metadata.run_id) ? metadata.run_id : null;
    if (!templates.length && !runId) return null;
    const params = new URLSearchParams({ date: metadata.collection_date as string });
    [...new Set(templates)].forEach(id => params.append("template", id));
    if (runId) params.set("run", runId);
    return `/collector/route-map?${params}`;
  }
  if (destination === "route-history" && referenceId(metadata.run_id)) {
    return `/collector/route-history?route=${encodeURIComponent(metadata.run_id)}`;
  }
  if (destination === "profile") return "/collector/profile";
  if (destination === "messages") return null;

  if (notification.ref_module === "routes") return null;
  if (notification.ref_module === "drivers") return "/collector/profile";
  if (notification.ref_module === "driver-messages") return null;
  return null;
};

// The map displays the current assignment. Keep notification references in the URL
// so a completed, cancelled, or reassigned route cannot silently show another run.
export const matchesCollectorRouteAlert = (
  params: URLSearchParams,
  route: { routeId: string; templateRouteId?: string | null } | null,
) => {
  const date = params.get("date");
  const templates = params.getAll("template");
  const runId = params.get("run");
  if (!date && !templates.length && !runId) return true;
  return Boolean(
    route && date === getManilaNow().dateKey && (templates.length || runId)
    && (!templates.length || (route.templateRouteId && templates.includes(route.templateRouteId)))
    && (!runId || runId === route.routeId),
  );
};

export const openCollectorNotification = (notification: NotificationRow, navigate: (destination: string) => void) => {
  if (notification.ref_module === "driver-messages") {
    openCollectorMessage(notification);
    return true;
  }
  const destination = getCollectorNotificationDestination(notification);
  if (!destination) return false;
  navigate(destination);
  return true;
};

export const getCollectorNotificationCategory = (notification: NotificationRow) => {
  if (notification.ref_module === "routes" || notification.ref_module === "tracking") return "routes";
  if (notification.ref_module === "announcements" || notification.type === "ANNOUNCEMENT") return "announcements";
  return "dispatch";
};

export const getCollectorNotificationTitle = (notification: NotificationRow) => {
  return (notification.title || "").replace(/(?:🚨|⚠️)/gu, "").trim() || "System update";
};

export const getCollectorNotificationVisual = (notification: NotificationRow) => {
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
  if (notification.ref_module === "routes" || notification.ref_module === "tracking") {
    return { Icon: Truck, style: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" };
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

export const openCollectorMessage = (notification: NotificationRow) => {
  const metadata = getMetadata(notification);
  window.dispatchEvent(new CustomEvent("collector:open-messages", { detail: {
    messageId: typeof metadata.message_id === "string" ? metadata.message_id : undefined,
    routeId: typeof metadata.route_id === "string" ? metadata.route_id : undefined,
  } }));
};
