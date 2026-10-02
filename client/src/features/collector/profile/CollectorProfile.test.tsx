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
  fetchProfile: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn(),
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

it.each(["account", "vehicle"] as const)("keeps the full skeleton until the slower %s request settles", async (slower) => {
  let resolveProfile!: (value: Awaited<ReturnType<typeof fetchProfile>>) => void;
  let resolveDriver!: (value: Awaited<ReturnType<typeof fetchDriverMe>>) => void;
  vi.mocked(fetchProfile).mockReturnValueOnce(new Promise((done) => { resolveProfile = done; }));
  vi.mocked(fetchDriverMe).mockReturnValueOnce(new Promise((done) => { resolveDriver = done; }));
  await renderProfile();
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Loading collector profile");
  expect(host.textContent).not.toContain("No vehicle currently assigned");
  await act(async () => {
    if (slower === "account") resolveDriver(driver as never);
    else resolveProfile(profile as never);
  });
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Loading collector profile");
  expect(host.textContent).not.toContain("Test Collector");
  expect(host.textContent).not.toContain("ABC-123");
  await act(async () => {
    if (slower === "account") resolveProfile(profile as never);
    else resolveDriver(driver as never);
  });
  expect(host.querySelector('[role="status"]')).toBeNull();
  expect(host.textContent).toContain("Test Collector");
  expect(host.textContent).toContain("ABC-123");
});

it("keeps the profile and open edit dialog visible while both requests refresh", async () => {
  await renderProfile();
  await click("Edit"); change("collector-profile-field", "Unsaved name");
  let resolveProfile!: (value: Awaited<ReturnType<typeof fetchProfile>>) => void;
  let resolveDriver!: (value: Awaited<ReturnType<typeof fetchDriverMe>>) => void;
  vi.mocked(fetchProfile).mockReturnValueOnce(new Promise((done) => { resolveProfile = done; }));
  vi.mocked(fetchDriverMe).mockReturnValueOnce(new Promise((done) => { resolveDriver = done; }));
  let refreshing!: Promise<void>;
  await act(async () => { refreshing = client.invalidateQueries({ queryKey: collectorKey("collector", "profile") }); });
  expect(host.querySelector('[role="status"]')).toBeNull();
  expect(host.textContent).toContain("ABC-123");
  expect(document.getElementById("collector-profile-field")).toHaveValue("Unsaved name");
  await act(async () => { resolveProfile(profile as never); resolveDriver(driver as never); await refreshing; });
  expect(document.getElementById("collector-profile-field")).toHaveValue("Unsaved name");
});

it("shows an API failure instead of inventing an unassigned vehicle, then retries", async () => {
  vi.mocked(fetchDriverMe).mockRejectedValueOnce(new Error("Network unavailable"));
  await renderProfile();
  expect(document.body.textContent).toContain("Vehicle information unavailable");
  expect(document.body.textContent).not.toContain("No vehicle currently assigned");
  expect(document.body.textContent).not.toContain("driver@menro.gov.ph");
  const retry = [...document.querySelectorAll("button")].find((button) => button.textContent === "Try again")!;
  expect(retry).toBeDefined();
  await act(async () => { retry.click(); });
  expect(fetchDriverMe).toHaveBeenCalledTimes(2);
  expect(document.body.textContent).toContain("ABC-123");
});

it("shows vehicle status without a status badge on the profile banner", async () => {
  vi.mocked(fetchProfile).mockResolvedValue({ ...profile, status: "DEACTIVATED" } as never);
  vi.mocked(fetchDriverMe).mockResolvedValue({ ...driver, truck_availability: "UNDER_MAINTENANCE" } as never);
  await renderProfile();
  expect(document.body.textContent).not.toContain("Deactivated collector");
  expect(document.body.textContent).toContain("Under maintenance");
  expect(document.body.textContent).not.toContain("Operational / Ready");
  expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  expect(document.body.textContent).not.toContain("Ask the dispatch team for route or vehicle assistance");
  expect(document.body.textContent).not.toContain("Open messages");
});

it("shows a retry state when both profile requests fail", async () => {
  vi.mocked(fetchProfile).mockRejectedValueOnce(new Error("Network unavailable"));
  vi.mocked(fetchDriverMe).mockRejectedValueOnce(new Error("Network unavailable"));
  await renderProfile();
  expect(document.body.textContent).toContain("This page couldn't load");
  expect(document.body.textContent).not.toContain("Active collector");
  expect(document.body.textContent).not.toContain("No vehicle currently assigned");
  await act(async () => [...document.querySelectorAll("button")].find((button) => button.textContent === "Try again")!.click());
  expect(document.body.textContent).toContain("Test Collector");
  expect(document.body.textContent).toContain("ABC-123");
  expect(fetchProfile).toHaveBeenCalledTimes(2);
  expect(fetchDriverMe).toHaveBeenCalledTimes(2);
});

it("offers only the ten supplied avatars and saves the selection", async () => {
  await renderProfile();
  expect(document.body.textContent).toContain("Joined");
  expect(document.body.textContent).toContain("Collector / Driver");
  expect(document.body.textContent).not.toContain("MENRO Candelaria · Solid Waste Management");
  const customize = [...document.querySelectorAll("button")].find((button) => button.getAttribute("aria-label") === "Customize avatar");
  await act(async () => { customize?.click(); });
  expect(document.querySelectorAll('[role="group"][aria-label="Profile avatars"] button')).toHaveLength(10);
  expect(document.querySelector('input[type="file"]')).toBeNull();
  expect(document.body.textContent).not.toContain("Upload profile photo");
  await click("Select Woman with short hair on blue avatar");
  expect(localStorage.getItem("greenway:collector-avatar:collector")).toBe("avatar-2");
  expect(updateProfile).toHaveBeenCalledWith({ avatar_url: "/profile-avatars/avatar-2.png" });
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
  expect(document.body.textContent).toContain("loaded data may be outdated");
  expect(document.body.textContent).not.toContain("Profile unavailable");
});
