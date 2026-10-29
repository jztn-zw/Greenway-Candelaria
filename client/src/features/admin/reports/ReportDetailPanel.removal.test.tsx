import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import ReportDetailPanel from "./ReportDetailPanel";
import type { ReportStatus, WasteReport } from "./types";

const queries = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/adminQuery", () => ({ useAdminFetch: () => queries.fetch }));
vi.mock("@lottiefiles/dotlottie-react", () => ({ DotLottieReact: () => null }));
afterEach(cleanup);

it.each<ReportStatus>(["Submitted", "Under Review", "Dispatched", "Resolved"])("admins can inspect %s reports without any deletion action", status => {
  const report: WasteReport = {
    id: "report", referenceNumber: "RPT-2026-00001", violationType: "Littering", violationTypeRaw: "LITTERING",
    barangay: "Test area", barangayId: "area", description: "Fixture report", submittedAt: "2026-10-30T01:00:00Z",
    submitterName: "Fixture Resident", photos: [], status, statusHistory: [], internalNotes: [], isDuplicate: false, isFalseReport: false,
  };
  // Even an older caller passing its former callback cannot expose deletion.
  const legacyProps = { report, onDeleteReport: vi.fn(), onUpdateStatus: vi.fn(), onAddNote: vi.fn() };
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ReportDetailPanel {...legacyProps} /></MemoryRouter>);
  expect(screen.getByText("RPT-2026-00001")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /delete|remove report/i })).not.toBeInTheDocument();
});
