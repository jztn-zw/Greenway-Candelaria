import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import api from "@/lib/api";
import useAuthStore from "@/store/authStore";
import AuthModal from "./AuthModal";
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn() } }));

vi.mock("@/services/barangaysService", () => ({
  fetchBarangays: vi.fn().mockResolvedValue([{ id: "barangay-a", name: "Test barangay" }]),
  fetchBarangayStreets: vi.fn().mockResolvedValue({ streets: [] }),
}));

const originalAdapter = api.defaults.adapter;
let registrations: Record<string, unknown>[];
it("uses username login and isolates the unfinished email signup transition", async () => {
  let request: Record<string, unknown> | undefined;
  api.defaults.adapter = async config => { request = JSON.parse(config.data); throw new Error("fixture failure"); };
  openModal("login");
  fireEvent.change(screen.getByLabelText(/^Username$/i), { target: { value: "resident@example.test" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Log In to GreenWay" }));
  expect(request).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "Finish an Earlier Email Signup" }));
  fireEvent.change(screen.getByLabelText("Earlier Signup Email"), { target: { value: "resident@example.test" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Log In to GreenWay" }));
  await waitFor(() => expect(request).toMatchObject({ identifier: "resident@example.test", login_mode: "legacy-setup" }));
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.getState().clearAuth();
  registrations = [];
  api.defaults.adapter = async (config) => {
    if (config.url === "/auth/register") registrations.push(JSON.parse(config.data));
    return { config, status: 200, statusText: "OK", headers: {}, data: { data: {
      token: "fixture-token",
      user: { id: "fixture-user", full_name: "Test Resident", username: "resident", email: "resident@example.test", role: "RESIDENT", status: "ACTIVE", avatar_url: null, barangay_id: "barangay-a" },
    } } };
  };
});

it("welcomes a resident back when login reactivates their account", async () => {
  const adapter = api.defaults.adapter as (config: never) => Promise<{ data: { data: Record<string, unknown> } }>;
  api.defaults.adapter = async (config) => {
    const response = await adapter(config as never);
    response.data.data.reactivated = true;
    return response as never;
  };
  openModal("login");
  fireEvent.change(screen.getByLabelText(/^Username$/i), { target: { value: "resident" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Log In to GreenWay" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Welcome back! Your account has been reactivated."));
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
});
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter; vi.unstubAllGlobals(); });

const openModal = (tab: "login" | "register") => {
  render(<MemoryRouter><AuthModal open onOpenChange={() => {}} defaultTab={tab} /></MemoryRouter>);
};

it("clears passwords on close while keeping the resident's other signup details", async () => {
  const modal = render(<MemoryRouter><AuthModal open onOpenChange={() => {}} defaultTab="register" /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  fireEvent.change(screen.getByLabelText(/^Confirm password$/i), { target: { value: "FixturePassword1!" } });
  fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: "resident" } });
  modal.rerender(<MemoryRouter><AuthModal open={false} onOpenChange={() => {}} defaultTab="register" /></MemoryRouter>);
  modal.rerender(<MemoryRouter><AuthModal open onOpenChange={() => {}} defaultTab="register" /></MemoryRouter>);
  expect(await screen.findByLabelText(/Username/i)).toHaveValue("resident");
  expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("");
  expect(screen.getByLabelText(/^Confirm password$/i)).toHaveValue("");
});

it.each([false, true])("uses the remember-me choice on login (%s)", async (rememberMe) => {
  openModal("login");
  fireEvent.change(screen.getByLabelText(/^Username$/i), { target: { value: "resident" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  const remember = screen.getByRole("checkbox", { name: /^Remember me$/i });
  expect(remember).not.toBeChecked();
  if (rememberMe) fireEvent.click(remember);
  fireEvent.click(screen.getByRole("button", { name: "Log In to GreenWay" }));
  await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
  expect((rememberMe ? localStorage : sessionStorage).getItem("token")).toBe("fixture-token");
  expect((rememberMe ? sessionStorage : localStorage).getItem("token")).toBeNull();
});

const fillRegistration = async (open = true) => {
  if (open) openModal("register");
  fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: "resident" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  fireEvent.change(screen.getByLabelText(/^Confirm password$/i), { target: { value: "FixturePassword1!" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
};

it("blocks missing or mismatched confirmation, then accepts matching passwords", async () => {
  openModal("register");
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(screen.getByLabelText(/^Confirm password$/i)).toHaveAttribute("aria-invalid", "true");
  expect(registrations).toHaveLength(0);
  fireEvent.change(screen.getByLabelText(/^Confirm password$/i), { target: { value: "DifferentPassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(screen.getByLabelText(/^Confirm password$/i)).toHaveAttribute("aria-invalid", "true");
  expect(registrations).toHaveLength(0);
  await fillRegistration(false);
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  await screen.findByRole("heading", { name: /^Welcome back/i });
  expect(registrations).toHaveLength(1);
  expect(registrations[0]).toEqual({ username: "resident", password: "FixturePassword1!", confirm_password: "FixturePassword1!", terms_accepted: true });
  fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
  expect(screen.getByLabelText(/^Confirm password$/i)).toHaveValue("");
});

it("checks confirmation again when the original password changes", async () => {
  await fillRegistration();
  fireEvent.change(screen.getByLabelText(/^Confirm password$/i), { target: { value: "FixturePassword1!" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "ChangedPassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(screen.getByLabelText(/^Confirm password$/i)).toHaveAttribute("aria-invalid", "true");
  expect(registrations).toHaveLength(0);
});

it("offers a single password login flow with signup and recovery, without Google", async () => {
  openModal("login");
  expect(screen.getByLabelText(/^Username$/i)).not.toHaveAttribute("readonly");
  expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("autocomplete", "current-password");
  expect(screen.getByRole("checkbox", { name: /^Remember me$/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Forgot password\?$/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/or continue with/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
  expect(screen.getByLabelText(/^Username$/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Log In" }));
  expect(screen.getByLabelText(/^Username$/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
});

it.each(["username", "terms"])("requires %s before creating an account", async field => {
  await fillRegistration();
  if (field === "username") fireEvent.change(screen.getByLabelText(/^Username$/i), { target: { value: "" } });
  else fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(registrations).toHaveLength(0);
  expect(screen.getByText(field === "username" ? "Use 3–20 letters, numbers, or underscores" : "Please accept the Terms and Privacy Policy")).toBeInTheDocument();
});

it("shows duplicate username below its input and keeps the signup draft", async () => {
  api.defaults.adapter = async config => { throw Object.assign(new Error("Username already taken"), { config, response: { config, status: 409, data: { message: "Username already taken" } } }); };
  await fillRegistration();
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  await waitFor(() => expect(screen.getByLabelText(/Username/i)).toHaveAttribute("aria-invalid", "true"));
  expect(screen.getByLabelText(/Username/i)).toHaveAccessibleDescription("Username already taken. Choose another username.");
  expect(screen.getByLabelText(/Username/i)).toHaveValue("resident");
});

it("shows server username validation errors below the username field", async () => {
  api.defaults.adapter = async config => { throw Object.assign(new Error("Invalid username"), { config, response: { config, status: 400, data: { message: "Invalid username", errors: [{ field: "username", message: "Invalid username" }] } } }); };
  await fillRegistration();
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  await waitFor(() => expect(screen.getByLabelText(/Username/i)).toHaveAccessibleDescription("Invalid username"));
});

it("registers with username only and shows a recovery code until acknowledged", async () => {
  api.defaults.adapter = async config => {
    if (config.url === "/auth/register") registrations.push(JSON.parse(config.data));
    return { config, status: 201, statusText: "Created", headers: {}, data: { data: { username: "resident", recovery_code: "ABCD-1234-ABCD-1234-ABCD-1234-ABCD-1234" } } };
  };
  await fillRegistration();
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  await screen.findByText("ABCD-1234-ABCD-1234-ABCD-1234-ABCD-1234");
  expect(registrations[0]).toHaveProperty("username", "resident");
  expect(registrations[0]).not.toHaveProperty("full_name");
  expect(registrations[0]).not.toHaveProperty("barangay_id");
  expect(registrations[0]).not.toHaveProperty("phone");
  expect(screen.getByRole("button", { name: "Continue to login" })).toBeDisabled();
  expect(localStorage.getItem("auth-storage") || "").not.toContain("ABCD-1234");
  fireEvent.click(screen.getByRole("checkbox", { name: "I saved my recovery code" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue to login" }));
  expect(screen.queryByText("ABCD-1234-ABCD-1234-ABCD-1234-ABCD-1234")).not.toBeInTheDocument();
  expect(screen.getByLabelText(/^Username$/i)).toHaveValue("resident");
});

it("rejects an invalid required username without losing the signup draft", async () => {
  await fillRegistration();
  fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: "invalid name" } });
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(screen.getByLabelText(/Username/i)).toHaveAttribute("aria-invalid", "true");
  expect(registrations).toHaveLength(0);
});

it("resets through a recovery code and requires saving the replacement before login", async () => {
  let reset: Record<string, unknown> | undefined;
  api.defaults.adapter = async config => {
    if (config.url === "/auth/recover") reset = JSON.parse(config.data);
    return { config, status: 200, statusText: "OK", headers: {}, data: { data: { recovery_code: "FFFF-1234-FFFF-1234-FFFF-1234-FFFF-1234" } } };
  };
  openModal("login");
  fireEvent.click(screen.getByRole("button", { name: /^Forgot password\?$/i }));
  fireEvent.change(await screen.findByLabelText(/^Username$/i), { target: { value: "resident" } });
  fireEvent.change(screen.getByLabelText(/^Recovery code$/i), { target: { value: "old-code" } });
  fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: "NewPassword123!" } });
  fireEvent.change(screen.getByLabelText(/^Confirm new password$/i), { target: { value: "NewPassword123!" } });
  fireEvent.click(screen.getByRole("button", { name: /^Reset password$/i }));
  await screen.findByText("FFFF-1234-FFFF-1234-FFFF-1234-FFFF-1234");
  expect(reset).toMatchObject({ identifier: "resident", new_password: "NewPassword123!", confirm_password: "NewPassword123!" });
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});
