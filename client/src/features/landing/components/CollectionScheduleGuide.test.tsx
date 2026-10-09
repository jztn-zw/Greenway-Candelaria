import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import CollectionScheduleGuide from "./CollectionScheduleGuide";

afterEach(cleanup);

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
