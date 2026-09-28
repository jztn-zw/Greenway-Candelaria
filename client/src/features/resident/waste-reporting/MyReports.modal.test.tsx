import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MyReports from "./MyReports";
import ResidentTopBar from "@/app/layouts/resident/ResidentTopbar";
import { deleteReport } from "@/services/reportsService";
import { toast } from "@/lib/toast";

const report = vi.hoisted(() => ({ id: "owned-report", reference_number: "GW-123", barangay_id: "poblacion", barangay_name: "Poblacion", barangay_zone: null, violation_type: "ILLEGAL_DUMPING", landmark: "Near the chapel", description: "Waste blocking the road.", status: "SUBMITTED", admin_response: null, pin_lat: null, pin_lng: null, created_at: "2026-09-28 00:00:00", updated_at: "2026-09-28 00:00:00", photos: [], status_history: [] }));
vi.mock("@/lib/residentQuery", () => ({
  useResidentQuery: (_domain: string, key: string[]) => ({ data: key[0] === "detail" ? report : key[0] === "stats" ? { total: 1, pending: 1, resolved: 0, under_review: 0, in_progress: 0 } : { reports: [], page: 1, total: 0, totalPages: 0 }, isLoading: false, isPlaceholderData: false, error: null, refetch: vi.fn() }),
  useResidentMutation: (action: unknown) => action,
}));
vi.mock("@/services/reportsService", () => ({ fetchMyReports: vi.fn(), fetchMyReportById: vi.fn(), fetchMyReportStats: vi.fn(), deleteReport: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ toggleSidebar: vi.fn() }) }));
vi.mock("@/features/resident/notifications/useResidentNotifications", () => ({ default: () => ({ notifications: [], unreadCount: 0, markAsRead: vi.fn(), markAllAsRead: vi.fn() }) }));
let host: HTMLDivElement; let root: Root;
beforeEach(async () => {
  vi.resetAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(<MemoryRouter initialEntries={["/resident/my-reports?report=owned-report&ref=GW-123"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResidentTopBar /><MyReports /></MemoryRouter>));
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const click = async (name: string) => { await act(async () => [...document.querySelectorAll("button")].find(button => button.textContent?.trim() === name)!.click()); };
const openConfirmation = async () => { await act(async () => [...host.querySelectorAll("button")].find(button => button.textContent?.includes("Cancel & Withdraw Report"))!.click()); };

it("allows selecting an empty report status without switching back to All", async () => {
  await act(async () => host.querySelector<HTMLAnchorElement>('a[aria-label="Back to My Reports"]')!.click());
  const filters = host.querySelector('[aria-label="Report status filters"]')!;
  const resolved = [...filters.querySelectorAll("button")].find((button) => button.querySelector("span")?.textContent === "Resolved")!;
  resolved.scrollIntoView = vi.fn();
  await act(async () => resolved.click());
  expect(resolved).toHaveAttribute("aria-pressed", "true");
  expect(resolved).toHaveTextContent("Resolved0");
  expect(filters.querySelector('button[aria-pressed="false"]')).toHaveTextContent(/^All$/);
  expect(filters.querySelectorAll("button")).toHaveLength(5);
});

it("returns from report details through the topbar breadcrumb", async () => {
  const breadcrumb = host.querySelector('nav[aria-label="Breadcrumb"]');
  const link = breadcrumb?.querySelector<HTMLAnchorElement>('a[aria-label="Back to My Reports"]');
  expect(breadcrumb?.querySelector('[aria-current="page"]')).toHaveTextContent("GW-123");
  expect(link).toHaveAttribute("href", "/resident/my-reports");
  expect([...host.querySelectorAll("button")].some((button) => button.textContent?.includes("Back to My Reports"))).toBe(false);
  await act(async () => link!.click());
  expect(breadcrumb?.querySelector("a")).toBeNull();
  expect(breadcrumb?.querySelector('[aria-current="page"]')).toHaveTextContent("My Reports");
  expect(host.textContent).not.toContain("GW-123");
  expect(deleteReport).not.toHaveBeenCalled();
});

it("withdraws only the confirmed owned report and blocks duplicate actions while pending", async () => {
  await openConfirmation();
  expect(deleteReport).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("GW-123");
  await click("Keep Report"); expect(deleteReport).not.toHaveBeenCalled();
  await openConfirmation();
  let finish!: (value: { id: string; reference_number: string }) => void;
  vi.mocked(deleteReport).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await click("Yes, Cancel Report");
  expect(deleteReport).toHaveBeenCalledExactlyOnceWith("owned-report");
  expect([...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(button => button.textContent === "Keep Report")).toBeDisabled();
  expect([...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(button => button.textContent === "Cancelling...")).toBeDisabled();
  expect(document.querySelector('button[aria-label="Close confirmation"]')).toBeDisabled();
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("Cancelling...");
  await act(async () => finish({ id: report.id, reference_number: report.reference_number }));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(toast.success).toHaveBeenCalledWith("Report cancelled successfully");
});

it("keeps the withdrawal confirmation open after failure and allows a retry", async () => {
  vi.mocked(deleteReport).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ id: report.id, reference_number: report.reference_number });
  await openConfirmation(); await click("Yes, Cancel Report");
  expect(toast.error).toHaveBeenCalledWith("Offline");
  expect(document.querySelector('[role="dialog"]')).toHaveTextContent("GW-123");
  await click("Yes, Cancel Report");
  expect(deleteReport).toHaveBeenCalledTimes(2);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
