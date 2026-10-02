import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AdminBarangays from "./AdminBarangays";

const mocks = vi.hoisted(() => ({
  create: vi.fn(), update: vi.fn(),
  overviewError: null as Error | null, streetsError: null as Error | null, retryOverview: vi.fn(), retryStreets: vi.fn(),
  road: vi.fn(), mapHandlers: new Map<string, (event: unknown) => void>(), markers: [] as Array<{ handlers: Map<string, () => void>; coordinate: [number, number] }>, lines: [] as unknown[],
  barangays: [{ id: "poblacion", name: "Poblacion", status: "ACTIVE", collection_service_available: true, street_count: 1, streets_with_path: 0, active_route_count: 0, live_run_count: 0, latitude: null, longitude: null }],
  streets: [{ id: "street-1", name: "Gonzales St", area: null, active_resident_count: 0, account_link_count: 0, route_plan_count: 0, route_run_record_count: 0 }],
}));
vi.mock("@/lib/adminQuery", () => ({
  useAdminMutation: (action: unknown) => action,
  useAdminResource: (_resource: string, key: string[]) => ({ data: key[0] === "manager" ? mocks.barangays : mocks.streets, setData: vi.fn(), dataUpdatedAt: 1, isLoading: false, isFetching: false, error: key[0] === "manager" ? mocks.overviewError : mocks.streetsError, refetch: key[0] === "manager" ? mocks.retryOverview : mocks.retryStreets }),
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
  mocks.overviewError = null; mocks.streetsError = null; mocks.retryOverview.mockReset(); mocks.retryStreets.mockReset();
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

it("uses one retry notice for failed barangay and street refreshes", async () => {
  mocks.overviewError = new Error("offline"); mocks.streetsError = new Error("offline");
  await act(async () => root.render(<AdminBarangays />));
  expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
  const retries = [...host.querySelectorAll("button")].filter((item) => item.textContent?.trim() === "Try again");
  expect(retries).toHaveLength(1);
  expect(host.textContent).toContain("Gonzales St");
  await act(async () => retries[0].click());
  expect(mocks.retryOverview).toHaveBeenCalledOnce();
  expect(mocks.retryStreets).toHaveBeenCalledOnce();
});

describe("street editor unsaved changes", () => {
  it("shows required-field validation inline without opening another dialog", async () => {
    const editor = await openCreate(); await submit(editor);
    expect(document.getElementById("barangay-street-name")).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById("barangay-street-name-error")).toHaveTextContent("Street name is required.");
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
    change("barangay-street-name", "New street");
    expect(document.getElementById("barangay-street-name-error")).toBeNull();
    await submit(editor);
    expect(mocks.create).toHaveBeenCalledWith("poblacion", { name: "New street", area: null });
  });
  it("blocks duplicate street and area combinations before saving", async () => {
    const editor = await openCreate(); change("barangay-street-name", "  gonzales st  "); await submit(editor);
    expect(document.getElementById("barangay-street-name-error")).toHaveTextContent("already exist");
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("shows a server duplicate as a validation error and keeps the draft", async () => {
    const editor = await openCreate(); change("barangay-street-name", "New street");
    mocks.create.mockRejectedValueOnce(Object.assign(new Error("This street and area already exist in the barangay"), { response: { status: 409 } }));
    await submit(editor);
    expect(document.getElementById("barangay-street-name-error")).toHaveTextContent("already exist");
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.getElementById("barangay-street-name")).toHaveValue("New street");
  });
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
  let Editor: typeof import("./StreetCoverageEditor").default;
  beforeAll(async () => {
    // Load the real editor before faking timers; its first module import is
    // asynchronous and should not consume a matching test's deadline.
    ({ default: Editor } = await vi.importActual<typeof import("./StreetCoverageEditor")>("./StreetCoverageEditor"));
  });
  const openCoverage = async (save = vi.fn(), initialPath: [number, number][] | null = null, onOpenChange = vi.fn()) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await act(async () => root.render(<Editor open streetName="Test street" barangayName="Poblacion" initialPath={initialPath} center={points[0]} onOpenChange={onOpenChange} onSave={save} />));
    return save;
  };
  const mark = (point: [number, number]) => act(() => mocks.mapHandlers.get("click")!({ latlng: { lat: point[0], lng: point[1] } }));
  const finishMatching = () => act(async () => { await vi.advanceTimersByTimeAsync(300); });

  it.each(["Cancel", "Close", "Escape", "outside"])("confirms before closing an unfinished path with %s", async (method) => {
    const close = vi.fn();
    const save = await openCoverage(vi.fn(), null, close);
    mark(points[0]);
    const editor = document.querySelector('[role="dialog"]')!;
    if (method === "Escape") {
      await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    } else if (method === "outside") {
      // Radix installs the outside-pointer listener on the next timer tick.
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      await act(async () => document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })));
    } else {
      await click(method, editor);
    }
    expect(document.body.textContent).toContain("Discard Path Changes?");
    expect(close).not.toHaveBeenCalled();
    await click("Keep Editing");
    expect(document.body.textContent).not.toContain("Discard Path Changes?");
    expect(mocks.markers.map(marker => marker.coordinate)).toEqual([points[0]]);
    expect(close).not.toHaveBeenCalled();
    await click("Cancel", editor);
    await click("Discard Changes");
    expect(close).toHaveBeenCalledExactlyOnceWith(false);
    expect(save).not.toHaveBeenCalled();
  });

  it.each<{ initialPath: [number, number][] | null }>([{ initialPath: null }, { initialPath: road }])("closes an unchanged path directly: $initialPath", async ({ initialPath }) => {
    const close = vi.fn();
    await openCoverage(vi.fn(), initialPath, close);
    await click("Cancel");
    expect(close).toHaveBeenCalledExactlyOnceWith(false);
    expect(document.body.textContent).not.toContain("Discard Path Changes?");
  });

  it("keeps failed road-matching points when the discard dialog is dismissed", async () => {
    mocks.road.mockRejectedValue(new Error("Road service unavailable"));
    const close = vi.fn();
    await openCoverage(vi.fn(), null, close); mark(points[0]); mark(points[1]); await finishMatching();
    await click("Cancel");
    expect(document.body.textContent).toContain("Discard Path Changes?");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.body.textContent).not.toContain("Discard Path Changes?");
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("Road service unavailable");
    expect(mocks.markers.map(marker => marker.coordinate)).toEqual(points);
    expect(close).not.toHaveBeenCalled();
  });

  it("guards clearing a saved path and closes a successful save without a discard prompt", async () => {
    const close = vi.fn();
    const save = await openCoverage(vi.fn(), road, close);
    await click("Clear"); await click("Cancel");
    expect(document.body.textContent).toContain("Discard Path Changes?");
    await click("Keep Editing"); await click("Save path");
    expect(save).toHaveBeenCalledWith(null);
    expect(close).toHaveBeenCalledExactlyOnceWith(false);
    expect(document.body.textContent).not.toContain("Discard Path Changes?");
  });

  it("does not close or show a discard prompt while saving", async () => {
    let finishSave!: () => void;
    const close = vi.fn();
    const save = vi.fn(() => new Promise<void>(resolve => { finishSave = resolve; }));
    await openCoverage(save, road, close); await click("Clear"); await click("Save path");
    await click("Close");
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(close).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("Discard Path Changes?");
    await act(async () => finishSave());
    expect(close).toHaveBeenCalledExactlyOnceWith(false);
  });

  it.each<{ initialPath: [number, number][] | null }>([{ initialPath: null }, { initialPath: [] }])("does not save an unchanged empty path: $initialPath", async ({ initialPath }) => {
    const save = await openCoverage(vi.fn(), initialPath);
    expect(button("Save path")).toBeDisabled();
    await click("Save path");
    expect(save).not.toHaveBeenCalled();
    mark(points[0]);
    expect(button("Save path")).toBeDisabled();
    await click("Undo");
    expect(button("Save path")).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it("does not save an existing path until it changes", async () => {
    const save = await openCoverage(vi.fn(), road);
    expect(button("Save path")).toBeDisabled();
    expect(document.body.textContent).toContain("No changes to save");
    await click("Save path");
    expect(save).not.toHaveBeenCalled();
    expect(mocks.road).not.toHaveBeenCalled();
    await click("Clear");
    expect(button("Save path")).not.toBeDisabled();
    await click("Save path");
    expect(save).toHaveBeenCalledWith(null);
  });

  it("does not treat simplified control points as changes to a saved path", async () => {
    const detailedPath: [number, number][] = Array.from({ length: 30 }, (_, index) => [13.931 + index * 0.00001, 121.424 + index * 0.00001]);
    const save = await openCoverage(vi.fn(), detailedPath);
    expect(mocks.markers.length).toBeLessThan(detailedPath.length);
    expect(mocks.lines).toContainEqual(detailedPath);
    expect(button("Save path")).toBeDisabled();
    await click("Save path");
    expect(save).not.toHaveBeenCalled();
  });

  it("disables saving when road matching returns the existing geometry", async () => {
    mocks.road.mockResolvedValue({ coordinates: road, snappedPoints: [...road, road[road.length - 1]], source: "osrm" });
    const save = await openCoverage(vi.fn(), road);
    mark(road[road.length - 1]);
    await finishMatching();
    expect(button("Save path")).toBeDisabled();
    await click("Save path");
    expect(save).not.toHaveBeenCalled();
  });

  it("disables saving after reversing twice restores the original collection order", async () => {
    mocks.road.mockResolvedValue({ coordinates: road.slice().reverse(), snappedPoints: points.slice().reverse(), source: "osrm" });
    const save = await openCoverage(vi.fn(), points);
    await click("Reverse");
    await finishMatching();
    expect(button("Save path")).not.toBeDisabled();
    mocks.road.mockResolvedValue({ coordinates: road, snappedPoints: points, source: "osrm" });
    await click("Reverse");
    await finishMatching();
    expect(button("Save path")).toBeDisabled();
    await click("Save path");
    expect(save).not.toHaveBeenCalled();
  });

  it("draws and saves the road shape rather than a line between clicks", async () => {
    mocks.road.mockResolvedValue({ coordinates: road, snappedPoints: points, source: "osrm" });
    const save = await openCoverage(); mark(points[0]); mark(points[1]);
    expect(document.body.textContent).toContain("Matching roads…");
    expect(button("Save path")).toBeDisabled();
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
    expect(button("Save path")).toBeDisabled();
    await click("Save path"); expect(save).not.toHaveBeenCalled();
  });

  it("keeps marked points through a 503 and retries without saving an unmatched path", async () => {
    mocks.road.mockRejectedValueOnce(Object.assign(new Error("Something went wrong. Please try again."), { isAxiosError: true, response: { status: 503 } }));
    const save = await openCoverage(); mark(points[0]); mark(points[1]); await finishMatching();
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("Road matching is temporarily unavailable");
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("Your marked points are kept while this window stays open.");
    expect(document.querySelector('[role="alert"]')).not.toHaveTextContent("Something went wrong");
    expect(mocks.markers.map(marker => marker.coordinate)).toEqual(points);
    expect(mocks.lines).toHaveLength(0);
    expect(button("Save path")).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
    mocks.road.mockResolvedValue({ coordinates: road, snappedPoints: points, source: "osrm" });
    await click("Try again");
    expect(button("Save path")).toBeDisabled();
    await finishMatching();
    expect(mocks.road.mock.calls[1][0]).toEqual(points);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    await click("Save path");
    expect(save).toHaveBeenCalledWith(road);
  });

  it.each([
    [Object.assign(new Error("timeout of 8000ms exceeded"), { isAxiosError: true, code: "ECONNABORTED" }), "Road matching took too long", "Check your connection"],
    [Object.assign(new Error("Too many requests"), { isAxiosError: true, response: { status: 429 } }), "Road matching is busy", "Wait a moment"],
    [Object.assign(new Error("Move the numbered points closer to the street and try again."), { isAxiosError: true, response: { status: 422 } }), "Adjust the marked points", "Move the numbered points closer to the street"],
  ])("shows actionable guidance for a matching failure: %s", async (failure, title, description) => {
    mocks.road.mockRejectedValueOnce(failure);
    await openCoverage(); mark(points[0]); mark(points[1]); await finishMatching();
    expect(document.querySelector('[role="alert"]')).toHaveTextContent(title);
    expect(document.querySelector('[role="alert"]')).toHaveTextContent(description);
    expect(mocks.markers.map(marker => marker.coordinate)).toEqual(points);
    expect(button("Save path")).toBeDisabled();
  });

  it("keeps the matched path after a failed save and lets the user save again", async () => {
    const save = vi.fn().mockRejectedValueOnce(Object.assign(new Error("Something went wrong"), { isAxiosError: true, response: { status: 503 } })).mockResolvedValueOnce(undefined);
    mocks.road.mockResolvedValue({ coordinates: road, snappedPoints: points, source: "osrm" });
    await openCoverage(save); mark(points[0]); mark(points[1]); await finishMatching();
    await click("Save path");
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("Path wasn't saved");
    expect(document.querySelector('[role="alert"]')).toHaveTextContent("Your changes are kept in this window");
    expect(mocks.lines).toContainEqual(road);
    expect(button("Save path")).not.toBeDisabled();
    await click("Save path");
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(road);
    expect(document.querySelector('[role="alert"]')).toBeNull();
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

