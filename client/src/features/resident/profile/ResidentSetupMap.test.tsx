import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResidentSetupMap from "./ResidentSetupMap";
const fake = vi.hoisted(() => ({
  tileEvents: {} as Record<string, () => void>,
  mapEvents: {} as Record<string, (event: { latlng: { lat: number; lng: number } }) => void>,
  remove: vi.fn(), marker: vi.fn(), createMap: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), setView: vi.fn(), zoom: 16,
}));
vi.mock("leaflet", () => {
  const layer = { addTo: () => layer, clearLayers: vi.fn() };
  const instance = { fitBounds: vi.fn(), setView: fake.setView, zoomIn: fake.zoomIn, zoomOut: fake.zoomOut, invalidateSize: vi.fn(), remove: fake.remove,
    getZoom: () => fake.zoom,
    on: (name: string, callback: typeof fake.mapEvents[string]) => { fake.mapEvents[name] = callback; },
    getCenter: () => ({ lat: 13.93, lng: 121.425 }), getBounds: () => ({ contains: () => true }), panTo: vi.fn() };
  const tiles = { on: (name: string, callback: () => void) => { fake.tileEvents[name] = callback; return tiles; }, addTo: () => tiles };
  return { default: { map: fake.createMap.mockImplementation(() => instance), tileLayer: () => tiles,
    latLngBounds: (value: unknown) => value, layerGroup: () => layer, polyline: () => ({ addTo: vi.fn() }),
    divIcon: vi.fn(), marker: fake.marker.mockImplementation(() => ({ addTo() { return this; }, on: vi.fn() })),
    circleMarker: () => ({ addTo: vi.fn() }), circle: () => ({ addTo: vi.fn() }),
  } };
});
const street = { id: "s", name: "Main", coverage_path: [[13.93, 121.42], [13.93, 121.43]] as [number, number][], location_points: [[13.93, 121.42], [13.93, 121.423], [13.93, 121.427], [13.93, 121.43]] as [number, number][] };
const props = () => ({ streets: [street], streetId: "s", center: null, value: null, method: "MANUAL_PIN" as const,
  disabled: false, onPin: vi.fn(), onStreetPoint: vi.fn(), onAvailability: vi.fn() });
beforeEach(() => { vi.clearAllMocks(); fake.zoom = 16; vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it("scales street points with zoom without changing saved points or selection", () => {
  const options = props(); render(<ResidentSetupMap {...options} method="STREET_POINT" />);
  const canvas = screen.getByRole('region', { name: 'Resident location map' });
  expect(canvas.style.getPropertyValue('--street-point-size')).toBe('18px');
  expect(canvas.style.getPropertyValue('--map-pin-scale')).toBe('0.9');
  fake.zoom = 13;
  act(() => fake.mapEvents.zoomend({ latlng: { lat: 0, lng: 0 } }));
  expect(canvas.style.getPropertyValue('--street-point-size')).toBe('10px');
  expect(canvas.style.getPropertyValue('--map-pin-scale')).toBe('0.6');
  expect(canvas.style.getPropertyValue('--street-point-number-opacity')).toBe('0');
  fake.zoom = 19;
  act(() => fake.mapEvents.zoomend({ latlng: { lat: 0, lng: 0 } }));
  expect(canvas.style.getPropertyValue('--street-point-size')).toBe('30px');
  expect(canvas.style.getPropertyValue('--map-pin-scale')).toBe('1.15');
  expect(canvas.style.getPropertyValue('--street-point-number-opacity')).toBe('1');
  expect(fake.marker).toHaveBeenCalledTimes(4);
  expect(options.onStreetPoint).not.toHaveBeenCalled();
});
it("shows only the saved resident pin in the neutral preview regardless of its original method", () => {
  const options = props();
  render(<ResidentSetupMap {...options} method={null} value={{ method: 'STREET_POINT', latitude: 13.93, longitude: 121.423, pointIndex: 1 }} />);
  expect(fake.marker).toHaveBeenCalledOnce();
  expect(fake.marker.mock.calls[0][0]).toEqual([13.93, 121.423]);
  expect(fake.marker.mock.calls[0][1]).toMatchObject({ interactive: false, title: 'Your saved location' });
  expect(fake.setView).toHaveBeenCalledWith([13.93, 121.423], 17);
  act(() => fake.tileEvents.load());
  act(() => fake.mapEvents.click({ latlng: { lat: 13.94, lng: 121.43 } }));
  expect(options.onPin).not.toHaveBeenCalled();
});
it("uses tracking-style zoom buttons and focuses a fresh GPS location once", () => {
  const options = props();
  const value = { method: 'CURRENT_LOCATION' as const, latitude: 13.93, longitude: 121.425, capturedAt: '2026-10-21T00:00:00Z', accuracyMeters: 20 };
  const view = render(<ResidentSetupMap {...options} value={value} />);
  expect(fake.createMap.mock.calls[0][1]).toMatchObject({ zoomControl: false });
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
  expect(fake.zoomIn).toHaveBeenCalledOnce(); expect(fake.zoomOut).toHaveBeenCalledOnce();
  expect(fake.setView).toHaveBeenCalledWith([13.93, 121.425], 17);
  const calls = fake.setView.mock.calls.length;
  view.rerender(<ResidentSetupMap {...options} value={{ ...value }} disabled />);
  expect(fake.setView).toHaveBeenCalledTimes(calls);
  expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
});
it("accepts map clicks only when loaded and permits keyboard-center pinning", () => {
  const options = props(); render(<ResidentSetupMap {...options} />);
  act(() => fake.mapEvents.click({ latlng: { lat: 13.93, lng: 121.425 } }));
  expect(options.onPin).not.toHaveBeenCalled();
  act(() => fake.tileEvents.load());
  expect(options.onAvailability).toHaveBeenLastCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: 'Place Pin at Map Center' }));
  expect(options.onPin).toHaveBeenCalledWith([13.93, 121.425]);
});
it("keeps the initialized map ready while zooming, moving and placing pins loads more tiles", () => {
  const options = props(); const view = render(<ResidentSetupMap {...options} />);
  expect(screen.getByText('Loading map…')).toBeInTheDocument();
  act(() => fake.tileEvents.load());
  options.onAvailability.mockClear();
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  act(() => fake.tileEvents.loading());
  expect(screen.queryByText('Loading map…')).toBeNull();
  expect(options.onAvailability).not.toHaveBeenCalledWith(false);
  expect(screen.getByRole('button', { name: 'Place Pin at Map Center' })).toBeEnabled();
  act(() => fake.mapEvents.click({ latlng: { lat: 13.9301, lng: 121.425 } }));
  expect(options.onPin).toHaveBeenCalledWith([13.9301, 121.425]);
  view.rerender(<ResidentSetupMap {...options} value={{ method: 'MANUAL_PIN', latitude: 13.9301, longitude: 121.425 }} />);
  act(() => fake.tileEvents.loading());
  expect(screen.queryByText('Loading map…')).toBeNull();
  expect(fake.createMap).toHaveBeenCalledOnce();
  act(() => fake.tileEvents.load());
  expect(options.onAvailability).toHaveBeenLastCalledWith(true);
});
it("still reports background tile failures and times out stalled tiles after initialization", () => {
  const options = props(); render(<ResidentSetupMap {...options} />);
  act(() => fake.tileEvents.load());
  act(() => fake.tileEvents.loading());
  act(() => fake.tileEvents.tileerror());
  expect(screen.getByRole('button', { name: 'Retry Map' })).toBeInTheDocument();
  expect(options.onAvailability).toHaveBeenLastCalledWith(false);
  act(() => fake.tileEvents.loading());
  act(() => fake.tileEvents.load());
  expect(screen.queryByRole('button', { name: 'Retry Map' })).toBeNull();
  act(() => fake.tileEvents.loading());
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole('button', { name: 'Retry Map' })).toBeInTheDocument();
});
it("handles a tile error with retry and cleans up the previous map", () => {
  const options = props(); render(<ResidentSetupMap {...options} />);
  act(() => fake.tileEvents.tileerror());
  expect(options.onAvailability).toHaveBeenLastCalledWith(false);
  expect(screen.getByText(/map couldn't load/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry Map' }));
  expect(fake.remove).toHaveBeenCalledOnce(); expect(fake.createMap).toHaveBeenCalledTimes(2);
  act(() => fake.tileEvents.load()); expect(options.onAvailability).toHaveBeenLastCalledWith(true);
});
it("ends an unresponsive map load and clears the timer on unmount", () => {
  const options = props(); const view = render(<ResidentSetupMap {...options} />);
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole('button', { name: 'Retry Map' })).toBeInTheDocument();
  view.unmount(); const calls = options.onAvailability.mock.calls.length;
  act(() => vi.runAllTimers()); expect(options.onAvailability).toHaveBeenCalledTimes(calls);
});
it("renders only saved admin markers and blocks selection while saving", () => {
  const options = props(); render(<ResidentSetupMap {...options} method="STREET_POINT" disabled />);
  expect(fake.marker).toHaveBeenCalledTimes(4);
  act(() => fake.tileEvents.load());
  act(() => fake.mapEvents.click({ latlng: { lat: 13.93, lng: 121.425 } }));
  expect(options.onPin).not.toHaveBeenCalled(); expect(options.onStreetPoint).not.toHaveBeenCalled();
});
