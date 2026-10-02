import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changePassword, updateProfile } from "@/services/profileService";
import useAuthStore from "@/store/authStore";
import ResidentProfile from "./ResidentProfile";

const mocks = vi.hoisted(() => ({
  profile: { id: "resident", full_name: "Test Resident", username: "test_resident", email: "resident@example.com",
    phone: null, role: "RESIDENT", status: "ACTIVE", avatar_url: null, two_factor: false,
    barangay_id: "poblacion", barangay_name: "Poblacion", street_id: "street-1", street_name: "Gonzales St", street_area: null,
    created_at: "2026-09-01 00:00:00", last_login_at: null },
  barangays: [{ id: "poblacion", name: "Poblacion" }, { id: "masin", name: "Masin" }],
  streets: [{ id: "street-1", name: "Gonzales St" }, { id: "street-2", name: "New Street" }],
  stats: { total: 0, resolved: 0, pending: 0, in_progress: 0, under_review: 0 }, setProfile: vi.fn(),
}));
vi.mock("@/lib/residentQuery", () => ({
  useResidentResource: () => ({ data: mocks.profile, setData: mocks.setProfile, isLoading: false, isError: false, refetch: vi.fn() }),
  useResidentMutation: (action: unknown) => action,
  useResidentQuery: (domain: string, key: string[]) => ({ data: domain === "reports" ? mocks.stats : key[0] === "locations" ? mocks.barangays : { streets: mocks.streets }, isLoading: false, isError: false }),
}));
vi.mock("@/services/profileService", () => ({ fetchProfile: vi.fn(), updateProfile: vi.fn(), changePassword: vi.fn(), fetchMyReportStats: vi.fn() }));
vi.mock("@/components/ui/searchable-select", () => ({
  SearchableSelect: ({ id, value, onValueChange, options, disabled }: { id: string; value: string; onValueChange: (value: string) => void; options: { value: string; label: string }[]; disabled: boolean }) => (
    <select id={id} value={value} disabled={disabled} onChange={e => onValueChange(e.target.value)}><option value="" />{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
  ),
}));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
let host: HTMLDivElement; let root: Root;
beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); localStorage.removeItem("greenway:resident-avatar:resident");
  useAuthStore.setState({ user: { ...mocks.profile } as never, token: "session", isAuthenticated: true });
  vi.mocked(updateProfile).mockResolvedValue(mocks.profile); vi.mocked(changePassword).mockResolvedValue(undefined);
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ResidentProfile /></MemoryRouter>));
});
afterEach(() => { act(() => root.unmount()); host.remove(); useAuthStore.getState().clearAuth(); });
const button = (name: string) => [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === name || b.getAttribute("aria-label") === name)!;
const click = async (name: string) => { await act(async () => button(name).click()); };
const change = (id: string, value: string) => act(() => Simulate.change(document.getElementById(id)!, { target: { value } } as never));
const openField = async (index: number) => { await act(async () => [...document.querySelectorAll("button")].filter(b => b.textContent?.trim() === "Edit")[index].click()); };

it("offers only the ten supplied avatars and saves the selection", async () => {
  await click("Customize avatar");
  expect(document.querySelectorAll('[role="group"][aria-label="Profile avatars"] button')).toHaveLength(10);
  await click("Select Man with styled hair on blue avatar");
  expect(updateProfile).toHaveBeenCalledWith({ avatar_url: "/profile-avatars/avatar-7.png" });
  expect(localStorage.getItem("greenway:resident-avatar:resident")).toBe("avatar-7");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it.each([0, 1, 2])("keeps resident profile field %i until discard is confirmed", async (index) => {
  await openField(index); change("resident-profile-field", "Changed value"); await click("Cancel");
  expect(document.body.textContent).toContain("Discard Profile Changes?"); await click("Keep Editing");
  expect(document.getElementById("resident-profile-field")).toHaveValue("Changed value");
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  await click("Discard Changes"); expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(updateProfile).not.toHaveBeenCalled();
});
it("closes unchanged field, address, and empty password forms directly", async () => {
  await openField(0); await click("Cancel"); expect(document.querySelector('[role="dialog"]')).toBeNull();
  await openField(3); await click("Cancel"); expect(document.querySelector('[role="dialog"]')).toBeNull();
  await click("Change"); await click("Cancel"); expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("blocks closing during profile saves, retains failed edits, then saves successfully", async () => {
  await openField(0); change("resident-profile-field", "Updated Resident");
  let rejectSave!: (error: Error) => void;
  vi.mocked(updateProfile).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
  await click("Save Changes"); expect(button("Cancel")).toBeDisabled();
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.body.textContent).not.toContain("Discard Profile Changes?");
  await act(async () => rejectSave(new Error("Offline"))); expect(document.querySelector('[role="alert"]')).toHaveTextContent("Failed to update");
  expect(document.getElementById("resident-profile-field")).toHaveValue("Updated Resident");
  const updated = { ...mocks.profile, full_name: "Updated Resident" }; vi.mocked(updateProfile).mockResolvedValueOnce(updated);
  await click("Save Changes"); expect(updateProfile).toHaveBeenLastCalledWith({ full_name: "Updated Resident" });
  expect(mocks.setProfile).toHaveBeenCalledWith(updated); expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("keeps entered passwords until discard and resets visibility on reopening", async () => {
  await click("Change"); change("resident-password-oldPw", "old-secret"); await click("Show current password");
  await click("Cancel"); await click("Keep Editing"); expect(document.getElementById("resident-password-oldPw")).toHaveValue("old-secret");
  await click("Close dialog"); await click("Discard Changes"); await click("Change");
  expect(document.getElementById("resident-password-oldPw")).toHaveValue("");
  expect(document.getElementById("resident-password-oldPw")).toHaveAttribute("type", "password");
});
it("resets the street after a barangay change and guards the address draft", async () => {
  await openField(3); change("resident-address-barangay", "masin"); expect(document.getElementById("resident-address-street")).toHaveValue("");
  change("resident-address-street", "street-2"); await click("Cancel"); expect(document.body.textContent).toContain("Discard Address Changes?");
  await click("Keep Editing"); expect(document.getElementById("resident-address-street")).toHaveValue("street-2");
  await click("Save address"); expect(updateProfile).toHaveBeenLastCalledWith({ barangay_id: "masin", street_id: "street-2" });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("validates password changes and signs out after a successful update", async () => {
  const logout = vi.spyOn(useAuthStore.getState(), "logout").mockResolvedValue(undefined);
  try {
    await click("Change"); await click("Change Password"); expect(document.querySelector('[role="alert"]')).toHaveTextContent("All fields are required");
    change("resident-password-oldPw", "old-secret"); change("resident-password-newPw", "new-secret"); change("resident-password-confirmPw", "new-secret");
    await click("Change Password"); expect(changePassword).toHaveBeenCalledWith({ old_password: "old-secret", new_password: "new-secret" }); expect(logout).toHaveBeenCalledOnce();
  } finally { logout.mockRestore(); }
});
it("requires confirmation before logging out from the resident profile", async () => {
  const logout = vi.spyOn(useAuthStore.getState(), "logout").mockResolvedValue(undefined);
  try {
    const signOut = [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Sign Out"))!;
    await act(async () => signOut.click()); expect(logout).not.toHaveBeenCalled(); await click("Cancel"); expect(logout).not.toHaveBeenCalled();
    await act(async () => signOut.click()); await click("Log Out"); expect(logout).toHaveBeenCalledOnce();
  } finally { logout.mockRestore(); }
});
