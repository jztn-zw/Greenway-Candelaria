import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AdminTruckCard from "./AdminTruckCard";
import type { AdminTruck } from "../types";

vi.mock("@/utils/date", async original => ({ ...await original<typeof import("@/utils/date")>(),
  getManilaNow: () => ({ dateKey: "2026-10-21" }),
}));
afterEach(cleanup);
const truck: AdminTruck = { id: "truck", driverId: null, routeId: null, routeChoices: [], driverUserId: null,
  name: "Truck", plateNumber: "ABC", status: "offline", wasteType: "Not assigned", driver: "Collector",
  currentBarangay: "", completedBarangays: 0, totalBarangays: 0, coords: null, lastGpsUpdate: "-", lastPingIso: null,
  driverMessages: [], barangaysAway: null, route: [],
};
const summary = { date: "2026-10-21", distance_km: 12.34567, sample_count: 100, segment_count: 97, gap_count: 1, rejected_points: 1 };
const show = (value: AdminTruck) => render(<AdminTruckCard truck={value} isSelected={false} onClick={() => {}} onRouteChange={() => {}} />);

it("shows recorded daily travel even for an offline, collapsed truck", () => {
  show({ ...truck, distanceToday: summary });
  expect(screen.getByText("12.35 km")).toBeInTheDocument();
  expect(screen.getByText(/GPS estimate.*Gaps or unreliable fixes excluded/)).toBeInTheDocument();
});
it("does not present missing GPS as zero kilometers", () => {
  show(truck);
  expect(screen.getByText("Not enough GPS data")).toBeInTheDocument();
  expect(screen.queryByText("0.00 km")).not.toBeInTheDocument();
});
it("shows genuine recorded stationary travel as zero", () => {
  show({ ...truck, distanceToday: { ...summary, distance_km: 0, gap_count: 0, rejected_points: 0 } });
  expect(screen.getByText("0.00 km")).toBeInTheDocument();
});
it("does not show yesterday's cached kilometers as today's", () => {
  show({ ...truck, distanceToday: { ...summary, date: "2026-10-20" } });
  expect(screen.getByText("Not enough GPS data")).toBeInTheDocument();
  expect(screen.queryByText("12.35 km")).not.toBeInTheDocument();
});
