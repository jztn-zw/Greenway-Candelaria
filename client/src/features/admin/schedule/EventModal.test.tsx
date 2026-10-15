import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EventModal } from "./EventModal";

afterEach(cleanup);

it("creates a resident-facing event scoped to the selected barangay", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<EventModal isOpen onClose={vi.fn()} event={null} defaultDate="2099-01-01"
    barangayOptions={[{ id: "barangay-1", name: "Buenavista East" }]} onSubmit={onSubmit} />);

  fireEvent.change(screen.getByPlaceholderText("e.g. Monthly staff review"), { target: { value: "Community clean-up" } });
  fireEvent.click(screen.getByRole("combobox", { name: "Event audience" }));
  fireEvent.click(screen.getByRole("option", { name: "Residents" }));
  fireEvent.click(screen.getByRole("combobox", { name: "Resident area" }));
  fireEvent.click(screen.getByRole("option", { name: "Buenavista East" }));
  fireEvent.click(screen.getByRole("button", { name: "Create Schedule" }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    title: "Community clean-up",
    event_type: "COMMUNITY_EVENT",
    visibility: "PUBLIC",
    barangay_id: "barangay-1",
  })));
});

it("keeps new schedules private to MENRO by default", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<EventModal isOpen onClose={vi.fn()} event={null} defaultDate="2099-01-01" barangayOptions={[]} onSubmit={onSubmit} />);

  fireEvent.change(screen.getByPlaceholderText("e.g. Monthly staff review"), { target: { value: "Staff briefing" } });
  fireEvent.click(screen.getByRole("button", { name: "Create Schedule" }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    title: "Staff briefing",
    event_type: "PRIVATE_EVENT",
    visibility: "PRIVATE",
    barangay_id: null,
  })));
});
