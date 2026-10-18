import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResidentSettings from "./ResidentSettings";
import useAuthStore from "@/store/authStore";
import { saveBrowserNotificationSettings, readBrowserNotificationSettings } from "@/services/residentBrowserNotifications";

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
  localStorage.clear();
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("Notification", { permission: "granted", requestPermission: vi.fn().mockResolvedValue("granted") });
  useAuthStore.setState({ user: { id: "resident", role: "RESIDENT" } as never, token: "fixture" });
  saveBrowserNotificationSettings("resident", { enabled: true });
  mocks.loading = false;
  mocks.save.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each([
  { name: "Collection Day Reminder", field: "reminders" },
  { name: "Live Truck Alerts", field: "collection" },
  { name: "Report Updates", field: "reports" },
  { name: "News & Announcements", field: "community" },
])("saves $name only in this browser without writing phone preferences", async ({ name, field }) => {
  render(<ResidentSettings />);
  const toggle = screen.getByRole("switch", { name });
  expect(toggle).toHaveAttribute("aria-checked", "true");
  await act(async () => fireEvent.click(toggle));
  expect(mocks.save).not.toHaveBeenCalled();
  expect(readBrowserNotificationSettings("resident")[field]).toBe(false);
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

it("keeps account deletion out of Settings", () => {
  render(<ResidentSettings />);
  expect(screen.queryByRole("button", { name: "Delete Account" })).toBeNull();
});

it("browser settings do not wait for server phone settings", () => {
  mocks.loading = true;
  render(<ResidentSettings />);
  expect(screen.getByRole("switch", { name: "Browser Notifications" })).toHaveAttribute("aria-checked", "true");
  expect(mocks.save).not.toHaveBeenCalled();
});

it("turning browser alerts off preserves categories and explains the independent inbox", async () => {
  render(<ResidentSettings />);
  await act(async () => fireEvent.click(screen.getByRole("switch", { name: "Browser Notifications" })));
  expect(readBrowserNotificationSettings("resident")).toMatchObject({ enabled: false, reports: true });
  expect(screen.getByRole("switch", { name: "Report Updates" })).toBeDisabled();
  expect(screen.getByText(/All updates always appear in your app and website inbox/)).toBeInTheDocument();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("blocked permission shows the browser as off and provides site-settings guidance", () => {
  vi.stubGlobal("Notification", { permission: "denied", requestPermission: vi.fn() });
  render(<ResidentSettings />);
  expect(screen.getByRole("switch", { name: "Browser Notifications" })).toHaveAttribute("aria-checked", "false");
  expect(screen.getByRole("status")).toHaveTextContent("site settings");
  expect(Notification.requestPermission).not.toHaveBeenCalled();
});
