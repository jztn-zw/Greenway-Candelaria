import { beforeEach, expect, it, vi } from 'vitest';
import type L from 'leaflet';
import type { RouteStop } from '@/features/collector/route-map/types';
import { focusTrackingStop, renderTrackingStops } from './renderTrackingStops';
const fake = vi.hoisted(() => ({ lines: vi.fn(), markers: [] as Array<{ options: Record<string, unknown>; popup?: HTMLElement; events: Record<string, () => void>; opened: boolean }> }));
vi.mock('leaflet', () => ({ default: {
  polyline: (...args: unknown[]) => { fake.lines(...args); return { addTo: vi.fn() }; },
  latLngBounds: (points: unknown) => points,
  divIcon: (options: unknown) => options,
  marker: (_point: unknown, options: Record<string, unknown>) => {
    const state = { options, events: {} as Record<string, () => void>, opened: false, popup: undefined as HTMLElement | undefined };
    fake.markers.push(state);
    const marker = { addTo: vi.fn().mockReturnThis(), bindPopup: (popup: HTMLElement) => { state.popup = popup; return marker; },
      on: (name: string, action: () => void) => { state.events[name] = action; return marker; },
      isPopupOpen: () => state.opened, openPopup: () => { state.opened = true; return marker; },
    };
    Object.assign(state, { isPopupOpen: marker.isPopupOpen });
    return marker;
  },
} }));
const stops: RouteStop[] = [
  { id: 'a', stopNumber: 1, barangay: 'Current Street', status: 'in-progress', coords: [14, 121], coveragePath: [[14, 121], [14.001, 121]], distanceKm: 0 },
  { id: 'b', stopNumber: 2, barangay: 'Next <script>Street</script>', status: 'not-yet', coords: [14.01, 121], coveragePath: [[14.01, 121], [14.011, 121]], distanceKm: 1 },
  { id: 'c', stopNumber: 3, barangay: 'Done Street', status: 'done', coords: [14.02, 121], coveragePath: [[14.02, 121], [14.021, 121]], distanceKm: 0, completedAt: '10:00 AM' },
];
beforeEach(() => { vi.clearAllMocks(); fake.markers.length = 0; });
const fixture = () => {
  const map = { getZoom: () => 16, getMaxZoom: () => 19, project: ([lat, lng]: [number, number]) => ({ x: lat * 100000, y: lng * 100000 }), fitBounds: vi.fn(), setView: vi.fn() } as unknown as L.Map;
  const layer = { getLayers: () => fake.markers, clearLayers: () => { fake.markers.length = 0; } } as unknown as L.LayerGroup;
  return { map, layer, stops, selectedId: null as string | null, showFullRoute: false, liveCoverage: true, onSelect: vi.fn() };
};
it('shows only the current target until the toggle enables every pin and coverage path', () => {
  const f = fixture(), original = JSON.stringify(stops);
  renderTrackingStops(f); expect(fake.lines).toHaveBeenCalledTimes(2);
  expect(fake.markers).toHaveLength(1);
  expect(fake.markers[0].options.title).toContain('Current Street');
  fake.lines.mockClear(); renderTrackingStops({ ...f, selectedId: 'b' });
  expect(fake.lines).toHaveBeenCalledTimes(2);
  expect(fake.markers).toHaveLength(1);
  fake.lines.mockClear(); renderTrackingStops({ ...f, selectedId: 'c', showFullRoute: true });
  expect(fake.lines).toHaveBeenCalledTimes(6);
  expect(fake.markers).toHaveLength(3);
  expect(fake.markers[2].opened).toBe(true);
  expect(fake.markers.every(marker => marker.options.bubblingMouseEvents === false)).toBe(true);
  expect(JSON.stringify(stops)).toBe(original);
});
it('keeps inactive coverage hidden until full-route display and preserves safe details and completed outcomes', () => {
  const f = fixture(); renderTrackingStops({ ...f, liveCoverage: false });
  expect(fake.lines).not.toHaveBeenCalled();
  renderTrackingStops({ ...f, liveCoverage: false, showFullRoute: true });
  expect(fake.markers.find(marker => marker.options.title === '3. Done Street — Completed')?.options.opacity).toBe(1);
  const next = fake.markers[1];
  expect(next.popup?.querySelector('script')).toBeNull();
  expect(next.popup?.textContent).toContain('<script>Street</script>');
  next.events.click(); expect(f.onSelect).toHaveBeenCalledWith('b');
  expect(stops[1].status).toBe('not-yet');
});
it('keeps a completed route readable and lets overlapping stops expand at street zoom', () => {
  const f = fixture();
  f.map.getZoom = () => 17;
  const completed = [stops[2], { ...stops[2], id: 'd', stopNumber: 4 }];
  const original = JSON.stringify(completed);
  renderTrackingStops({ ...f, stops: completed });
  expect(fake.markers).toHaveLength(0);
  renderTrackingStops({ ...f, stops: completed, showFullRoute: true });
  expect(fake.markers).toHaveLength(1);
  expect(fake.markers[0].options.opacity).toBe(1);
  const html = (fake.markers[0].options.icon as { html: string }).html;
  expect(html).toContain('var(--success-700)');
  expect(html).toContain('<svg');
  expect(html).toContain('var(--map-pin-scale,1)');
  fake.markers[0].events.click();
  expect(f.map.fitBounds).toHaveBeenCalledWith(expect.anything(), { padding: [36, 36], maxZoom: 19 });
  expect(JSON.stringify(completed)).toBe(original);
});
it('lets a cluster zoom in and select one of its member streets', () => {
  const f = fixture();
  f.map.getZoom = () => 14;
  const close = [stops[1], { ...stops[2], coords: stops[1].coords, coveragePath: stops[1].coveragePath }];
  renderTrackingStops({ ...f, stops: close, showFullRoute: true });
  expect(fake.markers).toHaveLength(1);
  fake.markers[0].events.click(); expect(f.map.fitBounds).toHaveBeenCalled();
  fake.markers[0].popup!.querySelector<HTMLButtonElement>('button')!.click();
  expect(f.onSelect).toHaveBeenCalledWith('b');
});
it('focuses a selected street without changing the route or starting collection', () => {
  const f = fixture(); focusTrackingStop(f.map, stops[1]);
  expect(f.map.fitBounds).toHaveBeenCalledWith(stops[1].coveragePath, { padding: [44, 44], maxZoom: 17 });
  expect(stops[1].status).toBe('not-yet');
});
it('keeps selected details open across redraws, but respects a manual close', () => {
  const f = { ...fixture(), selectedId: 'b', showFullRoute: true };
  renderTrackingStops(f);
  expect(fake.markers[1].opened).toBe(true);
  renderTrackingStops(f);
  expect(fake.markers[1].opened).toBe(true);
  fake.markers[1].opened = false;
  renderTrackingStops(f);
  expect(fake.markers[1].opened).toBe(false);
});
it('opens completed-stop details without changing the marker size or anchor', () => {
  const f = { ...fixture(), showFullRoute: true };
  renderTrackingStops(f);
  const before = fake.markers[2].options.icon as { iconSize: number[]; iconAnchor: number[] };
  renderTrackingStops({ ...f, selectedId: 'c' });
  const completed = fake.markers[2];
  const after = completed.options.icon as { iconSize: number[]; iconAnchor: number[]; html: string };
  expect(after.iconSize).toEqual(before.iconSize);
  expect(after.iconAnchor).toEqual(before.iconAnchor);
  expect(after.html).toContain('var(--success-700)');
  expect(completed.opened).toBe(true);
  expect(stops[2].status).toBe('done');
});
