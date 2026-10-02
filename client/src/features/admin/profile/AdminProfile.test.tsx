import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changePassword, updateProfile } from "@/services/profileService";
import useAuthStore from "@/store/authStore";
import AdminProfile from "./AdminProfile";

const mocks = vi.hoisted(() => ({
  profile: {
    id: "admin", full_name: "Test Administrator", username: "test_admin", email: "admin@example.com",
    phone: null, role: "ADMIN", status: "ACTIVE", avatar_url: null, two_factor: false,
    barangay_id: null, barangay_name: null, street_id: null, street_name: null, street_area: null,
    created_at: "2026-09-01 00:00:00", last_login_at: null,
  },
  setProfile: vi.fn(),
}));
vi.mock("@/lib/adminQuery", () => ({
  useAdminResource: () => ({ data: mocks.profile, setData: mocks.setProfile, isLoading: false, isError: false, refetch: vi.fn() }),
  useAdminAction: () => (action: () => Promise<unknown>) => action(),
}));
vi.mock("@/services/profileService", () => ({ fetchProfile: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let host: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  localStorage.removeItem("greenway:admin-avatar:admin");
  useAuthStore.setState({ user: { ...mocks.profile } as never, token: "session", isAuthenticated: true });
  vi.mocked(updateProfile).mockResolvedValue(mocks.profile);
  vi.mocked(changePassword).mockResolvedValue(undefined);
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminProfile /></MemoryRouter>));
});
afterEach(() => { act(() => root.unmount()); host.remove(); useAuthStore.getState().clearAuth(); });

const button = (name: string) => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === name || b.getAttribute("aria-label") === name)!;
const click = async (name: string) => { await act(async () => button(name).click()); };
const change = (id: string, value: string) => act(() => Simulate.change(document.getElementById(id)!, { target: { value } } as never));

it("keeps profile validation and failed-save recovery working", async () => {
  await click("Edit"); change("admin-profile-edit", "A"); await click("Save Changes");
  expect(document.querySelector('[role="alert"]')).toHaveTextContent("Enter at least 2 characters.");
  expect(updateProfile).not.toHaveBeenCalled();
  change("admin-profile-edit", "Updated Administrator");
  vi.mocked(updateProfile).mockRejectedValueOnce(new Error("Offline")); await click("Save Changes");
  expect(document.getElementById("admin-profile-edit")).toHaveValue("Updated Administrator");
  expect(document.querySelector('[role="alert"]')).toHaveTextContent("Could not update your profile.");
  const updated = { ...mocks.profile, full_name: "Updated Administrator" };
  vi.mocked(updateProfile).mockResolvedValueOnce(updated); await click("Save Changes");
  expect(updateProfile).toHaveBeenLastCalledWith({ full_name: "Updated Administrator" });
  expect(mocks.setProfile).toHaveBeenCalledWith(updated);
  expect(useAuthStore.getState().user?.full_name).toBe("Updated Administrator");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("stores one of the ten supplied avatars and closes the customization dialog", async () => {
  await click("Customize avatar");
  expect(document.querySelectorAll('[role="group"][aria-label="Profile avatars"] button')).toHaveLength(10);
  await click("Select Woman with short hair on blue avatar");
  expect(updateProfile).toHaveBeenCalledWith({ avatar_url: "/profile-avatars/avatar-2.png" });
  expect(localStorage.getItem("greenway:admin-avatar:admin")).toBe("avatar-2");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await click("Customize avatar"); expect(button("Select Woman with short hair on blue avatar")).toHaveAttribute("aria-pressed", "true");
  await click("Close"); expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("keeps entered passwords until discard is confirmed, then clears values and errors", async () => {
  await click("Change"); change("admin-current-password", "current-secret"); await click("Show password");
  await click("Change Password"); expect(document.querySelector('[role="alert"]')).toBeInTheDocument();
  await click("Cancel");
  expect(document.body.textContent).toContain("Discard Password Changes?");
  await click("Keep Editing");
  expect(document.getElementById("admin-current-password")).toHaveValue("current-secret");
  await click("Close change password"); await click("Discard Changes"); await click("Change");
  expect(document.getElementById("admin-current-password")).toHaveValue("");
  expect(document.getElementById("admin-current-password")).toHaveAttribute("type", "password");
  expect(document.querySelector('[role="alert"]')).toBeNull();
  expect(changePassword).not.toHaveBeenCalled();
});

it.each([0, 1, 2])("guards unsaved edits to profile field %i and preserves them when editing continues", async (fieldIndex) => {
  const editButtons = [...document.querySelectorAll("button")].filter(b => b.textContent?.trim() === "Edit");
  await act(async () => editButtons[fieldIndex].click());
  change("admin-profile-edit", "Changed value"); await click("Cancel");
  expect(document.body.textContent).toContain("Discard Profile Changes?");
  expect(updateProfile).not.toHaveBeenCalled(); await click("Keep Editing");
  expect(document.getElementById("admin-profile-edit")).toHaveValue("Changed value");
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.body.textContent).toContain("Discard Profile Changes?"); await click("Discard Changes");
  expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(updateProfile).not.toHaveBeenCalled();
});

it("closes unchanged profile and empty password forms without prompting", async () => {
  await click("Edit"); await click("Cancel"); expect(document.querySelector('[role="dialog"]')).toBeNull();
  await click("Change"); await click("Cancel"); expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("prevents closing during password updates and signs out after success", async () => {
  let resolveSave!: () => void;
  vi.mocked(changePassword).mockImplementationOnce(() => new Promise<void>(resolve => { resolveSave = resolve; }));
  await click("Change"); change("admin-current-password", "old-secret");
  change("admin-new-password", "new-secret"); change("admin-confirm-password", "new-secret");
  await click("Change Password");
  expect(button("Cancel")).toBeDisabled(); expect(button("Close change password")).toBeDisabled();
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
  expect(changePassword).toHaveBeenCalledWith({ old_password: "old-secret", new_password: "new-secret" });
  await act(async () => resolveSave());
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});
