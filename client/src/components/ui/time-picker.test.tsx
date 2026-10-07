import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { TimePicker } from "./time-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

afterEach(cleanup);

function ControlledPicker() {
  const [value, setValue] = useState("09:05");
  return <TimePicker value={value} onChange={setValue} />;
}

it("accepts valid keyboard times and restores incomplete input without committing it", () => {
  render(<ControlledPicker />);
  const input = screen.getByLabelText("Time");
  expect(input).toHaveAttribute("type", "time");
  fireEvent.change(input, { target: { value: "23:59" } });
  fireEvent.blur(input);
  expect(input).toHaveValue("23:59");
  fireEvent.change(input, { target: { value: "asd" } });
  fireEvent.blur(input);
  expect(input).toHaveValue("23:59");
});

it("converts midnight and noon correctly through the themed controls", () => {
  render(<ControlledPicker />);
  fireEvent.click(screen.getByRole("button", { name: "Toggle Time Picker" }));
  const picker = screen.getByRole("dialog", { name: "Choose time" });
  fireEvent.click(within(within(picker).getByRole("group", { name: "Hours" })).getByRole("button", { name: "12" }));
  fireEvent.click(within(within(picker).getByRole("group", { name: "Minutes" })).getByRole("button", { name: "00" }));
  expect(screen.getByLabelText("Time")).toHaveValue("00:00");
  fireEvent.click(within(picker).getByRole("button", { name: /^pm$/i }));
  expect(screen.getByLabelText("Time")).toHaveValue("12:00");
});

it("disables both keyboard entry and the picker trigger", () => {
  render(<TimePicker value="09:05" onChange={vi.fn()} disabled />);
  expect(screen.getByLabelText("Time")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Toggle Time Picker" })).toBeDisabled();
});

it("focuses the selected hour and supports Escape without changing the time", () => {
  render(<ControlledPicker />);
  const trigger = screen.getByRole("button", { name: "Toggle Time Picker" });
  fireEvent.click(trigger);
  const hours = within(screen.getByRole("group", { name: "Hours" }));
  expect(hours.getByRole("button", { name: "09" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Time")).toHaveValue("09:05");
});

it("keeps a containing date popover open while using its time picker", () => {
  render(<Popover>
    <PopoverTrigger>Set schedule</PopoverTrigger>
    <PopoverContent aria-label="Schedule"><ControlledPicker /></PopoverContent>
  </Popover>);
  fireEvent.click(screen.getByRole("button", { name: "Set schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Toggle Time Picker" }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "Choose time" })).getByRole("button", { name: /^pm$/i }));
  expect(screen.getByRole("dialog", { name: "Schedule" })).toBeInTheDocument();
  expect(screen.getByLabelText("Time")).toHaveValue("21:05");
  fireEvent.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.getByRole("dialog", { name: "Schedule" })).toBeInTheDocument();
});
