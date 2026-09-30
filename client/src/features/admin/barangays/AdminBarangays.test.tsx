import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminBarangays from "./AdminBarangays";

const mocks = vi.hoisted(() => ({
  create: vi.fn(), update: vi.fn(),
  road: vi.fn(), mapHandlers: new Map<string, (event: unknown) => void>(), markers: [] as Array<{ handlers: Map<string, () => void>; coordinate: [number, number] }>, lines: [] as unknown[],
  barangays: [{ id: "poblacion", name: "Poblacion", status: "ACTIVE", collection_service_available: true, street_count: 1, streets_with_path: 0, active_route_count: 0, live_run_count: 0, latitude: null, longitude: null }],
  streets: [{ id: "street-1", name: "Gonzales St", area: null, active_resident_count: 0, account_link_count: 0, route_plan_count: 0, route_run_record_count: 0 }],
}));
vi.mock("@/lib/adminQuery", () => ({
  useAdminMutation: (action: unknown) => action,
  useAdminResource: (_resource: string, key: string[]) => ({ data: key[0] === "manager" ? mocks.barangays : mocks.streets, setData: vi.fn(), isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock("@/services/barangaysService", () => ({ createBarangayStreet: mocks.create, updateBarangayStreet: mocks.update, deleteBarangayStreet: vi.fn(), updateBarangayCollectionService: vi.fn(), updateBarangayStreetCoverage: vi.fn(), fetchBarangaysManager: vi.fn(), fetchManagedStreets: vi.fn() }));
vi.mock("./StreetCoverageEditor", () => ({ default: () => null }));
vi.mock("@/services/roadRoutingService", () => ({ getStreetCoverageRoadPath: mocks.road }));
vi.mock("leaflet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("leaflet") & { default: typeof import("leaflet") }>();
  const leaflet = actual.default;
  return { ...actual, default: { ...leaflet,
    map: () => ({ setView: vi.fn(), invalidateSize: vi.fn(), remove: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(),
      on: (name: string, callback: (event: unknown) => void) => mocks.mapHandlers.set(name, callback),
      off: (name: string) => mocks.mapHandlers.delete(name),
    }),
    layerGroup: () => { const layer = { addTo: () => layer, clearLayers: () => { mocks.markers.length = 0; mocks.lines.length = 0; } }; return layer; },
    tileLayer: () => ({ addTo: vi.fn() }),
    polyline: (coordinates: unknown) => { mocks.lines.push(coordinates); return { addTo: vi.fn() }; },
    marker: (coordinate: [number, number]) => {
      const data = { coordinate, handlers: new Map<string, () => void>() }; mocks.markers.push(data);
      const marker = { addTo: () => marker, on: (name: string, handler: () => void) => data.handlers.set(name, handler), getLatLng: () => ({ lat: data.coordinate[0], lng: data.coordinate[1] }) };
      return marker;
    },
  } };
});
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.create.mockReset().mockResolvedValue(undefined); mocks.update.mockReset().mockResolvedValue(undefined);
  mocks.road.mockReset(); mocks.mapHandlers.clear(); mocks.markers.length = 0; mocks.lines.length = 0;
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });
const button = (name: string, scope: ParentNode = document) => [...scope.querySelectorAll("button")].find(b => b.textContent?.trim() === name || b.getAttribute("aria-label") === name)!;
const click = async (name: string, scope: ParentNode = document) => { await act(async () => button(name, scope).click()); };
const change = (id: string, value: string) => act(() => Simulate.change(document.getElementById(id)!, { target: { value } } as never));
async function openCreate() {
  await act(async () => root.render(<AdminBarangays />)); await click("Add street");
  return document.querySelector('[role="dialog"]')!;
}
const submit = async (editor: Element) => { await act(async () => Simulate.submit(editor.querySelector("form")!)); };

describe("street editor unsaved changes", () => {
  it("keeps a draft and clears it only after discard", async () => {
    const editor = await openCreate(); change("barangay-street-name", "New street"); await click("Close", editor);
    expect(document.body.textContent).toContain("Discard New Street?"); await click("Keep Editing");
    expect(document.getElementById("barangay-street-name")).toHaveValue("New street"); await click("Cancel", editor); await click("Discard");
    expect(document.querySelector('[role="dialog"]')).toBeNull(); await click("Add street");
    expect(document.getElementById("barangay-street-name")).toHaveValue(""); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("closes unchanged forms directly and guards edited streets on Escape", async () => {
    const editor = await openCreate(); await click("Cancel", editor); expect(document.querySelector('[role="dialog"]')).toBeNull();
    await click("Edit Gonzales St"); change("barangay-street-area", "Zone A");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.body.textContent).toContain("Discard Street Changes?");
  });
  it("retains failed submissions and closes a successful save directly", async () => {
    const editor = await openCreate(); change("barangay-street-name", "New street");
    mocks.create.mockRejectedValueOnce(new Error("Save failed")); await submit(editor);
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("Save failed"); expect(document.getElementById("barangay-street-name")).toHaveValue("New street");
    await submit(editor); expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.create).toHaveBeenLastCalledWith("poblacion", { name: "New street", area: null });
  });
});

describe("street coverage road matching", () => {
  const points: [number, number][] = [[13.931, 121.424], [13.933, 121.426]];
  const road: [number, number][] = [points[0], [13.9315, 121.424], [13.9315, 121.426], points[1]];
  const openCoverage = async (save = vi.fn(), initialPath: [number, number][] | null = null) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { default: Editor } = await vi.importActual<typeof import("./StreetCoverageEditor")>("./StreetCoverageEditor");
    await act(async () => root.render(<Editor open streetName="Test street" barangayName="Poblacion" initialPath={initialPath} center={points[0]} onOpenChange={vi.fn()} onSave={save} />));
    return save;
  };
  const mark = (point: [number, number]) => act(() => mocks.mapHandlers.get("click")!({ latlng: { lat: point[0], lng: point[1] } }));
  const finishMatching = () => act(async () => { await vi.advanceTimersByTimeAsync(300); });

  it("draws and saves the road shape rather than a line between clicks", async () => {
    mocks.road.mockResolvedValue({ coordinates: road, snappedPoints: points, source: "osrm" });
    const save = await openCoverage(); mark(points[0]); mark(points[1]);
    expect(document.body.textContent).toContain("Matching roads…");
    expect(button("Matching roads…")).toBeDisabled();
    await finishMatching();
    expect(mocks.lines).toContainEqual(road);
    await click("Save path");
    expect(save).toHaveBeenCalledWith(road);
    expect(mocks.road).toHaveBeenCalledTimes(1);
  });

  it("ignores an old matching response after points are cleared", async () => {
    let finish!: (value: unknown) => void;
    mocks.road.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const save = await openCoverage(); mark(points[0]); mark(points[1]); await finishMatching();
    const signal = mocks.road.mock.calls[0][1] as AbortSignal;
    await click("Clear");
    await act(async () => finish({ coordinates: road, snappedPoints: points, source: "osrm" }));
    expect(signal.aborted).toBe(true);
    expect(document.body.textContent).toContain("No path saved");
    expect(mocks.lines).toHaveLength(0);
    await click("Save path"); expect(save).toHaveBeenCalledWith(null);
  });

  it("blocks saving failed road matching and allows retry", async () => {
    mocks.road.mockRejectedValueOnce(new Error("Road matching unavailable"));
    const save = await openCoverage(); mark(points[0]); mark(points[1]); await finishMatching();
    expect(button("Save path")).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
    mocks.road.mockResolvedValue({ coordinates: road, snappedPoints: points, source: "osrm" });
    await click("Retry"); await finishMatching(); await click("Save path");
    expect(save).toHaveBeenCalledWith(road);
  });

  it("recalculates dragged points and keeps the original saved shape unchanged on opening", async () => {
    const save = await openCoverage(vi.fn(), road);
    expect(mocks.road).not.toHaveBeenCalled(); expect(mocks.lines).toContainEqual(road);
    const moved: [number, number] = [13.9311, 121.4241];
    const updatedRoad = [moved, ...road.slice(1)];
    mocks.road.mockResolvedValue({ coordinates: updatedRoad, snappedPoints: updatedRoad, source: "osrm" });
    const marker = mocks.markers[0]; marker.coordinate = moved;
    act(() => marker.handlers.get("dragend")!()); await finishMatching();
    expect(mocks.road.mock.calls[0][0][0]).toEqual(moved);
    await click("Save path"); expect(save).toHaveBeenCalledWith(updatedRoad);
  });

  it("respects reversed collection order and disables saving after undo leaves one point", async () => {
    const reversed = points.slice().reverse();
    const reversedRoad = road.slice().reverse();
    mocks.road.mockResolvedValue({ coordinates: reversedRoad, snappedPoints: reversed, source: "osrm" });
    await openCoverage(vi.fn(), points);
    await click("Reverse"); await finishMatching();
    expect(mocks.road.mock.calls[0][0]).toEqual(reversed);
    expect(mocks.lines).toContainEqual(reversedRoad);
    await click("Undo");
    expect(button("Save path")).toBeDisabled();
    expect(mocks.lines).toHaveLength(0);
  });
});

