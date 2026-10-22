import { beforeEach, expect, it, vi } from "vitest";
import { fetchBarangayStreets, fetchManagedStreets, updateBarangayStreetCoverage } from "./barangaysService";

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/lib/api", () => ({ default: api }));
beforeEach(() => vi.clearAllMocks());

it("requests setup control points explicitly and normalizes only usable saved points", async () => {
  const points = [[14, 121], [14.002, 121.002]];
  api.get.mockResolvedValue({ data: { data: { streets: [{ id: 's', name: 'Main', location_points: points }, { id: 'bad', location_points: [[91, 121]] }] } } });
  const result = await fetchBarangayStreets('b', true);
  expect(api.get).toHaveBeenCalledWith('/barangays/b/streets', { params: { location_points: '1' } });
  expect(result.streets[0].location_points).toEqual(points);
  expect(result.streets[1].location_points).toBeNull();
});

it("reads persisted pins separately from geometry, including JSON strings from the database", async () => {
  const points = [[14, 121], [14.002, 121.002]];
  const path = [points[0], [14.001, 121.001], points[1]];
  api.get.mockResolvedValue({ data: { data: { collection_service_available: true, streets: [
    { id: "s", name: "Test", coverage_path: JSON.stringify(path), coverage_edit: JSON.stringify({ mode: "ROAD", points }) },
    { id: "legacy", name: "Legacy", coverage_path: path },
    { id: "invalid", name: "Invalid", coverage_path: path, coverage_edit: "invalid" },
  ] } } });
  const { streets } = await fetchManagedStreets("b");
  expect(streets[0].coverage_path).toEqual(path);
  expect(streets[0].coverage_edit).toEqual({ mode: "ROAD", points });
  expect(streets[1].coverage_edit).toBeNull();
  expect(streets[2].coverage_edit).toBeNull();
});

it("sends pins and geometry together and clears both together", async () => {
  const points: [number, number][] = [[14, 121], [14.002, 121.002]];
  const edit = { mode: "ROAD" as const, points };
  await updateBarangayStreetCoverage("b", "s", points, edit);
  expect(api.put).toHaveBeenLastCalledWith("/barangays/b/streets/s/coverage", { coverage_path: points, coverage_edit: edit });
  await updateBarangayStreetCoverage("b", "s", null);
  expect(api.put).toHaveBeenLastCalledWith("/barangays/b/streets/s/coverage", { coverage_path: null, coverage_edit: null });
});
