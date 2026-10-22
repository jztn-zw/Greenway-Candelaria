import { act, fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminAnalyticsDashboard from "./AdminAnalyticsDashboard";
import type { AnalyticsDashboardData } from "./analytics.types";

const mocks = vi.hoisted(() => ({
  query: { data: undefined as AnalyticsDashboardData | undefined, error: null as Error | null, isFetching: false, refetch: vi.fn() },
  download: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock("./useAnalyticsDashboard", () => ({ useAnalyticsDashboard: () => mocks.query }));
vi.mock("@/lib/adminQuery", () => ({ useAdminQuery: () => ({ data: [{ id: "poblacion", name: "Poblacion", status: "ACTIVE" }] }) }));
vi.mock("./analytics.pdf", () => ({ downloadAnalyticsPdf: (...args: unknown[]) => mocks.download(...args) }));
vi.mock("@/lib/toast", () => ({ toast: { success: (...args: unknown[]) => mocks.success(...args), error: (...args: unknown[]) => mocks.error(...args) } }));
vi.mock("./AnalyticsSummaryKPIs", () => ({ default: () => null }));
vi.mock("./SectionOverview", () => ({ default: () => null }));
vi.mock("./SectionCollectionPerformance", () => ({ default: () => null }));
vi.mock("./SectionMissedCollections", () => ({ default: () => null }));
vi.mock("./SectionWasteReports", () => ({ default: () => null }));
vi.mock("./SectionResidentEngagement", () => ({ default: () => null }));
vi.mock("./SectionTruckDriver", () => ({ default: () => null }));
vi.mock("./SectionBarangayCompliance", () => ({ default: () => null }));
vi.mock("@/components/ui/searchable-select", () => ({ SearchableSelect: ({ value, onValueChange, options }: { value: string; onValueChange: (v: string) => void; options: { value: string; label: string }[] }) => (
  <select aria-label="Analytics barangay" value={value} onChange={e => onValueChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
) }));

const data = {
  range: { from: "2026-08-28", to: "2026-10-22" }, overview: {},
} as AnalyticsDashboardData;

beforeEach(() => {
  vi.clearAllMocks(); mocks.query.data = data; mocks.query.error = null; mocks.query.isFetching = false;
  mocks.download.mockResolvedValue(undefined);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

it("exports the loaded snapshot with its barangay label and a timestamp", async () => {
  render(<AdminAnalyticsDashboard />);
  fireEvent.change(screen.getByLabelText("Analytics barangay"), { target: { value: "poblacion" } });
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  await waitFor(() => expect(mocks.download).toHaveBeenCalledWith(data, { barangayLabel: "Poblacion", generatedAt: expect.any(Date), section: "overview" }));
  await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Analytics PDF exported"));
});

it("blocks export of the retained old results during a filter request or failure", () => {
  const view = render(<AdminAnalyticsDashboard />);
  mocks.query.data = undefined; mocks.query.isFetching = true;
  view.rerender(<AdminAnalyticsDashboard />);
  expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
  mocks.query.isFetching = false; mocks.query.error = new Error("Offline");
  view.rerender(<AdminAnalyticsDashboard />);
  expect(screen.getByRole("button", { name: "Export PDF" })).toBeDisabled();
  expect(mocks.download).not.toHaveBeenCalled();
});

it("prevents repeated downloads while generating, and keeps the original snapshot when filters change", async () => {
  let finish!: () => void;
  mocks.download.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<AdminAnalyticsDashboard />);
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  await waitFor(() => expect(mocks.download).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: /Exporting/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Analytics barangay"), { target: { value: "poblacion" } });
  fireEvent.click(screen.getByRole("button", { name: "Driver Operations" }));
  expect(mocks.download.mock.calls[0]).toEqual([data, { barangayLabel: "All Barangays", generatedAt: expect.any(Date), section: "overview" }]);
  await act(async () => finish());
  expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled();
});

it.each([
  ["Collection Efficiency", "collection-performance"], ["Missed Collections", "missed-collections"],
  ["Reports & Incidents", "waste-reports"], ["Residents", "resident-engagement"],
  ["Driver Operations", "truck-driver"], ["Barangay Coverage", "barangay-compliance"],
])("exports only the selected %s tab", async (label, section) => {
  render(<AdminAnalyticsDashboard />);
  fireEvent.click(screen.getByRole("button", { name: label }));
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  await waitFor(() => expect(mocks.download).toHaveBeenCalledWith(data, expect.objectContaining({ section })));
});

it("shows a recoverable error when the PDF cannot be created", async () => {
  mocks.download.mockRejectedValue(new Error("Template unavailable"));
  render(<AdminAnalyticsDashboard />);
  fireEvent.click(screen.getByRole("button", { name: "Export PDF" }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Could not export analytics", expect.any(Object)));
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Export PDF" })).toBeEnabled();
});
