import { parseApiTimestamp } from "@/utils/date";

export const safeFormatDate = (
  dateVal?: string | Date | null,
  formatStr = "MMM d, yyyy",
  fallback = "—",
): string => {
  if (!dateVal) return fallback;
  try {
    const d = parseApiTimestamp(dateVal);
    if (!d) return fallback;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(d);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
    if (formatStr === "h:mm a") return `${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
    if (formatStr === "MMM d, h:mm a") return `${part("month")} ${part("day")}, ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
    if (formatStr === "yyyy-MM-dd HH:mm") {
      const numeric = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
      const numericPart = (type: Intl.DateTimeFormatPartTypes) => numeric.find((item) => item.type === type)?.value || "";
      return `${numericPart("year")}-${numericPart("month")}-${numericPart("day")} ${numericPart("hour")}:${numericPart("minute")}`;
    }
    return `${part("month")} ${part("day")}, ${part("year")}`;
  } catch {
    return fallback;
  }
};

export type ViolationType =
  | "Illegal Dumping"
  | "Missed Collection"
  | "Overflowing Bin"
  | "Improper Segregation"
  | "Open Burning"
  | "Littering"
  | "Other";

export type ReportStatus = "Submitted" | "Under Review" | "Dispatched" | "Resolved";

export type ReportPriority = "High" | "Medium" | "Low";

export const VIOLATION_TYPE_TO_LABEL: Record<string, ViolationType> = {
  ILLEGAL_DUMPING: "Illegal Dumping",
  MISSED_COLLECTION: "Missed Collection",
  OVERFLOWING_BIN: "Overflowing Bin",
  IMPROPER_SEGREGATION: "Improper Segregation",
  OPEN_BURNING: "Open Burning",
  LITTERING: "Littering",
  OTHER: "Other",
};

export const VIOLATION_LABEL_TO_BACKEND: Record<string, string> = {
  "Illegal Dumping": "ILLEGAL_DUMPING",
  "Missed Collection": "MISSED_COLLECTION",
  "Overflowing Bin": "OVERFLOWING_BIN",
  "Improper Segregation": "IMPROPER_SEGREGATION",
  "Open Burning": "OPEN_BURNING",
  "Littering": "LITTERING",
  "Other": "OTHER",
};

export const STATUS_TO_LABEL: Record<string, ReportStatus> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  DISPATCHED: "Dispatched",
  RESOLVED: "Resolved",
};

export const STATUS_LABEL_TO_BACKEND: Record<string, string> = {
  Submitted: "SUBMITTED",
  "Under Review": "UNDER_REVIEW",
  Dispatched: "DISPATCHED",
  Resolved: "RESOLVED",
};

export const PRIORITY_TO_LABEL: Record<string, ReportPriority> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const PRIORITY_LABEL_TO_BACKEND: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
  High: "HIGH",
  Medium: "MEDIUM",
  Low: "LOW",
};

export const statusBadgeStyles: Record<ReportStatus, { badge: string; dot: string }> = {
  Submitted: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  "Under Review": {
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
  },
  Dispatched: {
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    dot: "bg-purple-500",
  },
  Resolved: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
};

export const priorityBadgeStyles: Record<ReportPriority, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/20",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Low: "bg-muted text-muted-foreground border-border/80",
};

export const violationBadgeStyles: Record<ViolationType, string> = {
  "Illegal Dumping": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  "Missed Collection": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Overflowing Bin": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  "Improper Segregation": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  "Open Burning": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  "Littering": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Other: "bg-muted text-muted-foreground border-border/80",
};

export interface PhotoAnnotation {
  id: string;
  type: "circle" | "arrow";
  x: number;
  y: number;
  radius?: number;
  endX?: number;
  endY?: number;
}

export interface ReportPhoto {
  id: string;
  url: string;
  annotations?: PhotoAnnotation[];
}

export interface StatusHistoryEntry {
  id: string;
  status: ReportStatus;
  timestamp: string;
  adminName: string;
}

export interface InternalNote {
  id: string;
  text: string;
  timestamp: string;
  adminName: string;
}

export interface WasteReport {
  id: string;
  referenceNumber: string;
  violationType: ViolationType;
  violationTypeRaw: string;
  barangay: string;
  barangayId: string;
  street?: string;
  description: string;
  submittedAt: string;
  submitterName: string;
  submitterEmail?: string;
  photos: ReportPhoto[];
  priority: ReportPriority;
  status: ReportStatus;
  statusHistory: StatusHistoryEntry[];
  officialResponse?: string;
  internalNotes: InternalNote[];
  isDuplicate: boolean;
  duplicateOfId?: string;
  duplicateOfReference?: string;
  duplicateReason?: string;
  falseReason?: string;
  isFalseReport: boolean;
}
