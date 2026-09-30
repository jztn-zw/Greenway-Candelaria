import { expect, it } from "vitest";
import { fitReplayVideoMap } from "./replayVideoMap";

it("fits a municipality-wide trip and target locations inside a bounded tile viewport", () => {
  const points: [number, number][] = [[13.91, 121.36], [14.08, 121.53], [13.93, 121.56]];
  const map = fitReplayVideoMap(points, 1280, 568);
  expect(map.zoom).toBeLessThan(14);
  expect(map.tiles.length).toBeGreaterThan(0);
  expect(map.tiles.length).toBeLessThanOrEqual(24);
  for (const point of points) {
    const [x, y] = map.project(point);
    expect(x).toBeGreaterThanOrEqual(70); expect(x).toBeLessThanOrEqual(1210);
    expect(y).toBeGreaterThanOrEqual(80); expect(y).toBeLessThanOrEqual(488);
  }
  expect(Math.min(...map.tiles.map((tile) => tile.x))).toBeLessThanOrEqual(0);
  expect(Math.max(...map.tiles.map((tile) => tile.x + 256))).toBeGreaterThanOrEqual(1280);
  expect(Math.min(...map.tiles.map((tile) => tile.y))).toBeLessThanOrEqual(0);
  expect(Math.max(...map.tiles.map((tile) => tile.y + 256))).toBeGreaterThanOrEqual(568);
});

it("keeps stationary and long GPS histories at a valid map scale", () => {
  const point: [number, number] = [13.931, 121.424];
  const map = fitReplayVideoMap(Array.from({ length: 150000 }, () => point), 1280, 568);
  expect(map.zoom).toBe(17);
  expect(map.project(point)).toEqual([640, 284]);
});
