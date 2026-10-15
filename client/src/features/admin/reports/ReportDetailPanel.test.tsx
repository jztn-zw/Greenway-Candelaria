import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { fireEvent, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { fetchAdminReports, type AdminReportItem } from "@/services/reportsService";
import ReportDetailPanel from "./ReportDetailPanel";
import type { WasteReport } from "./types";

const { adminFetch } = vi.hoisted(() => ({
  adminFetch: (_domain: string, _key: unknown, request: () => unknown) => request(),
}));
vi.mock("@/lib/adminQuery", () => ({
  useAdminFetch: () => adminFetch,
}));
vi.mock("@/services/reportsService", () => ({ fetchAdminReports: vi.fn() }));

let host: HTMLDivElement, root: Root, client: QueryClient;
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
const report: WasteReport = {
  id: "report-a", referenceNumber: "RPT-A", violationType: "Missed Collection",
  violationTypeRaw: "MISSED_COLLECTION", barangay: "Example", barangayId: "barangay",
  description: "Missed collection", submittedAt: "2026-09-27T00:00:00Z",
  submitterName: "Resident", photos: [], status: "Submitted", statusHistory: [],
  internalNotes: [], isDuplicate: false, isFalseReport: false,
};
const duplicateCandidate = {
  id: "report-original",
  reference_number: "RPT-2026-00012",
  barangay_id: "barangay",
  barangay_name: "Example",
  status: "UNDER_REVIEW",
  is_duplicate: false,
  is_false: false,
  violation_type: "MISSED_COLLECTION",
  landmark: "Rizal Street",
} as AdminReportItem;
beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  client = new QueryClient();
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); client.clear(); host.remove(); HTMLElement.prototype.scrollIntoView = originalScrollIntoView; });
const render = (value: WasteReport, isLoading = false, onFlagReport = vi.fn().mockResolvedValue(undefined)) => act(async () => root.render(
  <QueryClientProvider client={client}><MemoryRouter><ReportDetailPanel report={value} isLoading={isLoading} onAddNote={vi.fn()} onUpdateStatus={vi.fn()} onFlagReport={onFlagReport} /></MemoryRouter></QueryClientProvider>,
));
const textarea = (placeholder: string) => host.querySelector<HTMLTextAreaElement>(`textarea[placeholder="${placeholder}"]`)!;
const edit = (input: HTMLTextAreaElement, value: string) => act(() => {
  input.value = value; Simulate.change(input);
});
it("links the report owner directly to their resident profile", async () => {
  await render({ ...report, submitterId: "resident-a" });
  expect(host.querySelector('a')).toHaveAttribute("href", "/admin/residents?residentId=resident-a");
});

it("removes the manual resident response and preserves only the internal note draft", async () => {
  await render(report);
  expect(screen.queryByText("Official Resident Response")).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText("Type official notification message to be sent to the resident...")).not.toBeInTheDocument();
  edit(textarea("Add internal investigation note..."), "My unsaved note");
  await render({ ...report, status: "Under Review" });
  expect(textarea("Add internal investigation note...").value).toBe("My unsaved note");
  await render({ ...report, id: "report-b" });
  expect(textarea("Add internal investigation note...").value).toBe("");
});

it("shows a passive loading state, blocks flag actions, and preserves drafts", async () => {
  await render(report);
  edit(textarea("Add internal investigation note..."), "Draft note");

  await render(report, true);
  const loading = host.querySelector('[role="status"]');
  expect(loading?.textContent).toContain("Loading report details");
  expect(loading?.querySelector("button, input, textarea")).toBeNull();
  expect(host.querySelector("textarea")).toBeNull();
  const flagButtons = Array.from(host.querySelectorAll("button")).filter((button) => button.textContent?.startsWith("Flag") || button.textContent === "Mark Invalid");
  expect(flagButtons).toHaveLength(2);
  expect(flagButtons.every((button) => button.disabled)).toBe(true);

  await render(report);
  expect(textarea("Add internal investigation note...").value).toBe("Draft note");
});

it("closes an invalid report using a selected reason with no resolve toggle", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  await render(report, false, save);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Mark Invalid" })));
  expect(screen.queryByText("Close as Resolved & Notify")).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText("Explain why this report could not be verified or is invalid...")).not.toBeInTheDocument();
  await act(async () => fireEvent.keyDown(screen.getByRole("combobox", { name: "Reason" }), { key: "Enter" }));
  await act(async () => fireEvent.click(screen.getByRole("option", { name: "Insufficient evidence" })));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close Report & Notify" })));
  expect(save).toHaveBeenCalledExactlyOnceWith({ is_false: true, false_reason: "Insufficient evidence", resolve: true });
});

it("keeps a closed invalid report labeled Resolved without offering another invalid review", async () => {
  await render({ ...report, status: "Resolved", isFalseReport: true, falseReason: "Insufficient evidence" });
  expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: "Mark Invalid" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Clear Flag" })).not.toBeInTheDocument();
});

it("closes a duplicate using only the original reference and no reason or resolve toggle", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  await render(report, false, save);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Flag Duplicate" })));
  expect(screen.queryByRole("textbox", { name: "Reason" })).not.toBeInTheDocument();
  expect(screen.queryByText("Resolve & Notify Resident")).not.toBeInTheDocument();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close Duplicate & Notify" })));
  expect(save).not.toHaveBeenCalled();
  await act(async () => fireEvent.change(screen.getByRole("textbox", { name: "Original report reference" }), { target: { value: "RPT-ORIGINAL" } }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close Duplicate & Notify" })));
  expect(save).toHaveBeenCalledExactlyOnceWith({ is_duplicate: true, duplicate_of_reference: "RPT-ORIGINAL", resolve: true });
});

it("shows matching original reports while typing and lets the admin select one", async () => {
  vi.useFakeTimers();
  vi.mocked(fetchAdminReports).mockResolvedValue({ reports: [duplicateCandidate] } as never);
  const save = vi.fn().mockResolvedValue(undefined);
  try {
    await render(report, false, save);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Flag Duplicate" })));
    const search = screen.getByRole("textbox", { name: "Original report reference" });
    await act(async () => fireEvent.change(search, { target: { value: "rpt-2026-0001" } }));
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });

    const option = screen.getByRole("button", { name: /RPT-2026-00012.*Missed Collection.*Rizal Street/i });
    await act(async () => fireEvent.click(option));
    expect(search).toHaveValue("RPT-2026-00012");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close Duplicate & Notify" })));
    expect(save).toHaveBeenCalledExactlyOnceWith({ is_duplicate: true, duplicate_of_reference: "RPT-2026-00012", resolve: true });
  } finally {
    vi.useRealTimers();
  }
});

it("keeps a closed duplicate labeled Resolved and prevents changing its final flag", async () => {
  await render({ ...report, status: "Resolved", isDuplicate: true, duplicateOfReference: "RPT-ORIGINAL" });
  expect(screen.getAllByText("Resolved").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Edit Duplicate" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Clear Flag" })).not.toBeInTheDocument();
});

it("keeps report review open and prevents duplicate actions while saving", async () => {
  let finish!: () => void;
  const save = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  await render(report, false, save);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Mark Invalid" })));
  await act(async () => fireEvent.keyDown(screen.getByRole("combobox", { name: "Reason" }), { key: "Enter" }));
  await act(async () => fireEvent.click(screen.getByRole("option", { name: "Insufficient evidence" })));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close Report & Notify" })));
  expect(screen.getByRole("button", { name: "Close report review" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await act(async () => fireEvent.keyDown(screen.getByRole("dialog", { name: "Mark as Invalid Report" }), { key: "Escape" }));
  expect(screen.getByRole("dialog", { name: "Mark as Invalid Report" })).toBeInTheDocument();
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(screen.queryByRole("dialog", { name: "Mark as Invalid Report" })).not.toBeInTheDocument();
});
