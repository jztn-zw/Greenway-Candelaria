import type L from "leaflet";
import { beforeEach, expect, it, vi } from "vitest";
import { createReplayMapRenderer, createReplayTargetIcon, createReplayTargetPopupContent } from "./replayMapRenderer";

const leaflet = vi.hoisted(() => {
  const makeLayer = () => {
    const layer = {
      options: {} as { title?: string },
      addTo: vi.fn(), bindTooltip: vi.fn((_content: unknown, _options?: unknown) => undefined), unbindTooltip: vi.fn(),
      bindPopup: vi.fn((_content: unknown, _options?: unknown) => undefined), unbindPopup: vi.fn(),
      setLatLng: vi.fn(), setLatLngs: vi.fn(), addLatLng: vi.fn(),
      setIcon: vi.fn(), setStyle: vi.fn(), setZIndexOffset: vi.fn(), getElement: vi.fn(() => null),
    };
    for (const method of [layer.addTo, layer.bindTooltip, layer.unbindTooltip, layer.bindPopup, layer.unbindPopup, layer.setLatLng, layer.setLatLngs, layer.addLatLng, layer.setIcon, layer.setStyle, layer.setZIndexOffset]) method.mockReturnValue(layer);
    return layer;
  };
  const bounds = () => ({ isValid: () => true, getSouthWest: () => [14, 121], getNorthEast: () => [14.1, 121.1], extend: vi.fn() });
  return {
    canvas: vi.fn(() => ({})), divIcon: vi.fn((options: unknown) => ({ options })),
    polyline: vi.fn(makeLayer), circleMarker: vi.fn(makeLayer), marker: vi.fn(makeLayer), latLngBounds: vi.fn(bounds),
  };
});
vi.mock("leaflet", () => ({ default: leaflet }));

const path: [number, number][] = [[14, 121], [14.01, 121.01], [14.02, 121.02]];
const first = { name: "Argao Street (Poblacion)", coords: [14.01, 121.01] as [number, number] };
const second = { name: "Second Street (Poblacion)", coords: [14.02, 121.02] as [number, number] };
const setup = () => {
  const layer = { clearLayers: vi.fn(), removeLayer: vi.fn() };
  const contains = vi.fn(() => true);
  const map = { getBounds: () => ({ contains }), flyToBounds: vi.fn() };
  const renderer = createReplayMapRenderer(map as unknown as L.Map, layer as unknown as L.LayerGroup, {} as L.DivIcon);
  return { renderer, layer, map, contains };
};
beforeEach(() => vi.clearAllMocks());

it("reuses the trip geometry, truck and target across playback frames", () => {
  const { renderer, layer, map } = setup();
  renderer.setTrip(path, first, []);
  const truck = leaflet.marker.mock.results[0].value;
  const fullTrail = leaflet.polyline.mock.results[0].value;
  const traversed = leaflet.polyline.mock.results[1].value;
  const head = leaflet.polyline.mock.results[2].value;
  for (let index = 0; index <= 100; index++) renderer.setPosition(index / 100);
  renderer.setTrip(path, { ...first }, []);
  expect(leaflet.polyline).toHaveBeenCalledTimes(3);
  expect(leaflet.circleMarker).toHaveBeenCalledTimes(2);
  expect(leaflet.marker).toHaveBeenCalledTimes(2);
  expect(layer.clearLayers).toHaveBeenCalledTimes(1);
  expect(map.flyToBounds).toHaveBeenCalledTimes(1);
  expect(truck.setLatLng).toHaveBeenCalledTimes(101);
  expect(fullTrail.setLatLngs).not.toHaveBeenCalled();
  expect(traversed.setLatLngs).not.toHaveBeenCalled();
  expect(traversed.addLatLng).toHaveBeenCalledExactlyOnceWith(path[1]);
  expect(head.setLatLngs).toHaveBeenLastCalledWith([path[1], path[1]]);
  renderer.setPosition(1);
  expect(truck.setLatLng).toHaveBeenCalledTimes(101);
});

it("updates only the trail prefix on a large seek and correctly rewinds it", () => {
  const { renderer } = setup();
  const longPath: [number, number][] = Array.from({ length: 100 }, (_, index) => [14 + index / 1000, 121]);
  renderer.setTrip(longPath, null, []);
  const traversed = leaflet.polyline.mock.results[1].value;
  const head = leaflet.polyline.mock.results[2].value;
  const truck = leaflet.marker.mock.results[0].value;
  renderer.setPosition(50.5);
  expect(traversed.setLatLngs).toHaveBeenLastCalledWith(longPath.slice(0, 51));
  expect(traversed.addLatLng).not.toHaveBeenCalled();
  renderer.setPosition(0.5);
  expect(traversed.setLatLngs).toHaveBeenLastCalledWith([longPath[0]]);
  expect(head.setLatLngs).toHaveBeenLastCalledWith([longPath[0], [expect.closeTo(14.0005, 10), 121]]);
  expect(truck.setLatLng).toHaveBeenLastCalledWith([expect.closeTo(14.0005, 10), 121]);
  renderer.setPosition(500);
  expect(truck.setLatLng).toHaveBeenLastCalledWith(longPath[99]);
});

it("keeps completed pins, changes the existing current pin to a check, and restores historical state on rewind", () => {
  const { renderer, layer } = setup();
  renderer.setTrip(path, first, []);
  const firstPin = leaflet.marker.mock.results[1].value;
  renderer.setTrip(path, second, [first]);
  const secondPin = leaflet.marker.mock.results[2].value;
  expect(firstPin.setIcon).toHaveBeenCalledTimes(1);
  expect(firstPin.bindPopup.mock.lastCall?.[1]).toMatchObject({ closeButton: true, autoPan: true });
  expect(layer.removeLayer).not.toHaveBeenCalled();
  renderer.setTrip(path, null, [first, second]);
  expect(leaflet.marker).toHaveBeenCalledTimes(3);
  expect(layer.removeLayer).not.toHaveBeenCalled();
  expect((secondPin.bindPopup.mock.lastCall?.[0] as HTMLElement).textContent).toBe("Completed streetSecond StreetPoblacion");
  renderer.setTrip(path, first, []);
  expect(layer.removeLayer).toHaveBeenCalledExactlyOnceWith(secondPin);
  expect(firstPin.bindPopup.mock.lastCall?.[1]).toMatchObject({ closeButton: true, autoPan: true });
  expect((firstPin.bindPopup.mock.lastCall?.[0] as HTMLElement).textContent).toBe("Current targetArgao StreetPoblacion");
});

it("preserves the user's map view and fits only a newly selected offscreen target", () => {
  const { renderer, map, contains } = setup();
  renderer.setTrip(path, first, []);
  for (let index = 0; index < 10; index++) renderer.setPosition(index / 10);
  renderer.setTrip(path, first, []);
  expect(map.flyToBounds).toHaveBeenCalledTimes(1);
  contains.mockReturnValue(false);
  renderer.setTrip(path, second, [first]);
  renderer.setTrip(path, { ...second }, [first]);
  renderer.setTrip(path, null, [first, second]);
  expect(map.flyToBounds).toHaveBeenCalledTimes(2);
});

it("clears replay state when switching trips or leaving replay, including a single-point trip", () => {
  const { renderer, layer } = setup();
  renderer.setTrip(path, first, []);
  const oldTruck = leaflet.marker.mock.results[0].value;
  renderer.setPosition(1);
  renderer.setTrip([[14.1, 121.1]], null, []);
  const newTruck = leaflet.marker.mock.results[2].value;
  renderer.setPosition(1);
  expect(newTruck.setLatLng).toHaveBeenLastCalledWith([14.1, 121.1]);
  expect(layer.clearLayers).toHaveBeenCalledTimes(2);
  renderer.setTrip(undefined, null, []);
  renderer.setPosition(0);
  expect(layer.clearLayers).toHaveBeenCalledTimes(3);
  expect(oldTruck.setLatLng).toHaveBeenCalledTimes(1);
  expect(newTruck.setLatLng).toHaveBeenCalledTimes(1);
  renderer.clear();
  expect(layer.clearLayers).toHaveBeenCalledTimes(4);
});

it("uses safe street labels, different current/completed symbols, and refreshes the existing paths for the theme", () => {
  const { renderer } = setup();
  const target = { ...first, name: '<img src="x" onerror="alert(1)">' };
  renderer.setTrip(path, target, []);
  const pin = leaflet.marker.mock.results[1].value;
  const popup = pin.bindPopup.mock.lastCall?.[0] as HTMLElement;
  expect(popup.querySelector("img")).toBeNull();
  expect(popup.textContent).toContain(target.name);
  expect(pin.bindTooltip).not.toHaveBeenCalled();
  expect(pin.bindPopup.mock.lastCall?.[1]).toMatchObject({ className: "tracking-popup replay-target-popup", minWidth: 216 });
  const currentIcon = createReplayTargetIcon("current");
  const doneIcon = createReplayTargetIcon("done");
  const skippedIcon = createReplayTargetIcon("skipped");
  const current = currentIcon.options.html as HTMLElement;
  const done = doneIcon.options.html as HTMLElement;
  const skipped = skippedIcon.options.html as HTMLElement;
  const pinPath = "M 18 1 C 8.6 1 1 8.6 1 18 C 1 29.5 18 47 18 47 C 18 47 35 29.5 35 18 C 35 8.6 27.4 1 18 1 Z";
  for (const icon of [current, done, skipped]) expect(icon.querySelector("svg path")?.getAttribute("d")).toBe(pinPath);
  expect(currentIcon.options.iconSize).toEqual([38, 50]);
  expect(doneIcon.options.iconSize).toEqual([34, 46]);
  expect(currentIcon.options.popupAnchor).toEqual([0, -42]);
  expect(current.querySelector("g circle")).not.toBeNull();
  expect(done.querySelector("g path")?.getAttribute("d")).toBe("m12 18 4 4 8-9");
  expect(skipped.querySelector("g path")?.getAttribute("d")).toBe("M18 12v8");
  expect(skipped.querySelector("svg")?.getAttribute("style")).toContain("hsl(var(--warning))");
  renderer.refreshColors();
  expect(leaflet.polyline.mock.results[0].value.setStyle).toHaveBeenCalledOnce();
  expect(leaflet.polyline).toHaveBeenCalledTimes(3);
});

it("keeps skipped pins alongside completed pins, with recorded reason, and removes future outcomes on rewind", () => {
  const { renderer, layer } = setup();
  const skipped = { ...first, skippedReason: '<b>Road blocked</b>' };
  renderer.setTrip(path, skipped, [], []);
  const firstPin = leaflet.marker.mock.results[1].value;
  renderer.setTrip(path, second, [], [skipped]);
  expect(firstPin.setIcon).toHaveBeenCalledOnce();
  const popup = firstPin.bindPopup.mock.lastCall?.[0] as HTMLElement;
  expect(popup.textContent).toContain("Skipped streetArgao StreetPoblacion<b>Road blocked</b>");
  expect(popup.querySelector("b")).toBeNull();
  expect(firstPin.bindPopup.mock.lastCall?.[1]).toMatchObject({ closeButton: true });
  const secondPin = leaflet.marker.mock.results[2].value;
  renderer.setTrip(path, null, [second], [skipped]);
  expect(layer.removeLayer).not.toHaveBeenCalled();
  renderer.setTrip(path, first, [], []);
  expect(layer.removeLayer).toHaveBeenCalledExactlyOnceWith(secondPin);
  expect((firstPin.bindPopup.mock.lastCall?.[0] as HTMLElement).textContent).toContain("Current target");
});

it("keeps the popup readable for long street names and separates barangay and skipped reason", () => {
  const target = { name: "Very long street name that should wrap cleanly (Poblacion)", coords: first.coords, skippedReason: "Truck could not enter the street" };
  const content = createReplayTargetPopupContent(target, "skipped");
  expect(content.style.width).toBe("216px");
  expect(content.style.paddingRight).toBe("18px");
  expect(content.querySelector("strong")?.textContent).toBe("Very long street name that should wrap cleanly");
  expect((content.querySelector("strong") as HTMLElement).style.overflowWrap).toBe("anywhere");
  expect(content.textContent).toBe("Skipped streetVery long street name that should wrap cleanlyPoblacionTruck could not enter the street");
  expect(content.querySelectorAll("div").length).toBeGreaterThan(4);
});
