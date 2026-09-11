import type {
  ResidentAccountStatus,
  ResidentDetailsRow,
  ResidentListRow,
  ResidentReportRow,
} from "@/services/residentManagerService";
import type { Resident, ResidentReport } from "./types";

const formatResidentDate = (value?: string | null): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const toTitleCase = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const mapResidentStatus = (status: ResidentAccountStatus): Resident["status"] =>
  status === "ACTIVE" ? "Active" : "Deactivated";

const mapResidentReportStatus = (status: string): ResidentReport["status"] => {
  const normalizedStatus = String(status || "").toUpperCase();
  if (normalizedStatus === "RESOLVED") return "Resolved";
  if (normalizedStatus === "UNDER_REVIEW" || normalizedStatus === "DISPATCHED") {
    return "Under Review";
  }
  return "Pending";
};

const mapResidentReportRow = (row: ResidentReportRow): ResidentReport => ({
  referenceNumber: row.reference_number,
  violationType: toTitleCase(row.violation_type),
  dateSubmitted: formatResidentDate(row.created_at),
  status: mapResidentReportStatus(row.status),
});

export const mapResidentListRow = (row: ResidentListRow): Resident => ({
  id: row.id,
  fullName: row.full_name,
  username: row.username,
  email: row.email,
  phone: row.phone || "N/A",
  barangay: row.barangay_name || "Unassigned",
  dateRegistered: formatResidentDate(row.created_at),
  lastLogin: formatResidentDate(row.last_login_at),
  status: mapResidentStatus(row.status),
  reports: [],
});

export const mapResidentDetails = (
  details: ResidentDetailsRow,
  reports: ResidentReportRow[],
): Resident => ({
  id: details.id,
  fullName: details.full_name,
  username: details.username,
  email: details.email,
  phone: details.phone || "N/A",
  barangay: details.barangay_name || "Unassigned",
  dateRegistered: formatResidentDate(details.created_at),
  lastLogin: formatResidentDate(details.last_login_at),
  status: mapResidentStatus(details.status),
  reports: reports.map(mapResidentReportRow),
});
