import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminRouteManager from "./AdminRouteManager";
import type { RouteData, RouteForm } from "./hooks/useRoutes";

const state = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), source: null as unknown as RouteData,
  queryData: { streets: [], collection_service_available: true } }));
vi.mock("./hooks/useRoutes", () => ({ useRoutes: () => ({ routes: [state.source], createNew: state.create,
  updateExisting: state.update, isLoading: false, hasLoadedData: true, loadRoutes: vi.fn(), toggleActive: vi.fn(), remove: vi.fn() }) }));
vi.mock("./hooks/useTrucks", () => ({ useTrucks: () => ({ trucks: [{ id: "original-truck", name: "Truck 1" }, { id: "chosen-truck", name: "Truck 2" }], isLoading: false }) }));
vi.mock("./hooks/useDrivers", () => ({ useDrivers: () => ({ drivers: [] }) }));
vi.mock("./hooks/useBarangays", () => ({ useBarangays: () => ({ barangays: [], isLoading: false }) }));
vi.mock("@/lib/adminQuery", () => ({ useAdminQuery: () => ({ data: state.queryData, isLoading: false }) }));
vi.mock("./components/RouteDayView", () => ({ default: ({ onDuplicate }: { onDuplicate: (route: RouteData) => void }) => <button onClick={() => onDuplicate(state.source)}>Duplicate source</button> }));
vi.mock("./components/RouteStopsMap", () => ({ default: () => null }));
vi.mock("./components/RouteDetailModal", () => ({ default: () => null }));
vi.mock("./components/RouteEditorModal", () => ({ default: ({ isOpen, form, setForm, onSave, onClose }: {
  isOpen: boolean; form: RouteForm; setForm: React.Dispatch<React.SetStateAction<RouteForm>>; onSave: () => Promise<void>; onClose: () => void;
}) => isOpen ? <div role="dialog"><output data-testid="draft">{JSON.stringify(form)}</output>
  <button onClick={() => setForm((previous) => ({ ...previous, truckId: "chosen-truck", driverId: "chosen-collector" }))}>Choose assignment</button>
  <button onClick={() => void onSave()}>Save draft</button><button onClick={onClose}>Discard draft</button></div> : null }));

beforeEach(() => {
  vi.clearAllMocks();
  state.source = { id: "source", day: "Monday", truckId: "original-truck", driverId: "original-collector", truckName: "Truck 1",
    startTime: "07:30", barangays: ["Area"], stops: [{ id: "stop", streetId: "street", barangayId: "barangay", stopName: "Main Street", stopOrder: 1, coveragePath: [[13, 121], [13.1, 121.1]] }],
    status: "ACTIVE", active: true } as RouteData;
  state.create.mockResolvedValue({ id: "saved" });
});
afterEach(cleanup);
const openDraft = async () => {
  render(<AdminRouteManager />);
  fireEvent.click(screen.getByRole("button", { name: "Duplicate source" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue to Editor" })));
};
it("opens an unsaved copy without the source truck or collector and saves the chosen assignment only on Save", async () => {
  await openDraft();
  expect(state.create).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
  const draft = JSON.parse(screen.getByTestId("draft").textContent!);
  expect(draft).toMatchObject({ day: "Tuesday", startTime: "07:30", truckId: "", driverId: "", barangays: [{ id: "street", barangayId: "barangay" }] });
  fireEvent.click(screen.getByRole("button", { name: "Choose assignment" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save draft" })));
  expect(state.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ truckId: "chosen-truck", driverId: "chosen-collector" }));
  expect(state.update).not.toHaveBeenCalled();
});
it("discarding a duplicate creates no route", async () => {
  await openDraft(); fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
  expect(state.create).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
});
