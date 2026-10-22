import { expect, it } from 'vitest';
import { groupTrackingStops, trackingStopPoint } from './trackingStopGroups';
import type { RouteStop } from '@/features/collector/route-map/types';
const stop = (id: string, lat: number, status: RouteStop['status'] = 'not-yet'): RouteStop => ({
  id, barangay: id, stopNumber: Number(id) || 1, status, coords: [lat, 121], coveragePath: null, distanceKm: 0,
});
const project = ([lat]: [number, number]) => ({ x: lat * 100, y: 0 });
it('groups nearby stops at overview zoom without hiding the current or selected stop', () => {
  const stops = [stop('1', 14), stop('2', 14.1), stop('3', 14.2, 'in-progress'), stop('4', 14.3)];
  const original = JSON.stringify(stops);
  const groups = groupTrackingStops(stops, project, 14, '4');
  expect(groups.map(group => group.stops.map(row => row.id))).toEqual([['1', '2'], ['3'], ['4']]);
  expect(JSON.stringify(stops)).toBe(original);
});
it('reveals separated stops at street zoom but groups overlapping marker faces', () => {
  const groups = groupTrackingStops([stop('1', 14), stop('2', 14.4), stop('3', 14.5)], project, 16, null);
  expect(groups.map(group => group.stops.map(row => row.id))).toEqual([['1'], ['2', '3']]);
});
it('uses the saved coverage start and omits missing or invalid coordinates', () => {
  const covered = { ...stop('1', 14), coveragePath: [[13.93, 121.42], [13.94, 121.42]] as [number, number][] };
  expect(trackingStopPoint(covered)).toEqual([13.93, 121.42]);
  expect(groupTrackingStops([covered, { ...stop('2', 14), hasCoordinates: false }, stop('3', NaN)], project, 14, null)).toHaveLength(1);
});
