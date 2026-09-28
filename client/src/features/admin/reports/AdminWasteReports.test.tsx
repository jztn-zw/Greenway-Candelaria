import { notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminReportItem, AdminReportsResponse } from "@/services/reportsService";
import { fetchAdminReportById, fetchAdminReports, updateAdminReportStatus } from "@/services/reportsService";
import AdminWasteReports from "./AdminWasteReports";

vi.mock("@/services/reportsService", () => ({
  fetchAdminReports: vi.fn(),
  fetchAdminReportById: vi.fn(),
  updateAdminReportStatus: vi.fn(),
  flagAdminReport: vi.fn(),
  addAdminReportNote: vi.fn(),
  deleteReport: vi.fn(),
}));

vi.mock("./ReportKPIs", () => ({ default: () => null }));
vi.mock("./ReportFilters", () => ({
  default: ({ onStatusFilterChange }: { onStatusFilterChange: (status: string) => void }) => (
    <>
      <button onClick={() => onStatusFilterChange("Submitted")}>Filter submitted</button>
      <button onClick={() => onStatusFilterChange("Resolved")}>Filter resolved</button>
    </>
  ),
}));
vi.mock("./ReportListTable", () => ({
  default: ({ reports, onSelect }: { reports: Array<{ id: string }>; onSelect: (id: string) => void }) => (
    <div>
      {reports.map((report) => (
        <button key={report.id} onClick={() => onSelect(report.id)}>
          Select {report.id}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("./ReportDetailPanel", () => ({
  default: ({ report, onUpdateStatus, onClose }: {
    report: { id: string };
    onUpdateStatus: (status: string) => Promise<void>;
    onClose: () => void;
  }) => (
    <div>
      <span data-testid="report-detail">{report.id}</span>
      <button onClick={() => void onUpdateStatus("UNDER_REVIEW")}>Update status</button>
      <button onClick={onClose}>Close detail</button>
    </div>
  ),
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const report = (id: string): AdminReportItem => ({
  id,
  reference_number: `RPT-${id}`,
  user_id: null,
  barangay_id: "barangay-1",
  barangay_name: "Barangay 1",
  barangay_zone: null,
  reporter_name: "Resident",
  reporter_email: null,
  violation_type: "MISSED_COLLECTION",
  landmark: null,
  description: "Missed collection on this street",
  status: "SUBMITTED",
  admin_response: null,
  is_false: false,
  is_duplicate: false,
  duplicate_of_id: null,
  duplicate_reason: null,
  false_reason: null,
  duplicate_flagged_by: null,
  false_flagged_by: null,
  duplicate_flagged_at: null,
  false_flagged_at: null,
  pin_lat: null,
  pin_lng: null,
  created_at: "2026-09-25T00:00:00Z",
  updated_at: "2026-09-25T00:00:00Z",
  photos: [],
});

describe("AdminWasteReports detail selection", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    notifyManager.setScheduler(queueMicrotask);
    useAuthStore.setState({ user: { id: "admin-test", role: "ADMIN" } as never });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    vi.mocked(fetchAdminReports).mockResolvedValue({
      reports: [report("A"), report("B")],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
      kpis: { total: 2, submitted: 2, under_review: 0, dispatched: 0, resolved: 0, pending: 2 },
    } satisfies AdminReportsResponse);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  });

  const clickButton = async (host: HTMLElement, label: string) => {
    const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent === label);
    if (!button) throw new Error(`Missing button: ${label}`);
    await act(async () => button.click());
  };

  const renderDashboard = async () => {
    await act(async () => root.render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AdminWasteReports /></QueryClientProvider>
      </MemoryRouter>,
    ));
  };

  it("keeps the latest report visible and sends actions to that report when requests finish out of order", async () => {
    const resolvers = new Map<string, (value: AdminReportItem) => void>();
    vi.mocked(fetchAdminReportById).mockImplementation((id) => new Promise((resolve) => {
      resolvers.set(id, resolve);
    }));
    vi.mocked(updateAdminReportStatus).mockImplementation(async (id) => report(id));

    await renderDashboard();
    await clickButton(host, "Select A");
    await clickButton(host, "Select B");

    await act(async () => resolvers.get("B")?.(report("B")));
    expect(host.querySelector('[data-testid="report-detail"]')?.textContent).toBe("B");
    await act(async () => resolvers.get("A")?.(report("A")));
    expect(host.querySelector('[data-testid="report-detail"]')?.textContent).toBe("B");

    await clickButton(host, "Update status");
    expect(updateAdminReportStatus).toHaveBeenCalledWith("B", {
      status: "UNDER_REVIEW",
      admin_response: undefined,
    });
  });

  it("does not reopen a closed detail when its request finishes", async () => {
    let resolveDetail: (value: AdminReportItem) => void = () => undefined;
    vi.mocked(fetchAdminReportById).mockImplementation(() => new Promise((resolve) => {
      resolveDetail = resolve;
    }));

    await renderDashboard();
    await clickButton(host, "Select A");
    await clickButton(host, "Close detail");
    await act(async () => resolveDetail(report("A")));

    expect(host.querySelector('[data-testid="report-detail"]')).toBeNull();
  });

  it("ignores an older list response after a filter changes", async () => {
    let resolveOld: (value: AdminReportsResponse) => void = () => undefined;
    vi.mocked(fetchAdminReports).mockImplementation((params) => {
      if (params?.status === "RESOLVED") return Promise.resolve({
        reports: [report("NEW")], total: 1, page: 1, limit: 10, totalPages: 1,
        kpis: { total: 1, submitted: 0, under_review: 0, dispatched: 0, resolved: 1, pending: 0 },
      });
      if (params?.status === "SUBMITTED") return new Promise((resolve) => { resolveOld = resolve; });
      return Promise.resolve({
        reports: [report("A")], total: 1, page: 1, limit: 10, totalPages: 1,
        kpis: { total: 1, submitted: 1, under_review: 0, dispatched: 0, resolved: 0, pending: 1 },
      });
    });

    await renderDashboard();
    await clickButton(host, "Filter submitted");
    await clickButton(host, "Filter resolved");
    expect(host.textContent).toContain("Select NEW");
    await act(async () => resolveOld({
      reports: [report("OLD")], total: 1, page: 1, limit: 10, totalPages: 1,
      kpis: { total: 1, submitted: 1, under_review: 0, dispatched: 0, resolved: 0, pending: 1 },
    }));
    expect(host.textContent).toContain("Select NEW");
    expect(host.textContent).not.toContain("Select OLD");
  });

});
