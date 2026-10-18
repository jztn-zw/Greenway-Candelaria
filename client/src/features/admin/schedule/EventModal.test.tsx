import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EventModal } from "./EventModal";

const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }));
beforeEach(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
afterEach(() => {
  cleanup(); vi.unstubAllGlobals();
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

it("creates a resident-facing event scoped to the selected barangay", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<EventModal isOpen onClose={vi.fn()} event={null} defaultDate="2099-01-01"
    barangayOptions={[
      { id: "barangay-1", name: "Buenavista East" },
      ...Array.from({ length: 9 }, (_, index) => ({ id: `other-${index}`, name: `Other Barangay ${index + 1}` })),
    ]} onSubmit={onSubmit} />);

  fireEvent.change(screen.getByPlaceholderText("e.g. Monthly staff review"), { target: { value: "Community clean-up" } });
  fireEvent.click(screen.getByRole("combobox", { name: "Event audience" }));
  fireEvent.click(screen.getByRole("option", { name: "MENRO & Residents" }));
  fireEvent.click(screen.getByRole("combobox", { name: "Resident area" }));
  fireEvent.change(screen.getByPlaceholderText("Search by barangay name…"), { target: { value: "Buenavista" } });
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
