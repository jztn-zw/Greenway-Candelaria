import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import L from 'leaflet';
import RouteMapView from '@/features/collector/route-map/components/RouteMapView';
import type { RouteStop } from '@/features/collector/route-map/types';
import AdminTrackingMap from '@/features/admin/truck-tracking/components/AdminTrackingMap';
import type { AdminTruck } from '@/features/admin/truck-tracking/types';

vi.mock('@/lib/adminQuery', () => ({ useAdminFetch: () => vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(['collector', 'admin'] as const)('%s toggles the target and full route and clears pin details on empty map clicks', async role => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  for (const field of ['clientWidth', 'offsetWidth'] as const) vi.spyOn(HTMLElement.prototype, field, 'get').mockReturnValue(500);
  for (const field of ['clientHeight', 'offsetHeight'] as const) vi.spyOn(HTMLElement.prototype, field, 'get').mockReturnValue(350);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 500, bottom: 350, width: 500, height: 350, toJSON: () => ({}) });
  vi.spyOn(L, 'tileLayer').mockImplementation(() => L.layerGroup() as unknown as L.TileLayer);
  const paths = vi.spyOn(L, 'polyline').mockImplementation(() => L.layerGroup() as unknown as L.Polyline);
  const originalMap = L.map;
  const createMap = vi.spyOn(L, 'map').mockImplementation((element, options) => originalMap(element, {
    ...options, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
  }));
  const stops = ['Current Street', 'Second Street', 'Third Street'].map((barangay, index): RouteStop => ({
    id: `stop-${index}`, stopNumber: index + 1, barangay, status: index ? 'not-yet' : 'in-progress',
    barangayName: 'Poblacion',
    coords: [13.93 + index * 0.0004, 121.42],
    coveragePath: [[13.93 + index * 0.0004, 121.42], [13.9301 + index * 0.0004, 121.42]], distanceKm: 0,
  }));
  const original = JSON.stringify(stops);
  const truck = { id: 'truck', status: 'on-the-way', name: 'Test truck', route: [], coords: null,
    totalBarangays: 3, completedBarangays: 0, lastPingIso: null, driverMessages: [] } as unknown as AdminTruck;
  const mapView = (items: RouteStop[]) => role === 'collector'
    ? <RouteMapView stops={items} truckCoords={null} />
    : <AdminTrackingMap trucks={[]} focusedTruckId={null} activeTruck={truck} activeTruckCoords={null}
        activeStopCoords={null} autoRoutedStops={items} onMarkerClick={() => {}} />;
  const view = render(mapView(stops));
  expect(screen.queryByRole('combobox')).toBeNull();
  await waitFor(() => expect(view.container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1));
  expect(view.container.querySelector('[title^="1. Current Street"]')).not.toBeNull();
  expect(view.container.querySelector('.leaflet-popup-content')).toBeNull();
  const map = createMap.mock.results[0].value as L.Map;
  const fullRoute = screen.getByRole('button', { name: 'Show Full Route' });
  paths.mockClear();
  fireEvent.click(fullRoute);
  expect(fullRoute).toHaveAttribute('aria-pressed', 'true');
  for (const stop of stops) expect(paths).toHaveBeenCalledWith(stop.coveragePath, expect.anything());
  await waitFor(() => expect(view.container.querySelector('[title^="2 nearby stops"]')).not.toBeNull());
  act(() => { map.setZoom(17); });
  await waitFor(() => expect(view.container.querySelector('[title^="2 nearby stops"]')).toBeNull());
  expect(view.container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(3);
  fireEvent.click(view.container.querySelector<HTMLElement>('[title^="2. Second Street"]')!);
  await waitFor(() => expect(view.container.querySelector('.leaflet-popup-content')).toHaveTextContent('Second Street'));
  expect(view.container.querySelector('.leaflet-popup-content')).toHaveTextContent('Barangay: Poblacion');
  expect(view.container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(3);
  expect(view.container.querySelector('[title^="2. Second Street"]')?.innerHTML).toContain('0 0 0 3px');
  act(() => { map.fire('click'); });
  expect(view.container.querySelector('.leaflet-popup-content')).toBeNull();
  expect(view.container.querySelector('[title^="2. Second Street"]')?.innerHTML).not.toContain('0 0 0 3px');
  act(() => { map.setZoom(16); });
  expect(view.container.querySelector('.leaflet-popup-content')).toBeNull();
  paths.mockClear();
  fireEvent.click(fullRoute);
  expect(fullRoute).toHaveAttribute('aria-pressed', 'false');
  expect(view.container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);
  expect(paths).toHaveBeenCalled();
  expect(paths.mock.calls.every(([path]) => path === stops[0].coveragePath)).toBe(true);
  fireEvent.click(view.container.querySelector<HTMLElement>('[title^="1. Current Street"]')!);
  await waitFor(() => expect(view.container.querySelector('.leaflet-popup-content')).toHaveTextContent('Current Street'));
  act(() => { map.fire('click'); });
  expect(view.container.querySelector('.leaflet-popup-content')).toBeNull();
  const progressed = stops.map((stop, index) => ({ ...stop, status: index === 0 ? 'done' as const : index === 1 ? 'in-progress' as const : stop.status }));
  view.rerender(mapView(progressed));
  expect(view.container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);
  expect(view.container.querySelector('[title^="2. Second Street"]')).not.toBeNull();
  expect(JSON.stringify(stops)).toBe(original);
  expect(createMap).toHaveBeenCalledOnce();
});
