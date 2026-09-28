import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { collectorKey } from "@/lib/collectorQuery";
import { Simulate } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { changePassword, fetchProfile, updateProfile } from "@/services/profileService";
import { fetchDriverMe } from "@/services/driverManagerService";
import CollectorProfile from "./CollectorProfile";

vi.mock("@/services/profileService", () => ({
  fetchProfile: vi.fn(), updateProfile: vi.fn(), uploadAvatar: vi.fn(), changePassword: vi.fn(),
}));
vi.mock("@/services/driverManagerService", () => ({
  fetchDriverMe: vi.fn(), reportTruckBreakdown: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;

const profile = {
  id: "collector", full_name: "Test Collector", username: "test_collector",
  email: "collector@example.com", phone: null, role: "DRIVER", status: "ACTIVE", avatar_url: null,
  created_at: "2026-09-01 00:00:00",
};
const driver = {
  id: "driver", user_id: "collector", full_name: "Test Collector", username: "test_collector",
  email: "collector@example.com", account_status: "ACTIVE", truck_id: "truck",
  truck_name: "Truck 1", truck_plate: "ABC-123", truck_status: "OFFLINE",
  truck_availability: "ACTIVE",
};

beforeEach(() => {
  client = new QueryClient(); notifyManager.setScheduler(queueMicrotask);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  localStorage.removeItem("greenway:collector-avatar:collector");
  useAuthStore.setState({ user: { ...profile } as never, token: "session", isAuthenticated: true });
  vi.mocked(fetchProfile).mockResolvedValue(profile as never);
  vi.mocked(fetchDriverMe).mockResolvedValue(driver as never);
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  client.clear(); notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  host.remove();
  useAuthStore.getState().clearAuth();
});

const renderProfile = async () => {
  await act(async () => {
    root.render(<QueryClientProvider client={client}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><CollectorProfile /></MemoryRouter></QueryClientProvider>);
  });
};

it("shows an API failure instead of inventing an unassigned vehicle, then retries", async () => {
  vi.mocked(fetchDriverMe).mockRejectedValueOnce(new Error("Network unavailable"));
  await renderProfile();
  expect(document.body.textContent).toContain("Vehicle information unavailable");
  expect(document.body.textContent).not.toContain("No vehicle currently assigned");
  expect(document.body.textContent).not.toContain("driver@menro.gov.ph");
  const retry = [...document.querySelectorAll("button")].find((button) => button.textContent === "Retry");
  await act(async () => { retry?.click(); });
  expect(fetchDriverMe).toHaveBeenCalledTimes(2);
  expect(document.body.textContent).toContain("ABC-123");
});

it("shows stored account and vehicle status without a duplicate dispatch card", async () => {
  vi.mocked(fetchProfile).mockResolvedValue({ ...profile, status: "DEACTIVATED" } as never);
  vi.mocked(fetchDriverMe).mockResolvedValue({ ...driver, truck_availability: "UNDER_MAINTENANCE" } as never);
  await renderProfile();
  expect(document.body.textContent).toContain("Deactivated collector");
  expect(document.body.textContent).toContain("Under maintenance");
  expect(document.body.textContent).not.toContain("Operational / Ready");
  expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  expect(document.body.textContent).not.toContain("Ask the dispatch team for route or vehicle assistance");
  expect(document.body.textContent).not.toContain("Open messages");
});

it("shows a retry state when both profile requests fail", async () => {
  vi.mocked(fetchProfile).mockRejectedValue(new Error("Network unavailable"));
  vi.mocked(fetchDriverMe).mockRejectedValue(new Error("Network unavailable"));
  await renderProfile();
  expect(document.body.textContent).toContain("Profile unavailable");
  expect(document.body.textContent).not.toContain("Active collector");
  expect(document.body.textContent).not.toContain("No vehicle currently assigned");
  expect([...document.querySelectorAll("button")].some((button) => button.textContent === "Retry loading profile")).toBe(true);
});

it("uses the same customizable initials header pattern as the other profiles", async () => {
  await renderProfile();
  expect(document.body.textContent).toContain("Joined");
  expect(document.body.textContent).toContain("Collector / Driver");
  expect(document.body.textContent).not.toContain("MENRO Candelaria · Solid Waste Management");
  const customize = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Customize"));
  await act(async () => { customize?.click(); });
  expect(document.body.textContent).toContain("Upload profile photo");
  const ocean = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("Ocean"));
  await act(async () => { ocean?.click(); });
  expect(localStorage.getItem("greenway:collector-avatar:collector")).toBe("ocean");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

const button = (name: string) => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === name || b.getAttribute("aria-label") === name)!;
const click = async (name: string) => { await act(async () => button(name).click()); };
const change = (id: string, value: string) => act(() => Simulate.change(document.getElementById(id)!, { target: { value } } as never));

it.each([0, 1, 2])("preserves edits to collector profile field %i until discard is confirmed", async (fieldIndex) => {
  await renderProfile();
  const editButtons = [...document.querySelectorAll("button")].filter(b => b.textContent?.trim() === "Edit");
  await act(async () => editButtons[fieldIndex].click());
  change("collector-profile-field", "Changed value"); await click("Cancel");
  expect(document.body.textContent).toContain("Discard Profile Changes?"); await click("Keep Editing");
  expect(document.getElementById("collector-profile-field")).toHaveValue("Changed value");
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.body.textContent).toContain("Discard Profile Changes?"); await click("Discard Changes");
  expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(updateProfile).not.toHaveBeenCalled();
});

it("closes unchanged profile and empty password dialogs without a prompt", async () => {
  await renderProfile(); await click("Edit"); await click("Cancel");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await click("Change"); await click("Cancel"); expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("blocks profile dismissal during a save, retains failed edits, then saves successfully", async () => {
  await renderProfile(); await click("Edit"); change("collector-profile-field", "Updated Collector");
  let rejectSave!: (error: Error) => void;
  vi.mocked(updateProfile).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
  await click("Save changes"); expect(button("Cancel")).toBeDisabled(); expect(document.getElementById("collector-profile-field")).toBeDisabled();
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.body.textContent).not.toContain("Discard Profile Changes?");
  await act(async () => rejectSave(new Error("Offline")));
  expect(document.querySelector('[role="alert"]')).toHaveTextContent("Update failed");
  expect(document.getElementById("collector-profile-field")).toHaveValue("Updated Collector");
  vi.mocked(updateProfile).mockResolvedValueOnce({ ...profile, full_name: "Updated Collector" } as never);
  vi.mocked(fetchProfile).mockResolvedValue({ ...profile, full_name: "Updated Collector" } as never);
  await click("Save changes"); expect(updateProfile).toHaveBeenLastCalledWith({ full_name: "Updated Collector" });
  expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(document.body.textContent).toContain("Updated Collector");
});

it("keeps password drafts and clears fields and visibility after discard", async () => {
  await renderProfile(); await click("Change"); change("collector-current-password", "old-secret"); await click("Show current password");
  await click("Cancel"); expect(document.body.textContent).toContain("Discard Password Changes?"); await click("Keep Editing");
  expect(document.getElementById("collector-current-password")).toHaveValue("old-secret");
  await click("Close dialog"); await click("Discard Changes"); await click("Change");
  expect(document.getElementById("collector-current-password")).toHaveValue("");
  expect(document.getElementById("collector-current-password")).toHaveAttribute("type", "password");
  expect(changePassword).not.toHaveBeenCalled();
});

it("validates and saves a password without a discard prompt", async () => {
  await renderProfile(); await click("Change"); await click("Update password");
  expect(document.querySelector('[role="alert"]')).toHaveTextContent("All fields are required");
  change("collector-current-password", "old-secret"); change("collector-new-password", "new-secret"); change("collector-confirm-password", "new-secret");
  vi.mocked(changePassword).mockResolvedValueOnce(undefined); await click("Update password");
  expect(changePassword).toHaveBeenCalledWith({ old_password: "old-secret", new_password: "new-secret" });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("asks for confirmation before logging out from the profile", async () => {
  const logout = vi.spyOn(useAuthStore.getState(), "logout").mockResolvedValue(undefined);
  try {
    await renderProfile();
    const signOut = [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Sign Out"))!;
    await act(async () => signOut.click()); expect(logout).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Log Out of GreenWay?"); await click("Cancel"); expect(logout).not.toHaveBeenCalled();
    await act(async () => signOut.click()); await click("Log Out"); expect(logout).toHaveBeenCalledOnce();
  } finally { logout.mockRestore(); }
});
it("uses cached profile data on navigation and refreshes admin changes without losing a field draft", async () => {
  await renderProfile();
  await act(async () => root.render(<QueryClientProvider client={client}>Other page</QueryClientProvider>));
  await renderProfile();
  expect(fetchProfile).toHaveBeenCalledTimes(1);
  expect(fetchDriverMe).toHaveBeenCalledTimes(1);
  await click("Edit"); change("collector-profile-field", "Unsaved collector name");
  vi.mocked(fetchProfile).mockResolvedValue({ ...profile, full_name: "Admin updated name" } as never);
  vi.mocked(fetchDriverMe).mockResolvedValue({ ...driver, truck_plate: "NEW-789", truck_availability: "UNDER_MAINTENANCE" } as never);
  await act(async () => { await client.invalidateQueries({ queryKey: collectorKey("collector", "profile") }); });
  expect(document.body.textContent).toContain("NEW-789");
  expect(document.body.textContent).toContain("Under maintenance");
  expect(document.getElementById("collector-profile-field")).toHaveValue("Unsaved collector name");
});

it("keeps the last profile and vehicle visible when a background refresh fails", async () => {
  await renderProfile();
  vi.mocked(fetchProfile).mockRejectedValue(new Error("offline"));
  vi.mocked(fetchDriverMe).mockRejectedValue(new Error("offline"));
  await act(async () => { await client.invalidateQueries({ queryKey: collectorKey("collector", "profile") }); });
  expect(document.body.textContent).toContain("Test Collector");
  expect(document.body.textContent).toContain("ABC-123");
  expect(document.body.textContent).toContain("could not be refreshed");
  expect(document.body.textContent).not.toContain("Profile unavailable");
});
