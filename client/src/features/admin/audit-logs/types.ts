export type ActionSeverity = "routine" | "positive" | "change" | "critical";

export type AuditModule =
  | "Accounts"
  | "Posts"
  | "Announcements"
  | "Waste Reports"
  | "Route Manager"
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
    badge: "bg-muted/60 text-foreground/80 border-border/70",
    dot: "bg-muted-foreground/60",
    text: "Routine",
  },
  positive: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    text: "Restoration",
  },
  change: {
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    text: "Modification",
  },
  critical: {
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
    text: "Critical",
  },
};

const neutralModuleBadge =
  "bg-muted/60 text-muted-foreground border-border/70 font-medium";

export const moduleBadgeStyles: Record<string, string> = {
  Accounts: neutralModuleBadge,
  Posts: neutralModuleBadge,
  Announcements: neutralModuleBadge,
  "Waste Reports": neutralModuleBadge,
  "Route Manager": neutralModuleBadge,
  "Resident Manager": neutralModuleBadge,
  "Driver Manager": neutralModuleBadge,
  "Collection Schedule": neutralModuleBadge,
  "Barangay Manager": neutralModuleBadge,
  "Landing Page": neutralModuleBadge,
  Analytics: neutralModuleBadge,
};
