import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import L from "leaflet";
import RouteStopsMap from "./RouteStopsMap";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("zooms with the mouse wheel over the route preview and keeps button zoom working", async () => {
  for (const field of ["clientWidth", "offsetWidth"] as const) vi.spyOn(HTMLElement.prototype, field, "get").mockReturnValue(400);
  for (const field of ["clientHeight", "offsetHeight"] as const) vi.spyOn(HTMLElement.prototype, field, "get").mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 200, width: 400, height: 200, toJSON: () => ({}),
  });
  // Keep Leaflet's real map and wheel handler; omit tile requests and SVG rendering in jsdom.
  const layer = { addTo: vi.fn().mockReturnThis(), bindTooltip: vi.fn().mockReturnThis() };
  vi.spyOn(L, "tileLayer").mockReturnValue(layer as unknown as L.TileLayer);
  vi.spyOn(L, "polyline").mockReturnValue(layer as unknown as L.Polyline);
  vi.spyOn(L, "marker").mockReturnValue(layer as unknown as L.Marker);
  const createMap = vi.spyOn(L, "map");
  render(<RouteStopsMap barangays={[]} stops={[{ id: "street", name: "Main Street", coveragePath: [[13.93, 121.42], [13.931, 121.421]] }]} />);
  const map = createMap.mock.results[0].value as L.Map;
  const canvas = screen.getByLabelText("Ordered street coverage route map");
  const initialPinScale = Number(canvas.style.getPropertyValue('--map-pin-scale'));
  expect(initialPinScale).toBeGreaterThan(0);
  const before = map.getZoom();
  fireEvent.wheel(screen.getByLabelText("Ordered street coverage route map"), { deltaY: 120, deltaMode: 0, clientX: 200, clientY: 100 });
  await waitFor(() => expect(map.getZoom()).toBeLessThan(before));
  const afterWheel = map.getZoom();
  expect(Number(canvas.style.getPropertyValue('--map-pin-scale'))).toBeLessThan(initialPinScale);
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(map.getZoom()).toBe(afterWheel + 1);
});
