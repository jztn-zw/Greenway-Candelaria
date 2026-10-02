import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { fetchBarangays } from "@/services/barangaysService";
import { checkSimilarReport } from "@/services/reportsService";
import ResidentSubmitReport from "./ResidentSubmitReport";

vi.mock("@/services/barangaysService", () => ({ fetchBarangays: vi.fn() }));
vi.mock("@/services/reportsService", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/reportsService")>(),
  checkSimilarReport: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

let client: QueryClient;
let previousAuth: ReturnType<typeof useAuthStore.getState>;
beforeEach(() => {
  previousAuth = useAuthStore.getState();
  useAuthStore.setState({ user: { id: "report-author", role: "RESIDENT" } as never, token: "session" });
  localStorage.setItem("greenway_report_draft_v2:report-author", JSON.stringify({
    description: "Waste was left beside the chapel.", streetOrLandmark: "Near the chapel",
  }));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(fetchBarangays).mockRejectedValueOnce(new Error("Network Error")).mockResolvedValue([]);
  vi.stubGlobal("crypto", { randomUUID: () => "evidence-photo" });
  const BrowserURL = URL;
  vi.stubGlobal("URL", class extends BrowserURL {
    static createObjectURL = () => "blob:evidence-photo";
    static revokeObjectURL = vi.fn();
  });
});
afterEach(() => {
  cleanup(); client.clear(); localStorage.removeItem("greenway_report_draft_v2:report-author");
  useAuthStore.setState(previousAuth); vi.unstubAllGlobals(); vi.clearAllMocks();
});

it("retries barangays without unmounting the form or losing description, landmark, and photo evidence", async () => {
  const view = render(<QueryClientProvider client={client}><MemoryRouter><ResidentSubmitReport /></MemoryRouter></QueryClientProvider>);
  await screen.findByRole("button", { name: "Try again" });
  expect(screen.queryByRole("heading", { name: "This page couldn't load" })).toBeNull();
  const description = screen.getByDisplayValue("Waste was left beside the chapel.");
  const landmark = screen.getByDisplayValue("Near the chapel");
  fireEvent.change(description, { target: { value: "The waste is still here this morning." } });
  fireEvent.change(landmark, { target: { value: "Chapel entrance" } });
  const photoInput = view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(photoInput, { target: { files: [new File(["photo"], "evidence.png", { type: "image/png" })] } });
  expect(view.container.querySelector('img[src="blob:evidence-photo"]')).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Try again" })).toBeNull());
  expect(fetchBarangays).toHaveBeenCalledTimes(2);
  expect(description).toHaveValue("The waste is still here this morning.");
  expect(landmark).toHaveValue("Chapel entrance");
  expect(view.container.contains(description)).toBe(true);
  expect(view.container.querySelector('img[src="blob:evidence-photo"]')).not.toBeNull();
});

it("warns and retries when the similar-report check fails without clearing the draft", async () => {
  localStorage.setItem("greenway_report_draft_v2:report-author", JSON.stringify({
    violationType: "missed-collection", barangayId: "barangay-1", barangayName: "Poblacion",
    description: "Waste was left beside the chapel.", streetOrLandmark: "Near the chapel",
  }));
  vi.mocked(fetchBarangays).mockReset().mockResolvedValue([]);
  vi.mocked(checkSimilarReport).mockRejectedValueOnce(new Error("Network Error")).mockResolvedValue(false);

  render(<QueryClientProvider client={client}><MemoryRouter><ResidentSubmitReport /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByText(/Couldn't check for similar reports/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(screen.queryByText(/Couldn't check for similar reports/)).toBeNull());
  expect(checkSimilarReport).toHaveBeenCalledTimes(2);
  expect(screen.getByDisplayValue("Waste was left beside the chapel.")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Near the chapel")).toBeInTheDocument();
});
