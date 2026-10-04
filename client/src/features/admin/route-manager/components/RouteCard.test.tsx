import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { RouteCard } from "./RouteCard";
import type { RouteData } from "../hooks/useRoutes";

it("opens the focused route with the keyboard without treating action-menu keys as route navigation", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const route: RouteData = {
    id: "route", day: "Monday", truckId: "truck", truckName: "Truck 1", truckPlate: "ABC-123",
    driverId: null, driverName: "Unassigned", startTime: "06:00", stops: [], barangays: [],
    active: true, status: "ACTIVE",
  };
  const onView = vi.fn();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<RouteCard route={route} onView={onView} onEdit={vi.fn()} onDuplicate={vi.fn()} onToggleActive={vi.fn()} onDelete={vi.fn()} />));
    const card = host.querySelector<HTMLElement>('[role="button"]')!;
    await act(async () => card.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(onView).toHaveBeenCalledWith(route);
    onView.mockClear();
    const menu = host.querySelector<HTMLButtonElement>('[aria-label="Route actions"]')!;
    await act(async () => menu.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })));
    expect(onView).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
