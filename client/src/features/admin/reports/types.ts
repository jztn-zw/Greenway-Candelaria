import { getStatusBadgeStyle, getCategoryBadgeColors } from "@/components/ui/badgeStyles";
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
    if (formatStr === "MMM d, yyyy · h:mm a") return `${part("month")} ${part("day")}, ${part("year")} · ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
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

export const statusBadgeStyles: Record<ReportStatus, { badge: string }> = {
  Submitted: {
    badge: getStatusBadgeStyle("Submitted").className,
  },
  "Under Review": {
    badge: getStatusBadgeStyle("Under Review").className,
  },
  Dispatched: {
    badge: getStatusBadgeStyle("Dispatched").className,
  },
  Resolved: {
    badge: getStatusBadgeStyle("Resolved").className,
  },
};

export const violationBadgeStyles: Record<ViolationType, string> = {
  "Illegal Dumping": getCategoryBadgeColors("Illegal Dumping").className,
  "Missed Collection": getCategoryBadgeColors("Missed Collection").className,
  "Overflowing Bin": getCategoryBadgeColors("Overflowing Bin").className,
  "Improper Segregation": getCategoryBadgeColors("Improper Segregation").className,
  "Open Burning": getCategoryBadgeColors("Open Burning").className,
  Littering: getCategoryBadgeColors("Littering").className,
  Other: getCategoryBadgeColors("Other").className,
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
