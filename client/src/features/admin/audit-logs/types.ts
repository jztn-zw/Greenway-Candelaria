import { badgeStyles } from "@/components/ui/badgeStyles";
export type ActionSeverity = "routine" | "positive" | "change" | "critical";

export type AuditModule =
  | "Accounts"
  | "Posts"
  | "Announcements"
  | "Waste Reports"
  | "Route Manager"
  | "Truck Manager"
  | "Resident Manager"
  | "Driver Manager"
  | "Landing Page"
  | "Collection Schedule"
  | "Barangay Manager"
  | "Analytics";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  adminRole: string;
  actionType: string;
  module: AuditModule;
  affectedRecord: string;
  summary: string;
  severity: ActionSeverity;
  beforeValue?: string;
  afterValue?: string;
  ipAddress: string;
  metadata?: Record<string, string>;
}

export const safeFormatDate = (
  dateVal?: string | Date | null,
  formatStr = "MMM d, yyyy",
  fallback = "—",
): string => {
  if (!dateVal) return fallback;
  try {
    const str = typeof dateVal === "string"
      ? (/^\d{4}-\d{2}-\d{2}/.test(dateVal) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(dateVal)
        ? `${dateVal.replace(" ", "T")}Z`
        : dateVal)
      : dateVal;
    const d = new Date(str);
    if (isNaN(d.getTime())) return fallback;

    const date = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);

    if (formatStr === "MMM d, yyyy") return date;
    if (formatStr === "h:mm a") return time;
    return `${date} · ${time}`;
  } catch {
    return fallback;
  }
};

export const severityStyles: Record<
  ActionSeverity,
  { badge: string; dot: string; text: string }
> = {
  routine: {
    badge: badgeStyles.neutral.className,
    dot: badgeStyles.neutral.dot,
    text: "Routine",
  },
  positive: {
    badge: badgeStyles.success.className,
    dot: badgeStyles.success.dot,
    text: "Restoration",
  },
  change: {
    badge: badgeStyles.warning.className,
    dot: badgeStyles.warning.dot,
    text: "Modification",
  },
  critical: {
    badge: badgeStyles.error.className,
    dot: badgeStyles.error.dot,
    text: "Critical",
  },
};

const neutralModuleBadge =
  badgeStyles.neutral.className + " font-medium";

export const moduleBadgeStyles: Record<string, string> = {
  Accounts: neutralModuleBadge,
  Posts: neutralModuleBadge,
  Announcements: neutralModuleBadge,
  "Waste Reports": neutralModuleBadge,
  "Route Manager": neutralModuleBadge,
  "Truck Manager": neutralModuleBadge,
  "Resident Manager": neutralModuleBadge,
  "Driver Manager": neutralModuleBadge,
  "Collection Schedule": neutralModuleBadge,
  "Barangay Manager": neutralModuleBadge,
  "Landing Page": neutralModuleBadge,
  Analytics: neutralModuleBadge,
};
