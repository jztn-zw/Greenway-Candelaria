import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { within } from "@testing-library/react";
import AdminTrackingMap from "./AdminTrackingMap";
import type { AdminTruck } from "../types";

vi.mock("@/hooks/useSystemTime", () => ({ useSystemTime: () => Date.parse("2026-10-21T01:00:00Z") }));
vi.mock("@/lib/adminQuery", () => ({ useAdminFetch: () => vi.fn() }));

it.each(["offline", "scheduled", "paused", "on-the-way"] as const)("keeps the stop legend for a %s truck without street paths", status => {
  const truck = { id: "truck", status, name: "Truck", lastPingIso: null,
    route: [{ name: "Main Street", state: "done", coords: [14, 121] }],
  } as AdminTruck;
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<AdminTrackingMap trucks={[truck]} focusedTruckId="truck" onMarkerClick={() => {}} />);
  const legend = within(host).getByRole("group", { name: "Stop map legend" });
  for (const label of ["Current", "Completed", "Upcoming", "Skipped"]) expect(within(legend).getByText(label)).toBeTruthy();
});
