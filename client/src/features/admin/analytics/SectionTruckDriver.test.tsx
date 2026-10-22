import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AnalyticsDataProvider } from "./AnalyticsDataContext";
import type { AnalyticsDashboardData } from "./analytics.types";
import SectionTruckDriver from "./SectionTruckDriver";

afterEach(cleanup);
const run = { id: "run-1", date: "2026-10-21", route: "Saved collection route", driver: "Collector", truck: "Original truck", plate: "SAVED-01", status: "COMPLETED" as const, distanceKm: 12.34567, gapCount: 1, rejectedPoints: 0 };
const show = (runs: AnalyticsDashboardData["collectionRunDistances"]) => render(
  <AnalyticsDataProvider value={{ driverOperations: [], fleetStatus: [], collectionRunDistances: runs } as unknown as AnalyticsDashboardData}>
    <SectionTruckDriver />
  </AnalyticsDataProvider>,
);

it("shows the route, historical truck, collection date and GPS kilometres for each run", () => {
  show([run]);
  const table = within(screen.getByRole("region", { name: "Collection run distances" }));
  for (const label of ["Saved collection route", "Original truck", "SAVED-01", "Collector", "Oct 21, 2026", "12.35 km", "Completed", "Gaps or unreliable fixes excluded"]) {
    expect(table.getByText(label)).toBeInTheDocument();
  }
  expect(screen.getByText(/full run, including other barangays/)).toBeInTheDocument();
});

it("distinguishes an unrecorded distance from a genuine stationary zero", () => {
  show([{ ...run, id: "missing", distanceKm: null }, { ...run, id: "zero", distanceKm: 0, gapCount: 0 }]);
  expect(screen.getByText("Unavailable")).toBeInTheDocument();
  expect(screen.getByText("Insufficient GPS history")).toBeInTheDocument();
  expect(screen.getByText("0.00 km")).toBeInTheDocument();
  expect(screen.getByText("Recorded GPS estimate")).toBeInTheDocument();
});

it("states when no finished runs match the selected filters", () => {
  show([]);
  expect(screen.getByText("No finished collection runs match this period and barangay.")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Collection run distances" })).not.toBeInTheDocument();
});
