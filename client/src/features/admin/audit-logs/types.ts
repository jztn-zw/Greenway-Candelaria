import { format } from "date-fns";

export type ActionSeverity = "routine" | "change" | "critical";

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
    const str = typeof dateVal === "string" ? dateVal.replace(" ", "T") : dateVal;
    const d = new Date(str);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
};

export const severityStyles: Record<
  ActionSeverity,
  { badge: string; dot: string; text: string }
> = {
  routine: {
    badge: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
    text: "Routine",
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

export const moduleBadgeStyles: Record<string, string> = {
  Accounts: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Posts: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Announcements: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  "Waste Reports": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Route Manager": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  "Resident Manager": "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  "Driver Manager": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  "Collection Schedule": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  "Barangay Manager": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  "Landing Page": "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  Analytics: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};
