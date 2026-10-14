import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DriverEditorModal from "./DriverEditorModal";

afterEach(cleanup);
it("rejects contacts outside the Philippine 09 mobile format", async () => {
  const save = vi.fn();
  render(<DriverEditorModal open onOpenChange={vi.fn()} editingDriver={null} trucks={[]} drivers={[]} onSave={save} />);
  fireEvent.change(screen.getByLabelText("Contact Number"), { target: { value: "08123456789" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create Collector Account" })));
  expect(screen.getByText("Enter an 11-digit Philippine mobile number starting with 09.")).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});
it("shows and hides the initial password without changing its value", () => {
  render(<DriverEditorModal open onOpenChange={vi.fn()} editingDriver={null} trucks={[]} drivers={[]} onSave={vi.fn()} />);
  const password = screen.getByLabelText("Initial Password");
  fireEvent.change(password, { target: { value: "TypedPassword!" } });
  expect(password).toHaveAttribute("type", "password");
  fireEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(password).toHaveAttribute("type", "text");
  expect(password).toHaveValue("TypedPassword!");
  fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
  expect(password).toHaveAttribute("type", "password");
});
it("creates a collector using only name, username, contact number, and password", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<DriverEditorModal open onOpenChange={vi.fn()} editingDriver={null} trucks={[]} drivers={[]} onSave={save} />);
  expect(screen.queryByLabelText("Email Address")).toBeNull();
  expect(screen.queryByLabelText("Assigned Truck")).toBeNull();
  fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Test Collector" } });
  fireEvent.change(screen.getByLabelText("Contact Number"), { target: { value: "09123456789" } });
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "collector" } });
  fireEvent.change(screen.getByLabelText("Initial Password"), { target: { value: "TestPassword123!" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create Collector Account" })));
  expect(save).toHaveBeenCalledExactlyOnceWith({ fullName: "Test Collector", username: "collector", contactNumber: "09123456789", password: "TestPassword123!", truckId: null });
});
