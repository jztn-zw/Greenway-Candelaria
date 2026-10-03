import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResidentSettings from "./ResidentSettings";

const mocks = vi.hoisted(() => ({
  save: vi.fn(), refetch: vi.fn(), setTheme: vi.fn(), loading: false,
  settings: {
    reminder_on: true, notif_collection_reminders: true, notif_truck_near: true,
    notif_collection_done: true, notif_collection_skipped: true, notif_report_updates: true,
    notif_new_content: true, notif_announcements: true,
  },
}));

vi.mock("@/lib/residentQuery", () => ({
  useResidentQuery: () => ({ data: mocks.settings, dataUpdatedAt: 1, isLoading: mocks.loading, isError: false, refetch: mocks.refetch }),
  useResidentMutation: () => mocks.save,
}));
vi.mock("@/hooks/useThemeMode", () => ({ useThemeMode: () => "light" }));
vi.mock("@/lib/theme", () => ({ setThemeMode: mocks.setTheme }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loading = false;
  mocks.save.mockResolvedValue(undefined);
});
afterEach(cleanup);

it.each([
  { name: "Collection Day Reminder", payload: { reminder_on: false } },
  { name: "Live Truck Alerts", payload: { notif_collection_reminders: false, notif_truck_near: false, notif_collection_done: false, notif_collection_skipped: false } },
  { name: "Report Updates", payload: { notif_report_updates: false } },
  { name: "News & Announcements", payload: { notif_new_content: false, notif_announcements: false } },
])("keeps the named $name switch connected to its saved preferences", async ({ name, payload }) => {
  render(<ResidentSettings />);
  const toggle = screen.getByRole("switch", { name });
  expect(toggle).toHaveAttribute("aria-checked", "true");
  await act(async () => fireEvent.click(toggle));
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith(payload);
  expect(toggle).toHaveAttribute("aria-checked", "false");
});

it("keeps both theme choices accessible when their visible labels are compact", () => {
  render(<ResidentSettings />);
  expect(screen.getByRole("button", { name: "Use light mode" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Use dark mode" }));
  expect(mocks.setTheme).toHaveBeenCalledExactlyOnceWith("dark");
});

it("opens and closes the contact information dialog", () => {
  render(<ResidentSettings />);
  fireEvent.click(screen.getByRole("button", { name: /Contact MENRO Candelaria/ }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Office contact information.");
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("shows an inert skeleton while settings load", () => {
  mocks.loading = true;
  render(<ResidentSettings />);
  expect(screen.getByRole("status", { name: "Loading resident settings" })).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByRole("switch")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});
