import { beforeEach, expect, it, vi } from "vitest";
import { getStreetCoverageRoadPath } from "./roadRoutingService";

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/api", () => ({ default: api }));
beforeEach(() => vi.clearAllMocks());
const points: [number, number][] = [[14, 121], [14, 121.001]];

it("accepts road geometry from the coverage matcher", async () => {
  api.post.mockResolvedValue({ data: { data: { source: "osm-coverage", snappedPoints: points, coordinates: points } } });
  expect((await getStreetCoverageRoadPath(points, new AbortController().signal)).snappedPoints).toEqual(points);
});

it.each(["osrm", "haversine"])("does not substitute %s driving or estimated directions for coverage", async (source) => {
  api.post.mockResolvedValue({ data: { data: { source, snappedPoints: points, coordinates: points } } });
  await expect(getStreetCoverageRoadPath(points, new AbortController().signal)).rejects.toThrow("Road matching is unavailable");
});

it("rejects missing snapped pins and invalid road coordinates", async () => {
  for (const result of [
    { source: "osm-coverage", snappedPoints: points.slice(0, 1), coordinates: points },
    { source: "osm-coverage", snappedPoints: points, coordinates: [[91, 121], points[1]] },
  ]) {
    api.post.mockResolvedValue({ data: { data: result } });
    await expect(getStreetCoverageRoadPath(points, new AbortController().signal)).rejects.toThrow("Road matching is unavailable");
  }
});
