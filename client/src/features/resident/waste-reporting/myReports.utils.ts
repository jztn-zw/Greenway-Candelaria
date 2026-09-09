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
      "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 dark:bg-slate-500/20",
    order: 1,
  },
  "under-review": {
    label: "Under Review",
    className:
      "bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 dark:bg-blue-500/20",
    order: 2,
  },
  dispatched: {
    label: "Dispatched",
    className:
      "bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 dark:bg-purple-500/20",
    order: 3,
  },
  resolved: {
    label: "Resolved",
    className:
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 dark:bg-emerald-500/20",
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
