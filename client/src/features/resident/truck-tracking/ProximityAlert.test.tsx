import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ProximityAlert from './ProximityAlert';
import type { Truck } from './types';

describe('resident approaching banner', () => {
  it.each([
    [0.499, 0, 'on-the-way', true], [0.5, 0, 'on-the-way', true],
    [0.501, 0, 'on-the-way', false], [null, 0, 'on-the-way', false],
    [0.1, 1, 'on-the-way', false], [0.1, 0, 'paused', false], [0.1, 0, 'offline', false],
  ])('checks distance %s, stops away %s, and status %s', (distanceKm, barangaysAway, status, visible) => {
    const truck = { isResidentTruck: true, distanceKm, barangaysAway, status } as Truck;
    expect(renderToStaticMarkup(<ProximityAlert truck={truck} />).includes('Prepare for collection')).toBe(visible);
  });
});
