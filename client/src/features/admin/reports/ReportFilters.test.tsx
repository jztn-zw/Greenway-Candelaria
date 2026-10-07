import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ReportFilters from "./ReportFilters";

vi.mock("@/lib/adminQuery", () => ({ useAdminQuery: () => ({ data: [{ id: "area-1", name: "Poblacion" }] }) }));
const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

it("keeps report dropdowns and calendar usable and applies selections only on Apply", () => {
  const changed = vi.fn();
  const barangayChanged = vi.fn();
  const dateChanged = vi.fn();
  function Filters() {
    const [violation, setViolation] = useState("all");
    const [barangay, setBarangay] = useState("all");
    const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
    return <ReportFilters search="" onSearchChange={vi.fn()} statusFilter="all" onStatusFilterChange={vi.fn()}
      violationFilter={violation} onViolationFilterChange={value => { setViolation(value); changed(value); }}
      barangayFilter={barangay} onBarangayFilterChange={value => { setBarangay(value); barangayChanged(value); }} sortBy="date-desc" onSortByChange={vi.fn()}
      dateRange={range} onDateRangeChange={value => { setRange(value); dateChanged(value); }} />;
  }
  render(<Filters />);
  fireEvent.click(screen.getByRole("button", { name: "Open filter reports" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.keyDown(within(dialog).getByRole("combobox", { name: "Violation" }), { key: "ArrowDown" });
  fireEvent.click(screen.getByRole("option", { name: "Open Burning" }));
  expect(changed).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("combobox", { name: "Barangay" }));
  fireEvent.click(screen.getByRole("option", { name: "Poblacion" }));
  expect(within(dialog).getByRole("combobox", { name: "Barangay" })).toHaveTextContent("Poblacion");
  expect(barangayChanged).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: /^Pick a date range$/i }));
  expect(screen.getByRole("button", { name: "Go to previous month" })).toBeInTheDocument();
  const selectedDate = new Date();
  selectedDate.setDate(10);
  selectedDate.setHours(0, 0, 0, 0);
  fireEvent.click(screen.getByRole("gridcell", { name: "10" }));
  expect(dateChanged).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole("button", { name: "Go to previous month" }), { key: "Escape" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply Filters" }));
  expect(changed).toHaveBeenCalledExactlyOnceWith("Open Burning");
  expect(barangayChanged).toHaveBeenCalledExactlyOnceWith("Poblacion");
  expect(dateChanged).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ from: selectedDate }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
