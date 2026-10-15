import { expect, it } from "vitest";
import type { MyReportRow } from "@/services/reportsService";
import { getReportStatusConfig, mapMyReport } from "./myReports.utils";

it("uses the same resolved status label for invalid, duplicate, and regular closures", () => {
  const report: MyReportRow = {
    id: "report-1", reference_number: "RPT-1", barangay_id: "area-1", barangay_name: "Example", barangay_zone: null,
    violation_type: "LITTERING", landmark: "Example street", description: "Report fixture", status: "RESOLVED", is_false: 1,
    admin_response: "Closed as invalid. Review reason: Insufficient evidence.", pin_lat: null, pin_lng: null,
    created_at: "2026-10-15T00:00:00Z", updated_at: "2026-10-15T01:00:00Z", photos: [],
    status_history: [{ id: "history-1", report_id: "report-1", status: "RESOLVED", changed_by: "admin-1", changed_by_name: "MENRO", created_at: "2026-10-15T01:00:00Z" }],
  };
  const invalid = mapMyReport(report);
  expect(invalid.status).toBe("resolved");
  expect(getReportStatusConfig(invalid).label).toBe("Resolved");
  expect(invalid.statusHistory?.[0].label).toBe("Issue resolved");
  const resolved = mapMyReport({ ...report, is_false: 0 });
  expect(getReportStatusConfig(resolved).label).toBe("Resolved");
  expect(resolved.statusHistory?.[0].label).toBe("Issue resolved");
  const duplicate = mapMyReport({ ...report, is_false: 0, is_duplicate: 1 });
  expect(duplicate.status).toBe("resolved");
  expect(getReportStatusConfig(duplicate).label).toBe("Resolved");
  expect(duplicate.statusHistory?.[0].label).toBe("Issue resolved");
});
