export const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsedValue = Number(value.trim());
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }
  return null;
};

export const distanceToStopKm = (
  point: [number, number], stop: { coords: [number, number]; coveragePath?: [number, number][] | null },
) => {
  const path = stop.coveragePath?.length ? stop.coveragePath : [stop.coords];
  const xScale = 111.32 * Math.cos(point[0] * Math.PI / 180);
  const project = (p: [number, number]) => [(p[1] - point[1]) * xScale, (p[0] - point[0]) * 110.574];
  if (path.length === 1) return Math.hypot(...project(path[0]));
  let nearest = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = project(path[i - 1]), [bx, by] = project(path[i]);
    const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length)) : 0;
    nearest = Math.min(nearest, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return nearest;
};
