import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DriverEditorModal from "./DriverEditorModal";
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);
it("allows editing a collector username and preserves the draft after a duplicate error", async () => {
  const save = vi.fn().mockRejectedValue(new Error("Username already taken"));
  const driver = { id: "driver-1", userId: "user-1", fullName: "Test Collector", username: "collector", email: "", avatarUrl: null, contactNumber: "09123456789", truckId: null, status: "Active" as const, lastLogin: "", dateAdded: "", activityLog: [] };
  render(<DriverEditorModal open onOpenChange={vi.fn()} editingDriver={driver} trucks={[]} drivers={[driver]} onSave={save} />);
  expect(screen.getByLabelText("Username")).toHaveValue("collector");
  expect(screen.queryByLabelText("Initial Password")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "collector.new" } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save Changes" })));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ username: "collector.new" }));
  expect(screen.getByLabelText("Username")).toHaveValue("collector.new");
  expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("Username already taken. Choose another username.")).toBeInTheDocument();
  expect(toast.error).toHaveBeenCalledWith("Could not save collector", { description: "Username already taken" });
});
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
