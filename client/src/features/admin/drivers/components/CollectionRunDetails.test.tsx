import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { fetchDriverActivityDetail, type DriverActivityDetail } from "@/services/driverManagerService";
import CollectionRunDetails from "./CollectionRunDetails";
import DriverDetailView from "./DriverDetailView";
import type { Driver } from "../types";

vi.mock("@/services/driverManagerService", () => ({ fetchDriverActivityDetail: vi.fn() }));
const detail: DriverActivityDetail = {
  run: { id: "run-1", date: "Oct 21, 2026", route: "Saved Route", status: "PARTIAL", waste_type: "Biodegradable",
    truck_name: "Original Truck", truck_plate: "OLD-123", scheduled_start: "12:30 PM", started_at: "2026-10-21T04:36:00Z",
    ended_at: "2026-10-21T16:00:00Z", paused_seconds: 60, active_seconds: 40980 },
  stops: [
    { id: "done", stop_order: 1, stop_name: "Collected Street", barangay_name: "Barangay A", status: "DONE", completed_at: "2026-10-21T05:00:00Z", skipped_reason: null },
    { id: "missed", stop_order: 2, stop_name: "Skipped Street", barangay_name: "Barangay A", status: "MISSED", completed_at: "2026-10-21T05:10:00Z", skipped_reason: "Road blocked" },
    { id: "pending", stop_order: 3, stop_name: "Unfinished Street", barangay_name: "Barangay B", status: "NOT_STARTED", completed_at: null, skipped_reason: null },
  ],
  distance: { distance_km: 12.34567, sample_count: 300, segment_count: 295, gap_count: 1, rejected_points: 1 },
};
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: { id: "admin-1", role: "ADMIN" } as never, token: "fixture-session" });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(fetchDriverActivityDetail).mockResolvedValue(detail);
});
afterEach(() => { cleanup(); client.clear(); });
const props = { driverId: "driver-1", driverName: "Test Collector", runId: "run-1", onClose: vi.fn() };
const mount = () => render(<QueryClientProvider client={client}><CollectionRunDetails {...props} /></QueryClientProvider>);

it("shows the saved vehicle, stop outcomes/reasons, Philippine AM/PM times and this run's GPS distance", async () => {
  mount();
  await screen.findByText("Saved Route");
  expect(fetchDriverActivityDetail).toHaveBeenCalledWith("driver-1", "run-1");
  expect(screen.getByText(/Original Truck · OLD-123/)).toBeInTheDocument();
  expect(screen.getByText("12.35 km")).toBeInTheDocument();
  expect(screen.getByText(/Oct 21, 2026, 12:36 PM/)).toBeInTheDocument();
  expect(screen.getByText(/Oct 22, 2026, 12:00 AM/)).toBeInTheDocument();
  const stops = within(screen.getByRole("list", { name: "Collection stops" }));
  expect(stops.getAllByRole("listitem")).toHaveLength(3);
  expect(stops.getByText("Completed")).toBeInTheDocument();
  expect(stops.getByText("Skipped / Missed")).toBeInTheDocument();
  expect(stops.getByText("Reason: Road blocked")).toBeInTheDocument();
  expect(stops.getByText("Not Completed")).toBeInTheDocument();
  expect(stops.getByText(/Time not recorded/)).toBeInTheDocument();
  expect(screen.getByText(/GPS gaps or unreliable fixes were excluded/)).toBeInTheDocument();
});

it("distinguishes unavailable GPS from a recorded zero", async () => {
  vi.mocked(fetchDriverActivityDetail).mockResolvedValue({ ...detail, distance: { ...detail.distance, distance_km: null } });
  mount();
  expect(await screen.findByText("Unavailable")).toBeInTheDocument();
  expect(screen.queryByText("0.00 km")).not.toBeInTheDocument();
  vi.mocked(fetchDriverActivityDetail).mockResolvedValue({ ...detail, distance: { ...detail.distance, distance_km: 0 } });
  await act(async () => { await client.invalidateQueries(); });
  expect(await screen.findByText("0.00 km")).toBeInTheDocument();
});

it("keeps missing timestamps and skip reasons honest", async () => {
  vi.mocked(fetchDriverActivityDetail).mockResolvedValue({ ...detail, run: { ...detail.run, started_at: null, ended_at: null, active_seconds: null },
    stops: [{ ...detail.stops[1], skipped_reason: null, completed_at: null }] });
  mount();
  expect(await screen.findByText("Reason: Reason not recorded")).toBeInTheDocument();
  expect(screen.getByText("Not recorded")).toBeInTheDocument();
  expect(screen.queryByText(/12:00 AM/)).not.toBeInTheDocument();
});

it("exposes a retry after a failed detail read", async () => {
  vi.mocked(fetchDriverActivityDetail).mockRejectedValueOnce(new Error("Offline"));
  mount();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
  expect(await screen.findByText("Saved Route")).toBeInTheDocument();
});

it("does not overwrite another selected run with a late response", async () => {
  let finish!: (data: DriverActivityDetail) => void;
  vi.mocked(fetchDriverActivityDetail).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const { rerender } = mount();
  rerender(<QueryClientProvider client={client}><CollectionRunDetails {...props} runId="run-2" /></QueryClientProvider>);
  expect(await screen.findByText("Saved Route")).toBeInTheDocument();
  await act(async () => { finish({ ...detail, run: { ...detail.run, route: "Old Run Response" } }); });
  expect(screen.queryByText("Old Run Response")).not.toBeInTheDocument();
});

it.each(["click", "Enter", " "])("opens the whole history card using %s without a separate details button", async (action) => {
  const driver: Driver = { id: "driver-1", userId: "user-1", fullName: "Test Collector", username: "collector", email: "", avatarUrl: null,
    contactNumber: "", truckId: null, status: "Active", lastLogin: "", dateAdded: "", activityLog: [
      { runId: "run-1", route: "Saved Route", date: "Oct 21, 2026", status: "Partial", completedStops: 1, totalStops: 3, startTime: "12:36 PM", endTime: "12:00 AM" },
    ] };
  render(<QueryClientProvider client={client}><DriverDetailView driver={driver} trucks={[]} onEdit={vi.fn()} onResetPassword={vi.fn()} onToggleStatus={vi.fn()} /></QueryClientProvider>);
  expect(fetchDriverActivityDetail).not.toHaveBeenCalled();
  const card = screen.getByRole("button", { name: /view collection details/i });
  expect(card).toHaveAttribute("tabindex", "0");
  expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByText("View Details")).not.toBeInTheDocument();
  if (action === "click") fireEvent.click(within(card).getByText("1/3 stops"));
  else fireEvent.keyDown(card, { key: action });
  expect(await screen.findByText("12.35 km")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
