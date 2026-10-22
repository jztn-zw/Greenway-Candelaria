import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TrackingStopControls from './TrackingStopControls';
import type { RouteStop } from '@/features/collector/route-map/types';
afterEach(cleanup);
it('offers only a reversible full-route toggle without changing stop order', () => {
  const stops = [{ id: 'street', stopNumber: 2, barangay: 'Main Street', status: 'not-yet' }] as RouteStop[];
  const toggle = vi.fn();
  const view = render(<TrackingStopControls stops={stops} fullRoute={false} onFullRouteChange={toggle} />);
  expect(screen.queryByRole('combobox')).toBeNull();
  const button = screen.getByRole('button', { name: 'Show Full Route' });
  expect(button).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(button); expect(toggle).toHaveBeenCalledWith(true);
  view.rerender(<TrackingStopControls stops={stops} fullRoute onFullRouteChange={toggle} />);
  fireEvent.click(button); expect(toggle).toHaveBeenLastCalledWith(false);
  expect(stops[0].status).toBe('not-yet');
});
