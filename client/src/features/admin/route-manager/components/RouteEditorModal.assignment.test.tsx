import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RouteEditorModal from "./RouteEditorModal";
import type { RouteForm } from "../hooks/useRoutes";

vi.mock("./RouteStopsMap", () => ({ default: () => null }));
vi.mock("./BarangayOrderList", () => ({ default: () => null }));
vi.mock("@/components/ui/searchable-select", () => ({ SearchableSelect: ({ id, value, options, onValueChange }: {
  id?: string; value: string; options: { value: string; label: string }[]; onValueChange: (value: string) => void;
}) => <select id={id} aria-label={id ?? "Assigned truck"} value={value} onChange={(event) => onValueChange(event.target.value)}>
  <option value="" />{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
</select> }));
const Harness = () => {
  const [form, setForm] = useState<RouteForm>({ day: "Thursday", truckId: "", driverId: "", startTime: "06:00", selectedBarangayId: "", barangays: [] });
  return <><output data-testid="assignment">{`${form.driverId}:${form.truckId}`}</output><RouteEditorModal
    isOpen onClose={vi.fn()} isCreating selectedRoute={null} form={form} setForm={setForm} isSaving={false}
    trucks={[{ id: "available", name: "Truck 2", plate_number: "ABC" }]}
    drivers={[{ id: "collector", full_name: "Collector A", truck_id: "available" }, { id: "occupied-collector", full_name: "Collector B", truck_id: "occupied" }]}
    isLoadingTrucks={false} isLoadingBarangays={false} barangays={[]} availableStopPoints={[]} isLoadingStopPoints={false}
    isCollectionAvailable onSelectBarangay={vi.fn()} onAddBarangay={vi.fn()} onRemoveBarangay={vi.fn()}
    onMoveBarangay={vi.fn()} onSave={vi.fn()}
  /></>;
};
afterEach(cleanup);
it("chooses a collector with their linked available truck and excludes occupied assignments", () => {
  render(<Harness />);
  const picker = document.getElementById("route-collector")!;
  expect(picker).not.toHaveTextContent("Collector B");
  fireEvent.change(picker, { target: { value: "collector" } });
  expect(screen.getByTestId("assignment")).toHaveTextContent("collector:available");
});
it("shows the automatically assigned truck without a truck selector", () => {
  render(<Harness />);
  expect(screen.queryByLabelText("Assigned truck")).toBeNull();
  fireEvent.change(document.getElementById("route-collector")!, { target: { value: "collector" } });
  expect(screen.getByText("Truck 2 (ABC)")).toBeInTheDocument();
  expect(screen.getByTestId("assignment")).toHaveTextContent("collector:available");
});
