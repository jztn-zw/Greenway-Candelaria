import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import TrackingStopControls from './TrackingStopControls';
import type { RouteStop } from '@/features/collector/route-map/types';
vi.mock('@/components/ui/searchable-select', () => ({ SearchableSelect: ({ onValueChange, options }: { onValueChange: (value: string) => void; options: { value: string; label: string }[] }) =>
  <select aria-label="Focus collection street" onChange={event => onValueChange(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> }));
afterEach(cleanup);
it('offers street focus and a reversible full-route display without changing stop order', () => {
  const stops = [{ id: 'street', stopNumber: 2, barangay: 'Main Street', status: 'not-yet' }] as RouteStop[];
  const select = vi.fn(), toggle = vi.fn();
  const view = render(<TrackingStopControls stops={stops} selectedId={null} onSelect={select} fullRoute={false} onFullRouteChange={toggle} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'street' } });
  expect(select).toHaveBeenCalledWith('street');
  const button = screen.getByRole('button', { name: 'Show Full Route' });
  expect(button).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(button); expect(toggle).toHaveBeenCalledWith(true);
  view.rerender(<TrackingStopControls stops={stops} selectedId="street" onSelect={select} fullRoute onFullRouteChange={toggle} />);
  fireEvent.click(button); expect(toggle).toHaveBeenLastCalledWith(false);
  expect(stops[0].status).toBe('not-yet');
});
