import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FilterPillTabs, type FilterPillItem } from "./FilterPillTabs";

type Filter = "all" | "completed" | "partial";
const items: FilterPillItem<Filter>[] = [
  { id: "all", label: "All routes" },
  { id: "completed", label: "Completed" },
  { id: "partial", label: "Partial" },
];

afterEach(cleanup);

it("selects filters with the keyboard, moves focus, and wraps at either end", () => {
  const changed = vi.fn();
  const Filters = () => {
    const [active, setActive] = useState<Filter>("all");
    return <FilterPillTabs items={items} activeId={active} ariaLabel="Route status" onChange={(id) => { changed(id); setActive(id); }} />;
  };
  render(<Filters />);
  const all = screen.getByRole("button", { name: "All routes" });
  const completed = screen.getByRole("button", { name: "Completed" });
  const partial = screen.getByRole("button", { name: "Partial" });
  all.focus();
  fireEvent.keyDown(all, { key: "Home" });
  expect(changed).not.toHaveBeenCalled();
  fireEvent.keyDown(all, { key: "ArrowRight" });
  expect(completed).toHaveFocus();
  expect(completed).toHaveAttribute("aria-pressed", "true");
  expect(all).toHaveAttribute("aria-pressed", "false");
  fireEvent.keyDown(completed, { key: "End" });
  expect(partial).toHaveFocus();
  fireEvent.keyDown(partial, { key: "ArrowRight" });
  expect(all).toHaveFocus();
  fireEvent.keyDown(all, { key: "ArrowLeft" });
  expect(partial).toHaveFocus();
  fireEvent.keyDown(partial, { key: "Home" });
  expect(all).toHaveFocus();
  expect(changed).toHaveBeenLastCalledWith("all");
});

it("scrolls a dragged chip row without activating the chip on release", () => {
  const changed = vi.fn();
  render(<FilterPillTabs items={items} activeId="all" onChange={changed} ariaLabel="Route status" />);
  const group = screen.getByRole("group", { name: "Route status" });
  const completed = screen.getByRole("button", { name: "Completed" });
  Object.defineProperties(group, { scrollWidth: { value: 500 }, clientWidth: { value: 120 } });
  group.scrollLeft = 30;
  fireEvent.mouseDown(completed, { button: 0, clientX: 80 });
  fireEvent.mouseMove(group, { clientX: 20 });
  fireEvent.mouseUp(completed);
  fireEvent.click(completed, { detail: 1 });
  expect(group.scrollLeft).toBeGreaterThan(30);
  expect(changed).not.toHaveBeenCalled();

  fireEvent.mouseDown(completed, { button: 0, clientX: 20 });
  fireEvent.mouseUp(completed);
  fireEvent.click(completed, { detail: 1 });
  expect(changed).toHaveBeenCalledExactlyOnceWith("completed");
});

it("keeps keyboard activation available after dragging and with no selected preset", () => {
  const changed = vi.fn();
  render(<FilterPillTabs items={items} onChange={changed} ariaLabel="Date presets" />);
  const group = screen.getByRole("group", { name: "Date presets" });
  const all = screen.getByRole("button", { name: "All routes" });
  const completed = screen.getByRole("button", { name: "Completed" });
  expect(all).toHaveAttribute("tabindex", "0");
  expect(group.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  Object.defineProperties(group, { scrollWidth: { value: 500 }, clientWidth: { value: 120 } });
  fireEvent.mouseDown(all, { button: 0, clientX: 80 });
  fireEvent.mouseMove(group, { clientX: 20 });
  fireEvent.mouseLeave(group);
  fireEvent.click(completed, { detail: 0 });
  expect(changed).toHaveBeenCalledExactlyOnceWith("completed");
});

it("scrolls only its own row and respects reduced motion when revealing a selected chip", () => {
  const media = vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
  try {
    render(<FilterPillTabs items={items} activeId="all" onChange={vi.fn()} />);
    const group = screen.getByRole("group");
    const partial = screen.getByRole("button", { name: "Partial" });
    const scroll = vi.fn();
    Object.defineProperties(group, { scrollWidth: { value: 500 }, clientWidth: { value: 120 }, scrollTo: { value: scroll } });
    Object.defineProperties(partial, { offsetLeft: { value: 280 }, offsetWidth: { value: 80 } });
    fireEvent.click(partial);
    expect(scroll).toHaveBeenCalledWith({ left: 260, behavior: "auto" });
  } finally {
    media.mockRestore();
  }
});
