import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import AdminTrackingWorkspace from "./AdminTrackingWorkspace";

afterEach(cleanup);

function ReplayControls() {
  const [speed, setSpeed] = useState("1");
  return <select aria-label="Replay speed" value={speed} onChange={event => setSpeed(event.target.value)}>
    <option value="1">1x</option><option value="2">2x</option>
  </select>;
}

function Workspace() {
  const [open, setOpen] = useState(false);
  return <AdminTrackingWorkspace fleetOpen={open} onFleetOpenChange={setOpen} fleetMinimized={false} fleetCount={3}
    map={<div role="application" aria-label="Tracking map" />}>
    <ReplayControls />
  </AdminTrackingWorkspace>;
}

it("opens truck controls over the map and closes them without replacing the map", () => {
  render(<Workspace />);
  const map = screen.getByRole("application", { name: "Tracking map" });
  const trigger = screen.getByRole("button", { name: "Open Truck controls" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("application", { name: "Tracking map" })).toBe(map);
  expect(map.parentElement).not.toHaveClass("admin-tracking-map-hidden");
  fireEvent.click(screen.getByRole("button", { name: "Close truck panel" }));
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("application", { name: "Tracking map" })).toBe(map);
});

it("preserves replay controls while the truck panel is closed", () => {
  render(<Workspace />);
  const trigger = screen.getByRole("button", { name: "Open Truck controls" });
  fireEvent.click(trigger);
  fireEvent.change(screen.getByRole("combobox", { name: "Replay speed" }), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Close truck panel" }));
  fireEvent.click(trigger);
  expect(screen.getByRole("combobox", { name: "Replay speed" })).toHaveValue("2");
});

it("closes with Escape and returns focus to the Trucks button", () => {
  render(<Workspace />);
  const trigger = screen.getByRole("button", { name: "Open Truck controls" });
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Replay speed" }), { key: "Escape" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).toHaveFocus();
});
