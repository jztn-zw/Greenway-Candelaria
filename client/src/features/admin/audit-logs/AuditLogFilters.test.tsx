import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AuditLogFilters from "./AuditLogFilters";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 2, 12));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("applies and clears the selected date preset through the shared chips", () => {
  const changed = vi.fn();
  const Filters = () => {
    const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
    return <AuditLogFilters search="" onSearchChange={vi.fn()} moduleFilter="all" onModuleFilterChange={vi.fn()} dateRange={range} onDateRangeChange={(next) => { changed(next); setRange(next); }} />;
  };
  render(<Filters />);
  const group = screen.getByRole("group", { name: "Audit log date presets" });
  const today = screen.getByRole("button", { name: "Today" });
  expect(today).toHaveAttribute("tabindex", "0");
  expect(group.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);

  fireEvent.click(today);
  expect(changed).toHaveBeenLastCalledWith({ from: new Date(2026, 9, 2), to: new Date(2026, 9, 2) });
  expect(today).toHaveAttribute("aria-pressed", "true");
  fireEvent.keyDown(today, { key: "Home" });
  expect(today).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(today);
  expect(changed).toHaveBeenLastCalledWith({});
  expect(today).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(screen.getByRole("button", { name: "7 days" }));
  expect(changed).toHaveBeenLastCalledWith({ from: new Date(2026, 8, 26), to: new Date(2026, 9, 2) });
  fireEvent.click(screen.getByRole("button", { name: "30 days" }));
  expect(changed).toHaveBeenLastCalledWith({ from: new Date(2026, 8, 3), to: new Date(2026, 9, 2) });
});
