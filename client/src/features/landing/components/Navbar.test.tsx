import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it } from "vitest";
import Navbar from "./Navbar";

afterEach(cleanup);

it("closes the small-screen navigation with Escape and returns focus to its toggle", () => {
  render(<MemoryRouter><Navbar /></MemoryRouter>);
  const toggle = screen.getByRole("button", { name: "Open navigation" });
  const menu = document.getElementById("landing-mobile-navigation")!;
  expect(menu).toHaveAttribute("hidden");
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  const weeklyGuide = within(menu).getByRole("link", { name: "Weekly Guide" });
  weeklyGuide.focus();
  fireEvent.keyDown(weeklyGuide, { key: "Escape" });
  expect(menu).toHaveAttribute("hidden");
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(toggle).toHaveFocus();
});

it("keeps the weekly guide destination and closes navigation after selection", () => {
  render(<MemoryRouter><Navbar /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  const menu = document.getElementById("landing-mobile-navigation")!;
  const weeklyGuide = within(menu).getByRole("link", { name: "Weekly Guide" });
  expect(weeklyGuide).toHaveAttribute("href", "#collection-schedule");
  fireEvent.click(weeklyGuide);
  expect(menu).toHaveAttribute("hidden");
});
