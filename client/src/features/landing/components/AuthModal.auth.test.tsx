import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import api from "@/lib/api";
import useAuthStore from "@/store/authStore";
import AuthModal from "./AuthModal";

vi.mock("@/services/barangaysService", () => ({
  fetchBarangays: vi.fn().mockResolvedValue([{ id: "barangay-a", name: "Test barangay" }]),
  fetchBarangayStreets: vi.fn().mockResolvedValue({ streets: [] }),
}));

const originalAdapter = api.defaults.adapter;
let registrations: Record<string, unknown>[];
beforeEach(() => {
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
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter; vi.unstubAllGlobals(); });

const openModal = (tab: "login" | "register") => {
  render(<MemoryRouter><AuthModal open onOpenChange={() => {}} defaultTab={tab} /></MemoryRouter>);
};

it("clears passwords on close while keeping the resident's other signup details", async () => {
  const modal = render(<MemoryRouter><AuthModal open onOpenChange={() => {}} defaultTab="register" /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  fireEvent.change(screen.getByLabelText(/^Confirm password$/i), { target: { value: "FixturePassword1!" } });
  fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "resident@example.test" } });
  modal.rerender(<MemoryRouter><AuthModal open={false} onOpenChange={() => {}} defaultTab="register" /></MemoryRouter>);
  modal.rerender(<MemoryRouter><AuthModal open onOpenChange={() => {}} defaultTab="register" /></MemoryRouter>);
  expect(await screen.findByLabelText(/Email address/i)).toHaveValue("resident@example.test");
  expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("");
  expect(screen.getByLabelText(/^Confirm password$/i)).toHaveValue("");
});

it.each([false, true])("uses the remember-me choice on login (%s)", async (rememberMe) => {
  openModal("login");
  fireEvent.change(screen.getByLabelText(/^Username or email$/i), { target: { value: "resident" } });
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
  fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "resident@example.test" } });
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
  expect(registrations[0]).toEqual({ email: "resident@example.test", password: "FixturePassword1!", confirm_password: "FixturePassword1!", terms_accepted: true });
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
  expect(screen.getByLabelText(/^Username or email$/i)).not.toHaveAttribute("readonly");
  expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("autocomplete", "current-password");
  expect(screen.getByRole("checkbox", { name: /^Remember me$/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Forgot password\?$/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/or continue with/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
  expect(screen.getByLabelText(/^Email address$/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Log In" }));
  expect(screen.getByLabelText(/^Username or email$/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
});

it.each(["email", "terms"])("requires %s before creating an account", async field => {
  await fillRegistration();
  if (field === "email") fireEvent.change(screen.getByLabelText(/^Email address$/i), { target: { value: "" } });
  else fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(registrations).toHaveLength(0);
  expect(screen.getByText(field === "email" ? "Email is required" : "Please accept the Terms and Privacy Policy")).toBeInTheDocument();
});

it("shows duplicate email below its input and keeps the signup draft", async () => {
  api.defaults.adapter = async config => { throw Object.assign(new Error("Email already in use"), { config, response: { config, status: 409, data: { message: "Email already in use" } } }); };
  await fillRegistration();
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  await waitFor(() => expect(screen.getByLabelText(/Email address/i)).toHaveAttribute("aria-invalid", "true"));
  expect(screen.getByLabelText(/Email address/i)).toHaveAccessibleDescription("Email already registered. Log in or use another email address.");
  expect(screen.getByLabelText(/Email address/i)).toHaveValue("resident@example.test");
});

it("shows server email validation errors below the email field", async () => {
  api.defaults.adapter = async config => { throw Object.assign(new Error("Invalid email address"), { config, response: { config, status: 400, data: { message: "Invalid email address", errors: [{ field: "email", message: "Invalid email address" }] } } }); };
  await fillRegistration();
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  await waitFor(() => expect(screen.getByLabelText(/Email address/i)).toHaveAccessibleDescription("Invalid email address"));
});

it("registers with email only and shows a recovery code until acknowledged", async () => {
  api.defaults.adapter = async config => {
    if (config.url === "/auth/register") registrations.push(JSON.parse(config.data));
    return { config, status: 201, statusText: "Created", headers: {}, data: { data: { username: "resident", recovery_code: "ABCD-1234-ABCD-1234-ABCD-1234-ABCD-1234" } } };
  };
  await fillRegistration();
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  await screen.findByText("ABCD-1234-ABCD-1234-ABCD-1234-ABCD-1234");
  expect(registrations[0]).toHaveProperty("email", "resident@example.test");
  expect(registrations[0]).not.toHaveProperty("full_name");
  expect(registrations[0]).not.toHaveProperty("barangay_id");
  expect(registrations[0]).not.toHaveProperty("phone");
  expect(screen.getByRole("button", { name: "Continue to login" })).toBeDisabled();
  expect(localStorage.getItem("auth-storage") || "").not.toContain("ABCD-1234");
  fireEvent.click(screen.getByRole("checkbox", { name: "I saved my recovery code" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue to login" }));
  expect(screen.queryByText("ABCD-1234-ABCD-1234-ABCD-1234-ABCD-1234")).not.toBeInTheDocument();
  expect(screen.getByLabelText(/^Username or email$/i)).toHaveValue("resident@example.test");
});

it("rejects an invalid required email without losing the signup draft", async () => {
  await fillRegistration();
  fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "invalid" } });
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(screen.getByLabelText(/Email address/i)).toHaveAttribute("aria-invalid", "true");
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
  fireEvent.change(await screen.findByLabelText(/^Username or email$/i), { target: { value: "resident" } });
  fireEvent.change(screen.getByLabelText(/^Recovery code$/i), { target: { value: "old-code" } });
  fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: "NewPassword123!" } });
  fireEvent.change(screen.getByLabelText(/^Confirm new password$/i), { target: { value: "NewPassword123!" } });
  fireEvent.click(screen.getByRole("button", { name: /^Reset password$/i }));
  await screen.findByText("FFFF-1234-FFFF-1234-FFFF-1234-FFFF-1234");
  expect(reset).toMatchObject({ identifier: "resident", new_password: "NewPassword123!", confirm_password: "NewPassword123!" });
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});
