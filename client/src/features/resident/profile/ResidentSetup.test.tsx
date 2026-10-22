import { act, cleanup, fireEvent, render as renderUI, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import authService, { type User } from "@/services/authService";
import useAuthStore from "@/store/authStore";
import ResidentSetup from "./ResidentSetup";
import ResidentLayout from "@/app/layouts/resident/ResidentLayout";
import { fetchBarangays, fetchBarangayStreets } from "@/services/barangaysService";
vi.mock("./ResidentSetupMap", () => ({ default: function MockLocationMap({ onPin, onAvailability }: { onPin: (point: [number, number]) => void; onAvailability: (ready: boolean) => void }) {
  useEffect(() => onAvailability(true), [onAvailability]);
  return <div aria-label="Resident location map"><button type="button" onClick={() => onPin([13.9301, 121.425])}>Place Test Pin</button></div>;
} }));
vi.mock("@/services/barangaysService", () => ({
  fetchBarangays: vi.fn().mockResolvedValue([{ id: "barangay-a", name: "Test barangay" }]),
  fetchBarangayStreets: vi.fn().mockResolvedValue({ collection_service_available: true, streets: [{ id: "street-a", name: "Main Street", coverage_path: [[13.93, 121.42], [13.93, 121.43]] }] }),
}));
vi.mock("@/app/layouts/resident/ResidentSidebar", () => ({ default: () => <p>Resident sidebar</p> }));
vi.mock("@/app/layouts/resident/ResidentTopbar", () => ({ default: () => null }));
vi.mock("@/app/layouts/resident/ResidentLiveSync", () => ({ default: () => null }));
vi.mock("@/components/motion/PageTransition", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
const pending = { id: "resident", email: "resident@example.test", full_name: "", username: "", role: "RESIDENT", profile_completed: false } as User;
let client: QueryClient;
const render = (ui: ReactNode) => renderUI(ui, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(fetchBarangays).mockResolvedValue([{ id: "barangay-a", name: "Test barangay", latitude: null, longitude: null }]);
  vi.mocked(fetchBarangayStreets).mockResolvedValue({ collection_service_available: true, streets: [{ id: "street-a", name: "Main Street", coverage_path: [[13.93, 121.42], [13.93, 121.43]] }] });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  useAuthStore.getState().clearAuth();
  useAuthStore.setState({ user: pending, token: "fixture", isAuthenticated: true });
});
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const fill = async (withLocation = true) => {
  fireEvent.change(screen.getByLabelText(/^Full name$/i), { target: { value: "Test Resident" } });
  const username = screen.queryByLabelText("Username");
  if (username) fireEvent.change(username, { target: { value: "resident" } });
  fireEvent.change(screen.getByLabelText(/^Phone number$/i), { target: { value: "9123456789" } });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Barangay" })).not.toBeDisabled());
  fireEvent.click(screen.getByRole("combobox", { name: "Barangay" }));
  fireEvent.click(await screen.findByRole("option", { name: "Test barangay" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Choose a Nearby Street Point" })).not.toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: "Choose a Nearby Street Point" }));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Street" })).not.toBeDisabled());
  fireEvent.click(screen.getByRole("combobox", { name: "Street" }));
  fireEvent.click(await screen.findByRole("option", { name: "Main Street" }));
  if (withLocation) {
    fireEvent.click(screen.getByRole('button', { name: 'Pin on Map' })); fireEvent.click(screen.getByText('Place Test Pin'));
    fireEvent.click(screen.getByRole('button', { name: /Main Street.*m$/ }));
    fireEvent.click(screen.getByRole('checkbox'));
  }
};
it("reveals the map after choosing a barangay and blocks submission without a location", async () => {
  const save = vi.spyOn(authService, 'completeResidentProfile').mockResolvedValue({ ...pending, profile_completed: true });
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  expect(screen.queryByLabelText('Resident location map')).toBeNull();
  await fill(false);
  expect(screen.getByLabelText('Resident location map')).toBeInTheDocument();
  expect(fetchBarangayStreets).toHaveBeenCalledWith('barangay-a', true);
  fireEvent.click(screen.getByRole('button', { name: /^Save and continue$/i }));
  expect(await screen.findByText('Choose and confirm your location to continue.')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});
it("requires pin confirmation and retains the selected home point after a failed save", async () => {
  vi.mocked(fetchBarangayStreets).mockResolvedValue({ collection_service_available: true, streets: [{ id: 'street-a', name: 'Main Street', coverage_path: [[13.93, 121.42], [13.93, 121.43]] }] });
  const save = vi.spyOn(authService, 'completeResidentProfile').mockRejectedValueOnce(new Error("Couldn't save your profile. Please retry."))
    .mockResolvedValue({ ...pending, profile_completed: true });
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>); await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Pin on Map' })); fireEvent.click(screen.getByText('Place Test Pin'));
  fireEvent.click(screen.getByRole('button', { name: /^Save and continue$/i }));
  expect(await screen.findByText('Choose and confirm your location to continue.')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /^Save and continue$/i }));
  await screen.findByText("Couldn't save your profile. Please retry.");
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(screen.getByLabelText(/^Full name$/i)).toHaveValue('Test Resident');
  fireEvent.click(screen.getByRole('button', { name: /^Save and continue$/i }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1][0].resident_location).toEqual({ method: 'MANUAL_PIN', latitude: 13.9301, longitude: 121.425 });
});
it("refreshes area choices through the query cache without losing the setup draft", async () => {
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  await fill(false);
  vi.mocked(fetchBarangayStreets).mockResolvedValue({ collection_service_available: true, streets: [
    { id: "street-a", name: "Renamed Street" }, { id: "street-b", name: "New Street" },
  ] });
  await act(async () => { await client.invalidateQueries({ queryKey: ["resident", "resident", "barangays"] }); });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Street" })).toHaveTextContent("Renamed Street"));
  expect(screen.getByLabelText(/^Full name$/i)).toHaveValue("Test Resident");
  fireEvent.click(screen.getByRole("combobox", { name: "Street" }));
  expect(await screen.findByRole("option", { name: "New Street" })).toBeInTheDocument();
});
it("reconciles missed street changes automatically while setup is open", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
    await fill(false);
    vi.mocked(fetchBarangayStreets).mockResolvedValue({ collection_service_available: true, streets: [{ id: "street-a", name: "Updated Street" }] });
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByRole("combobox", { name: "Street" })).toHaveTextContent("Updated Street");
    expect(screen.getByLabelText(/^Full name$/i)).toHaveValue("Test Resident");
  } finally { vi.useRealTimers(); }
});
it("blocks setup after all previously listed streets are removed", async () => {
  const save = vi.spyOn(authService, "completeResidentProfile").mockResolvedValue({ ...pending, profile_completed: true });
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  await fill(false);
  vi.mocked(fetchBarangayStreets).mockResolvedValue({ collection_service_available: false, streets: [] });
  await act(async () => { await client.invalidateQueries({ queryKey: ["resident", "resident", "barangays"] }); });
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Street" })).toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: /^Save and continue$/i }));
  expect(screen.getByRole("button", { name: /^Save and continue$/i })).toBeDisabled();
  expect(screen.getByText(/Contact MENRO to add your street before completing setup/)).toBeInTheDocument();
  fireEvent.submit(screen.getByRole("form", { name: /Complete your resident profile/i }));
  expect(save).not.toHaveBeenCalled();
  expect(useAuthStore.getState().user?.profile_completed).toBe(false);
  vi.mocked(fetchBarangayStreets).mockResolvedValue({ collection_service_available: true, streets: [{ id: "street-a", name: "Main Street", coverage_path: [[13.93, 121.42], [13.93, 121.43]] }] });
  await act(async () => { await client.invalidateQueries({ queryKey: ["resident", "resident", "barangays"] }); });
  await waitFor(() => expect(screen.getByRole("button", { name: /^Save and continue$/i })).not.toBeDisabled());
  expect(screen.getByLabelText(/^Full name$/i)).toHaveValue("Test Resident");
});
it("requires setup before mounting resident features and skips it for completed accounts", async () => {
  const view = render(<MemoryRouter><ResidentLayout /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: /Complete your resident profile/i })).toBeInTheDocument();
  expect(screen.queryByText("Resident sidebar")).not.toBeInTheDocument();
  await act(async () => { useAuthStore.setState({ user: { ...pending, profile_completed: true } }); });
  view.rerender(<MemoryRouter><ResidentLayout /></MemoryRouter>);
  expect(screen.getByText("Resident sidebar")).toBeInTheDocument();
});
it("retains the draft after failure and completes only after server success", async () => {
  const save = vi.spyOn(authService, "completeResidentProfile").mockRejectedValueOnce({ response: { data: { message: "Username is already in use" } } }).mockResolvedValue({ ...pending, full_name: "Test Resident", username: "resident", profile_completed: true });
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  await fill();
  fireEvent.click(screen.getByRole("button", { name: /^Save and continue$/i }));
  expect(await screen.findByText("Username is already in use")).toBeInTheDocument();
  expect(screen.getByLabelText(/^Full name$/i)).toHaveValue("Test Resident");
  expect(useAuthStore.getState().user?.profile_completed).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /^Save and continue$/i }));
  await waitFor(() => expect(useAuthStore.getState().user?.profile_completed).toBe(true));
  expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ full_name: "Test Resident", username: "resident", email: "resident@example.test", phone: "+639123456789", barangay_id: "barangay-a", street_id: "street-a" }));
});
it("allows selecting a saved street even when collection service is unavailable", async () => {
  vi.mocked(fetchBarangayStreets).mockResolvedValue({ collection_service_available: false, streets: [{ id: "street-a", name: "Main Street", coverage_path: [[13.93, 121.42], [13.93, 121.43]] }] });
  const save = vi.spyOn(authService, "completeResidentProfile").mockResolvedValue({ ...pending, profile_completed: true });
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  await fill();
  expect(screen.getByRole("group", { name: "Collection street options" })).toHaveTextContent("Main Street");
  fireEvent.click(screen.getByRole("button", { name: /^Save and continue$/i }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ barangay_id: "barangay-a", street_id: "street-a" })));
});
it.each([
  { value: "8123456789", message: "Enter a 10-digit Philippine mobile number starting with 9" },
  { value: "91234", message: "Enter a 10-digit Philippine mobile number starting with 9" },
])("requires a valid contact phone before saving ($value)", async ({ value, message }) => {
  const save = vi.spyOn(authService, "completeResidentProfile");
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  await fill();
  const phone = screen.getByLabelText(/^Phone number$/i);
  expect(phone).not.toBeRequired();
  fireEvent.change(phone, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: /^Save and continue$/i }));
  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(phone).toHaveAttribute("aria-invalid", "true");
  expect(save).not.toHaveBeenCalled();
  expect(useAuthStore.getState().user?.profile_completed).toBe(false);
});
it("shows the signup username once outside the form and saves without optional contacts", async () => {
  const modern = { ...pending, username: "resident", email: null };
  useAuthStore.setState({ user: modern });
  const save = vi.spyOn(authService, "completeResidentProfile").mockResolvedValue({ ...modern, profile_completed: true });
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  await fill();
  expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
  expect(screen.getByText(/Signed in as/)).toHaveTextContent("@resident");
  fireEvent.change(screen.getByLabelText(/^Phone number$/i), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /^Save and continue$/i }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ username: "resident", phone: null, email: null })));
});
it("clears populated text fields with the shared clear controls", () => {
  useAuthStore.setState({ user: { ...pending, full_name: "Test Resident", username: "resident", email: "resident@example.test", phone: "+639123456789" } });
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Clear full name" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear email address" }));
  fireEvent.click(screen.getByRole("button", { name: "Clear phone number" }));
  expect(screen.getByLabelText(/^Full name$/i)).toHaveValue("");
  expect(screen.getByLabelText(/^Email address$/i)).toHaveValue("");
  expect(screen.getByLabelText(/^Phone number$/i)).toHaveValue("");
  expect(screen.getByText("+63")).toBeInTheDocument();
});
it("keeps a selected avatar after a failed save and saves it with the completed profile", async () => {
  const chosen = "/profile-avatars/avatar-7.png";
  const save = vi.spyOn(authService, "completeResidentProfile").mockRejectedValueOnce(new Error("Couldn't save your profile. Please retry."))
    .mockResolvedValue({ ...pending, avatar_url: chosen, profile_completed: true });
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  await fill();
  fireEvent.click(screen.getByRole("button", { name: "Choose profile avatar" }));
  expect(screen.getByRole("group", { name: "Profile avatars" }).querySelectorAll("button")).toHaveLength(10);
  fireEvent.click(screen.getByRole("button", { name: "Select Man with styled hair on blue avatar" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Save and continue$/i }));
  await screen.findByText("Couldn't save your profile. Please retry.");
  expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ avatar_url: chosen }));
  fireEvent.click(screen.getByRole("button", { name: /^Save and continue$/i }));
  await waitFor(() => expect(useAuthStore.getState().user?.avatar_url).toBe(chosen));
});
it("ignores a setup response after the signed-in account changes", async () => {
  let finish!: (value: User) => void;
  vi.spyOn(authService, "completeResidentProfile").mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<MemoryRouter><ResidentSetup /></MemoryRouter>);
  await fill();
  fireEvent.click(screen.getByRole("button", { name: /^Save and continue$/i }));
  await waitFor(() => expect(finish).toBeDefined());
  await act(async () => {
    useAuthStore.setState({ user: { ...pending, id: "different" }, token: "different-token" });
    finish({ ...pending, profile_completed: true });
  });
  await waitFor(() => expect(useAuthStore.getState().user?.id).toBe("different"));
  expect(useAuthStore.getState().user?.profile_completed).toBe(false);
});
