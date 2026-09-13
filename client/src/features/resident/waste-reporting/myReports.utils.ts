import type { MyReportRow } from "@/services/reportsService";
import { parseApiTimestamp } from "@/utils/date";
import {
  STATUS_REVERSE_MAP,
  VIOLATION_TYPE_REVERSE_MAP,
  type ReportStatus,
  type SubmittedReport,
} from "./types";

export const MY_REPORTS_PAGE_SIZE = 10;

export type ReportFilterTab = "all" | ReportStatus;
export type ReportSortOption = "newest" | "oldest";

export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; className: string; order: number }
> = {
  submitted: {
    label: "Submitted",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25",
    order: 1,
  },
  "under-review": {
    label: "Under Review",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25",
    order: 2,
  },
  dispatched: {
    label: "Dispatched",
    className:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/25",
    order: 3,
  },
  resolved: {
    label: "Resolved",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
    order: 4,
  },
};

export const REPORT_FILTER_TABS: { value: ReportFilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Pending" },
  { value: "under-review", label: "Under Review" },
  { value: "dispatched", label: "Dispatched" },
  { value: "resolved", label: "Resolved" },
];

export const VIOLATION_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  "illegal-dumping": {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/25",
  },
  "missed-collection": {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/25",
  },
  "overflowing-bin": {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/25",
  },
  "open-burning": {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/25",
  },
  littering: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/25",
  },
  "improper-segregation": {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/25",
  },
  other: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/25",
  },
};

export const getViolationStyle = (type: string) => {
  return (
    VIOLATION_TYPE_COLORS[type] ?? {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/25",
    }
  );
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    SUBMITTED: "Report submitted",
    UNDER_REVIEW: "Under review by MENRO",
    DISPATCHED: "Collection crew dispatched",
    RESOLVED: "Issue resolved",
  };
  return labels[status] ?? status;
};

export const mapMyReport = (report: MyReportRow): SubmittedReport => ({
  id: report.id,
  referenceNumber: report.reference_number,
  violationType: VIOLATION_TYPE_REVERSE_MAP[report.violation_type] ?? "other",
  barangayName: report.barangay_name,
  streetOrLandmark: report.landmark ?? "",
  description: report.description,
  photoCount: report.photos?.length ?? 0,
  photos: report.photos?.map((photo) => photo.url) ?? [],
  status: STATUS_REVERSE_MAP[report.status] ?? "submitted",
  submittedAt: parseApiTimestamp(report.created_at) ?? new Date(0),
  updatedAt: parseApiTimestamp(report.updated_at) ?? new Date(0),
  adminResponse: report.admin_response ?? undefined,
  statusHistory: (report.status_history ?? []).map((historyEntry) => ({
    status: STATUS_REVERSE_MAP[historyEntry.status] ?? "submitted",
    timestamp: parseApiTimestamp(historyEntry.created_at) ?? new Date(0),
    label: statusLabel(historyEntry.status),
  })),
});
