export type BadgeTone = "primary" | "success" | "warning" | "info" | "violet" | "error" | "neutral";

export interface BadgeColorStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
  className: string;
}

const tone = (name: BadgeTone, dot: string): BadgeColorStyle => ({
  bg: `bg-badge-${name}`,
  text: `text-badge-${name}-foreground`,
  border: `border-badge-${name}-border`,
  dot,
  className: `bg-badge-${name} text-badge-${name}-foreground border-badge-${name}-border`,
});

export const badgeStyles: Record<BadgeTone, BadgeColorStyle> = {
  primary: tone("primary", "bg-primary"),
  success: tone("success", "bg-success"),
  warning: tone("warning", "bg-warning"),
  info: tone("info", "bg-info"),
  violet: tone("violet", "bg-violet-500"),
  error: tone("error", "bg-error"),
  neutral: tone("neutral", "bg-muted-foreground"),
};

const normalize = (label: string) => label.trim().toUpperCase().replace(/[\s_-]+/g, "_");

const statusTones: Record<string, BadgeTone> = {
  PUBLISHED: "success", ACTIVE: "success", AVAILABLE: "success", VERIFIED: "success",
  DONE: "success", COMPLETED: "success", ROUTE_COMPLETED: "success", COMPLETED_TODAY: "success",
  RESOLVED: "success", READ: "success", ROAD_READY: "success", ENABLED: "success",
  CLEARED: "success", EARNED: "success", COLLECTOR_LINKED: "success", "OPERATIONAL_/_READY": "success",
  PENDING: "warning", PENDING_REVIEW: "warning", SUBMITTED: "warning", SCHEDULED: "warning",
  SCHEDULED_TODAY: "warning", UPCOMING: "warning", WAITING: "warning", PAUSED: "warning",
  PARTIAL: "warning", PARTIALLY_COMPLETED: "warning", INCOMPLETE: "warning", OVERDUE: "warning", SKIPPED: "warning",
  UNDER_MAINTENANCE: "warning", MAINTENANCE: "warning", GPS_UNAVAILABLE: "warning",
  UNDER_REVIEW: "info", ONGOING: "info", IN_PROGRESS: "info", ON_ROUTE: "info",
  ON_THE_WAY: "info", COLLECTING: "info", COLLECTION_STARTED: "info", CURRENT: "info", CURRENT_TARGET: "info",
  CURRENT_STOP: "info", LIVE_ON_ROUTE: "info",
  DISPATCHED: "violet",
  CANCELLED: "error", CANCELED: "error", BANNED: "error", REJECTED: "error",
  MISSED: "error", ERROR: "error", FAILED: "error", UNPUBLISHED: "error", FALSE_REPORT: "error",
  DUPLICATE: "warning", IN_QUEUE: "warning", ATTENTION_REQUIRED: "warning",
  DRAFT: "neutral", ARCHIVED: "neutral", DEACTIVATED: "neutral", INACTIVE: "neutral",
  OFFLINE: "neutral", STANDBY: "neutral", STANDBY_SHIFT: "neutral", NO_ROUTE_TODAY: "neutral", NO_PICKUP_TODAY: "neutral",
  NO_COLLECTION: "neutral", NO_ROUTE_SCHEDULED: "neutral", UNREAD: "neutral", RESERVE: "neutral",
  NOT_COMPLETED: "neutral", STATUS_UNAVAILABLE: "neutral", NO_ACTIVE_COLLECTION: "neutral",
  UNASSIGNED: "neutral", NOT_ASSIGNED: "neutral", NOT_STARTED: "neutral", NOT_SENT: "neutral",
  READY_TO_START: "primary", LIVE: "primary", LIVE_UPDATES: "primary",
};

const categoryTones: Record<string, BadgeTone> = {
  WASTE_TIP: "success", BIODEGRADABLE: "success", NON_BIODEGRADABLE: "warning", RECYCLABLE: "warning",
  NON_BIO: "warning", RECYCLABLES: "warning", "NON_BIO_/_RECYCLABLES": "warning",
  CLEAN_UP_DRIVE: "success", CLEANUP_DRIVE: "success", WASTE_COLLECTION: "success",
  COLLECTION: "success", COLLECTION_SCHEDULE: "success", IMPROPER_SEGREGATION: "success",
  EVENT: "warning", COMMUNITY_EVENT: "warning", HOLIDAY: "warning", HOLIDAY_REMINDER: "warning",
  ILLEGAL_DUMPING: "warning", OPEN_BURNING: "warning",
  NEWS: "info", "NEWS_&_ADVISORY": "info", ANNOUNCEMENT: "info", NOTICE: "info",
  SYSTEM_MAINTENANCE: "info", PRIVATE_EVENT: "info", INTERNAL_EVENT: "info", MISSED_COLLECTION: "info",
  EMERGENCY: "error", EMERGENCY_ADVISORY: "error", OVERFLOWING_BIN: "error",
  LITTERING: "violet", OTHER: "neutral",
  SCHEDULE_CHANGE: "primary", GENERAL: "primary", GENERAL_NOTICE: "primary", OFFICIAL_NOTICE: "primary",
  FEATURED: "warning", MENRO_PRIVATE: "info", MENRO_PRIVATE_EVENT: "info",
  PUBLIC_COMMUNITY: "warning", PUBLIC_COMMUNITY_EVENT: "warning",
  COLLECTION_ROUTE: "success", COLLECTION_ROUTE_SCHEDULE: "success",
};

export const getStatusBadgeStyle = (label: string): BadgeColorStyle =>
  badgeStyles[statusTones[normalize(label)] ?? "neutral"];

export const getCategoryBadgeColors = (label: string): BadgeColorStyle =>
  badgeStyles[categoryTones[normalize(label)] ?? "primary"];
