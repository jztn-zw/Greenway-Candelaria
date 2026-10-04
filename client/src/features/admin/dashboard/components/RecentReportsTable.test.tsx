import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { expect, it } from "vitest";
import RecentReportsTable from "./RecentReportsTable";
import type { DashboardReport } from "./useAdminDashboard";

const report: DashboardReport = {
  id: "report/42?test",
  reference_number: "RPT-2026-00042",
  violation_type: "ILLEGAL_DUMPING",
  barangay_name: "Poblacion",
  reporter_name: "Test Resident",
  status: "UNDER_REVIEW",
  created_at: "2026-10-03 10:00:00",
};

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}{location.search}</output>;
}

function renderReports(reports: DashboardReport[]) {
  return render(
    <MemoryRouter initialEntries={["/admin"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RecentReportsTable reports={reports} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

it("opens the correct report from the compact card with an encoded report ID", () => {
  renderReports([report]);
  const card = screen.getByRole("link", { name: `View report ${report.reference_number}` });
  expect(card).toHaveAttribute("href", "/admin/reports?report=report%2F42%3Ftest");
  expect(card).toHaveTextContent("Illegal Dumping");
  expect(card).toHaveTextContent("Poblacion");
  expect(card).toHaveTextContent("Under Review");
  card.focus();
  expect(document.activeElement).toBe(card);
  fireEvent.click(card);
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/admin/reports?report=report%2F42%3Ftest");
});

it("keeps separate compact cards linked to their own reports and statuses", () => {
  const second = { ...report, id: "report-43", reference_number: "RPT-2026-00043", status: "RESOLVED" as const };
  renderReports([report, second]);
  const card = screen.getByRole("link", { name: `View report ${second.reference_number}` });
  expect(card).toHaveTextContent("Resolved");
  expect(card).not.toHaveTextContent("Under Review");
  fireEvent.click(card);
  expect(screen.getByLabelText("Current route")).toHaveTextContent("/admin/reports?report=report-43");
});
