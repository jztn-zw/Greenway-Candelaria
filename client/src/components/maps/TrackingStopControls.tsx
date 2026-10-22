import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { RouteStop } from '@/features/collector/route-map/types';

interface Props {
  stops: RouteStop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  fullRoute: boolean;
  onFullRouteChange: (value: boolean) => void;
}
export default function TrackingStopControls({ stops, selectedId, onSelect, fullRoute, onFullRouteChange }: Props) {
  if (!stops.length) return null;
  return <div className="absolute left-3 top-3 z-[500] flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-2">
    <SearchableSelect aria-label="Focus collection street" fieldSize="compact" className="w-48 bg-card"
      value={selectedId ?? ''} onValueChange={onSelect} placeholder="Find a street"
      options={[{ value: 'current-target', label: stops.some(stop => stop.status === 'in-progress') ? 'Current target' : 'Route overview' }, ...stops.filter(stop => stop.hasCoordinates !== false).map(stop => ({ value: stop.id, label: `${stop.stopNumber}. ${stop.barangay}` }))]} />
    <Button type="button" size="sm" variant={fullRoute ? 'default' : 'outline'} aria-pressed={fullRoute}
      onClick={() => onFullRouteChange(!fullRoute)}>Show Full Route</Button>
  </div>;
}
