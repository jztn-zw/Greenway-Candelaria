import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import L from 'leaflet';
import RouteMapView from '@/features/collector/route-map/components/RouteMapView';
import type { RouteStop } from '@/features/collector/route-map/types';

vi.mock('@/components/ui/searchable-select', () => ({ SearchableSelect: ({ value, onValueChange, options }: {
  value: string; onValueChange: (value: string) => void; options: { value: string; label: string }[];
}) => <select aria-label="Focus collection street" value={value} onChange={event => onValueChange(event.target.value)}>
  <option value="">Find a street</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
</select> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('clusters an overview, reveals individual stops on zoom, and focuses a street without changing collection outcomes', async () => {
  for (const field of ['clientWidth', 'offsetWidth'] as const) vi.spyOn(HTMLElement.prototype, field, 'get').mockReturnValue(500);
  for (const field of ['clientHeight', 'offsetHeight'] as const) vi.spyOn(HTMLElement.prototype, field, 'get').mockReturnValue(350);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 500, bottom: 350, width: 500, height: 350, toJSON: () => ({}) });
  vi.spyOn(L, 'tileLayer').mockImplementation(() => L.layerGroup() as unknown as L.TileLayer);
  vi.spyOn(L, 'polyline').mockImplementation(() => L.layerGroup() as unknown as L.Polyline);
  const originalMap = L.map;
  const createMap = vi.spyOn(L, 'map').mockImplementation((element, options) => originalMap(element, {
    ...options, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
  }));
  const stops = ['Current Street', 'Second Street', 'Third Street'].map((barangay, index): RouteStop => ({
    id: `stop-${index}`, stopNumber: index + 1, barangay, status: index ? 'not-yet' : 'in-progress',
    coords: [13.93 + index * 0.0004, 121.42],
    coveragePath: [[13.93 + index * 0.0004, 121.42], [13.9301 + index * 0.0004, 121.42]], distanceKm: 0,
  }));
  const original = JSON.stringify(stops);
  const view = render(<RouteMapView stops={stops} truckCoords={null} />);
  await waitFor(() => expect(view.container.querySelector('[title^="2 nearby stops"]')).not.toBeNull());
  const map = createMap.mock.results[0].value as L.Map;
  act(() => { map.setZoom(16); });
  expect(view.container.querySelector('[title^="2 nearby stops"]')).not.toBeNull();
  act(() => { map.setZoom(17); });
  await waitFor(() => expect(view.container.querySelector('[title^="2 nearby stops"]')).toBeNull());
  expect(view.container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(3);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'stop-1' } });
  await waitFor(() => expect(view.container.querySelector('.leaflet-popup-content')).toHaveTextContent('Second Street'));
  expect(map.getZoom()).toBeGreaterThanOrEqual(16);
  const fullRoute = screen.getByRole('button', { name: 'Show Full Route' });
  fireEvent.click(fullRoute); expect(fullRoute).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(fullRoute); expect(fullRoute).toHaveAttribute('aria-pressed', 'false');
  expect(JSON.stringify(stops)).toBe(original);
  expect(createMap).toHaveBeenCalledOnce();
});
