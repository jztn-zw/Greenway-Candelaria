import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import MyReports from "./MyReports";

const fixture = vi.hoisted(() => ({ status: "RESOLVED", remove: vi.fn().mockResolvedValue({}) }));
// The button's decorative WASM loader needs browser canvas/visibility APIs.
vi.mock("@lottiefiles/dotlottie-react", () => ({ DotLottieReact: () => null }));
vi.mock("@/lib/residentQuery", () => ({
  useResidentMutation: () => fixture.remove,
  useResidentQuery: (_domain: string, parts: string[]) => ({
    data: parts[0] === "detail" ? {
      id: "report", reference_number: "RPT-2026-00001", status: fixture.status,
      violation_type: "LITTERING", barangay_name: "Test area", description: "Test report",
      created_at: "2026-10-30T01:00:00Z", photos: [], status_history: [],
    } : parts[0] === "stats" ? { total: 1 } : { reports: [], page: 1, totalPages: 1 },
    isLoading: false, isFetching: false, refetch: vi.fn(),
  }),
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
function open(status: string) {
  fixture.status = status;
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/resident/my-reports?report=report"]}><MyReports /></MemoryRouter>);
}

it.each(["UNDER_REVIEW", "DISPATCHED"])("does not allow resident deletion of %s reports", status => {
  open(status);
  expect(screen.queryByRole("button", { name: /withdraw|remove from history|delete report/i })).not.toBeInTheDocument();
});

it("keeps submitted withdrawal available and requires confirmation", async () => {
  open("SUBMITTED");
  fireEvent.click(screen.getByRole("button", { name: /Cancel & Withdraw Report/i }));
  expect(fixture.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel Report" }));
  await waitFor(() => expect(fixture.remove).toHaveBeenCalledWith("report"));
});

it("explains that removing resolved history retains MENRO records", async () => {
  open("RESOLVED");
  fireEvent.click(screen.getByRole("button", { name: /Remove from History/i }));
  expect(screen.getByRole("dialog")).toHaveTextContent(/MENRO.*retain/i);
  expect(fixture.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Yes, Remove from History" }));
  await waitFor(() => expect(fixture.remove).toHaveBeenCalledWith("report"));
});

it("closes the confirmation when a refreshed submission enters review", () => {
  const view = open("SUBMITTED");
  fireEvent.click(screen.getByRole("button", { name: /Cancel & Withdraw Report/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fixture.status = "UNDER_REVIEW";
  view.rerender(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/resident/my-reports?report=report"]}><MyReports /></MemoryRouter>);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(fixture.remove).not.toHaveBeenCalled();
});
import "@testing-library/jest-dom/vitest";
