import type { RouteStop } from '@/features/collector/route-map/types';
type Point = [number, number];
export const trackingStopPoint = (stop: RouteStop): Point => stop.coveragePath?.[0] ?? stop.coords;
export const groupTrackingStops = (stops: RouteStop[], project: (point: Point) => { x: number; y: number }, zoom: number, selectedId: string | null) => {
  const groups: { point: Point; stops: RouteStop[]; x: number; y: number; protected: boolean }[] = [];
  // Keep overlapping marker faces grouped even at street zoom.
  const radius = zoom < 16 ? 54 : 32;
  for (const stop of stops) {
    const point = trackingStopPoint(stop);
    if (stop.hasCoordinates === false || !point?.every(Number.isFinite) || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180) continue;
    const position = project(point);
    const protectedStop = stop.status === 'in-progress' || stop.id === selectedId;
    const group = !protectedStop && groups.find(row => !row.protected && Math.hypot(row.x - position.x, row.y - position.y) < radius);
    if (group) {
      const count = group.stops.length;
      group.point = [(group.point[0] * count + point[0]) / (count + 1), (group.point[1] * count + point[1]) / (count + 1)];
      group.x = (group.x * count + position.x) / (count + 1);
      group.y = (group.y * count + position.y) / (count + 1);
      group.stops.push(stop);
    } else groups.push({ point: [...point], stops: [stop], ...position, protected: protectedStop });
  }
  return groups;
};
