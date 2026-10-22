import { Button } from '@/components/ui/button';
import type { RouteStop } from '@/features/collector/route-map/types';

interface Props {
  stops: RouteStop[];
  fullRoute: boolean;
  onFullRouteChange: (value: boolean) => void;
}
export default function TrackingStopControls({ stops, fullRoute, onFullRouteChange }: Props) {
  if (!stops.length) return null;
  return <div className="absolute left-3 top-3 z-[500] flex max-w-[calc(100%-4rem)] flex-wrap items-center gap-2">
    <Button type="button" size="sm" variant={fullRoute ? 'default' : 'outline'} aria-pressed={fullRoute}
      className="shrink-0 whitespace-nowrap" onClick={() => onFullRouteChange(!fullRoute)}>Show Full Route</Button>
  </div>;
}
