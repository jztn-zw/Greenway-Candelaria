import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { syncServerClock } from "@/lib/serverClock";
import CollectionScheduleGuide from "./CollectionScheduleGuide";

const syncTime = (time: string) => syncServerClock(time, performance.now());
beforeEach(() => syncTime("2026-10-05T00:00:00Z"));
afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each([
  ["2026-10-05T00:00:00Z", "Monday"],
  ["2026-10-06T00:00:00Z", "Tuesday"],
  ["2026-10-07T00:00:00Z", "Wednesday"],
  ["2026-10-08T00:00:00Z", "Thursday"],
  ["2026-10-09T00:00:00Z", "Friday"],
  ["2026-10-10T00:00:00Z", "Saturday"],
  ["2026-10-10T16:00:00Z", "Sunday"],
])("selects today's Philippine weekday at %s", (time, day) => {
  syncTime(time);
  render(<CollectionScheduleGuide />);
  expect(screen.getByRole("button", { name: day })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("region", { name: `${day} preparation advice` })).toBeInTheDocument();
});

it("keeps a manual choice during the day and selects today after Philippine midnight", () => {
  const elapsed = performance.now();
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  vi.advanceTimersByTime(elapsed);
  syncTime("2026-10-11T15:59:00Z");
  render(<CollectionScheduleGuide />);
  expect(screen.getByRole("button", { name: "Sunday" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Thursday" }));
  act(() => { vi.advanceTimersByTime(30_000); });
  expect(screen.getByRole("button", { name: "Thursday" })).toHaveAttribute("aria-pressed", "true");
  act(() => { vi.advanceTimersByTime(30_000); });
  expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("region", { name: "Monday preparation advice" })).toBeInTheDocument();
});

it("reconciles today's selection when returning to a tab after the date changes", () => {
  render(<CollectionScheduleGuide />);
  fireEvent.click(screen.getByRole("button", { name: "Thursday" }));
  act(() => {
    syncTime("2026-10-05T16:00:00Z");
    window.dispatchEvent(new Event("focus"));
  });
  expect(screen.getByRole("button", { name: "Tuesday" })).toHaveAttribute("aria-pressed", "true");
});

it("shows Route Manager's fixed waste type for every weekday without category buttons", () => {
  render(<CollectionScheduleGuide />);
  const assignments = [
    ["Monday", "Biodegradable"],
    ["Tuesday", "Non-Biodegradable"],
    ["Wednesday", "Biodegradable"],
    ["Thursday", "Non-Biodegradable"],
    ["Friday", "Biodegradable"],
    ["Saturday", "Non-Biodegradable"],
    ["Sunday", "Biodegradable"],
  ];
  for (const [day, wasteType] of assignments) {
    fireEvent.click(screen.getByRole("button", { name: day }));
    expect(screen.getByRole("button", { name: day })).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByRole("region", { name: `${day} preparation advice` })).getByText(wasteType)).toBeInTheDocument();
  }
  expect(screen.queryByRole("button", { name: "Biodegradable" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Non-Biodegradable" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Preparation guide only/)).not.toBeInTheDocument();
});

it("updates waste examples, avoid items, and tips when switching days", () => {
  render(<CollectionScheduleGuide />);
  expect(screen.getByText("Cooked rice and food leftovers")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Tuesday" }));
  const details = within(screen.getByRole("region", { name: "Tuesday preparation advice" }));
  expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "false");
  expect(details.getByText("Cardboard packaging")).toBeInTheDocument();
  expect(details.getByText("Food-soaked paper")).toBeInTheDocument();
  expect(details.getByText(/Flatten clean cardboard/)).toBeInTheDocument();
  expect(details.queryByText("Cooked rice and food leftovers")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Wednesday" }));
  expect(screen.getByText("Dry garden leaves")).toBeInTheDocument();
  expect(screen.getByText("Plastic plant pots")).toBeInTheDocument();
  expect(screen.queryByText("Cardboard packaging")).not.toBeInTheDocument();
});
