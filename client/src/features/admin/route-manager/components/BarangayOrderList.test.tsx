import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BarangayOrderList } from "./BarangayOrderList";

afterEach(cleanup);

const props = {
  form: { day: "Monday" as const, truckId: "", driverId: "", selectedBarangayId: "barangay-1", startTime: "06:00", barangays: [] },
  barangays: [{ id: "barangay-1", name: "Poblacion", zone: null, latitude: null, longitude: null }],
  availableStopPoints: [{ id: "street-1", name: "Main Street", barangay_id: "barangay-1" }],
  isLoadingBarangays: false, isLoadingStopPoints: false, isCollectionAvailable: false,
  onSelectBarangay: vi.fn(), onAdd: vi.fn(), onRemove: vi.fn(), onMove: vi.fn(),
};

it("shows saved streets when collection is disabled without allowing route additions", () => {
  render(<BarangayOrderList {...props} />);
  const street = screen.getByRole("button", { name: /Main Street/ });
  expect(street).toBeDisabled();
  fireEvent.click(street);
  expect(props.onAdd).not.toHaveBeenCalled();
  expect(screen.getByText("Enable collection to add streets.")).toBeInTheDocument();
});

it("distinguishes missing street records from streets already added or scheduled", () => {
  render(<BarangayOrderList {...props} availableStopPoints={[]} savedStreetCount={0} />);
  expect(screen.getByText("No streets added yet.")).toBeInTheDocument();
  expect(screen.queryByText("All streets are already added or scheduled.")).not.toBeInTheDocument();
  expect(screen.queryByText("Enable collection to add streets.")).not.toBeInTheDocument();
});

it("keeps available street additions working when collection service is enabled", () => {
  render(<BarangayOrderList {...props} isCollectionAvailable />);
  fireEvent.click(screen.getByRole("button", { name: /Main Street/ }));
  expect(props.onAdd).toHaveBeenCalledWith(props.availableStopPoints[0]);
});

it("explains when saved streets have already been selected or scheduled", () => {
  render(<BarangayOrderList {...props} availableStopPoints={[]} savedStreetCount={1} isCollectionAvailable />);
  expect(screen.getByText("All streets are already added or scheduled.")).toBeInTheDocument();
  expect(screen.queryByText("No streets added yet.")).not.toBeInTheDocument();
});
