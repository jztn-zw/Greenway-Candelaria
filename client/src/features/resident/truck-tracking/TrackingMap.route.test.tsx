import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import L from 'leaflet';
import TrackingMap from './TrackingMap';
import type { Truck } from './types';

const mocks = vi.hoisted(() => ({
  fetch: (_domain: string, _key: unknown, provider: () => Promise<unknown>) => provider(),
  road: vi.fn(),
}));
vi.mock('@/lib/residentQuery', () => ({ useResidentFetch: () => mocks.fetch }));
vi.mock('@/services/roadRoutingService', () => ({ getRoadRoute: mocks.road, getMultiStopRoadRoute: vi.fn() }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  for (const field of ['clientWidth', 'offsetWidth'] as const) vi.spyOn(HTMLElement.prototype, field, 'get').mockReturnValue(500);
  for (const field of ['clientHeight', 'offsetHeight'] as const) vi.spyOn(HTMLElement.prototype, field, 'get').mockReturnValue(350);
  vi.spyOn(L, 'tileLayer').mockImplementation(() => L.layerGroup() as unknown as L.TileLayer);
  const originalMap = L.map;
  vi.spyOn(L, 'map').mockImplementation((element, options) => originalMap(element, {
    ...options, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
  }));
  mocks.road.mockReset().mockResolvedValue({
    coordinates: [[13.93, 121.42], [13.94, 121.43]], distanceKm: 1, durationMinutes: 3, source: 'osrm',
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const truck = {
  id: 'truck', name: 'Collection truck', plateNumber: 'ABC', status: 'on-the-way',
  coords: [13.93, 121.42], isResidentTruck: true, barangaysAway: 1,
  residentStopStatus: 'not-started', routeStops: [],
} as Truck;
const props = {
  trucks: [truck], focusedTruckId: null, residentBarangayCoords: [13.94, 121.43] as [number, number],
  residentAreaName: 'Resident street', lockedToBarangay: false, collectionDayStatus: 'active' as const,
};

it('draws the home route only for the current resident target and clears it when that target changes', async () => {
  const lines = vi.spyOn(L, 'polyline').mockImplementation(() => L.layerGroup() as unknown as L.Polyline);
  const calculated = vi.fn();
  const view = render(<TrackingMap {...props} onRouteCalculated={calculated} />);
  await waitFor(() => expect(calculated).toHaveBeenCalledTimes(1));
  expect(lines).not.toHaveBeenCalled();
  view.rerender(<TrackingMap {...props} trucks={[{ ...truck, barangaysAway: 0 }]} onRouteCalculated={calculated} />);
  await waitFor(() => expect(lines).toHaveBeenCalledTimes(2));
  const drawn = lines.mock.results.map(result => result.value as L.LayerGroup);
  view.rerender(<TrackingMap {...props} onRouteCalculated={calculated} />);
  await waitFor(() => expect(calculated).toHaveBeenCalledTimes(3));
  const map = vi.mocked(L.map).mock.results[0].value as L.Map;
  expect(drawn.every(layer => !map.hasLayer(layer))).toBe(true);
  expect(lines).toHaveBeenCalledTimes(2);
});

it('does not draw a route for a focused truck that does not serve the resident', async () => {
  const lines = vi.spyOn(L, 'polyline').mockImplementation(() => L.layerGroup() as unknown as L.Polyline);
  const calculated = vi.fn();
  render(<TrackingMap {...props} trucks={[{ ...truck, isResidentTruck: false, barangaysAway: 0 }]}
    focusedTruckId="truck" onRouteCalculated={calculated} />);
  await waitFor(() => expect(calculated).toHaveBeenCalledTimes(1));
  expect(lines).not.toHaveBeenCalled();
});

it('ignores a delayed route response after the resident street stops being the target', async () => {
  const result = { coordinates: [[13.93, 121.42], [13.94, 121.43]], distanceKm: 1, durationMinutes: 3, source: 'osrm' };
  let resolveRoute!: (value: typeof result) => void;
  mocks.road.mockReturnValueOnce(new Promise(resolve => { resolveRoute = resolve; }));
  const lines = vi.spyOn(L, 'polyline').mockImplementation(() => L.layerGroup() as unknown as L.Polyline);
  const calculated = vi.fn();
  const view = render(<TrackingMap {...props} trucks={[{ ...truck, barangaysAway: 0 }]} onRouteCalculated={calculated} />);
  await waitFor(() => expect(mocks.road).toHaveBeenCalledTimes(1));
  view.rerender(<TrackingMap {...props} onRouteCalculated={calculated} />);
  await waitFor(() => expect(calculated).toHaveBeenCalledTimes(1));
  await act(async () => { resolveRoute(result); });
  expect(lines).not.toHaveBeenCalled();
  expect(calculated).toHaveBeenCalledTimes(1);
});
