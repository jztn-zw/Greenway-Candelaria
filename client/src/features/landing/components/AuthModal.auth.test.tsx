import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

it.each([false, true])("uses the remember-me choice on login (%s)", async (rememberMe) => {
  openModal("login");
  fireEvent.change(screen.getByLabelText("Email, Phone, or Username"), { target: { value: "resident" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  const remember = screen.getByRole("checkbox", { name: "Remember me" });
  expect(remember).not.toBeChecked();
  if (rememberMe) fireEvent.click(remember);
  fireEvent.click(screen.getByRole("button", { name: "Log In to GreenWay" }));
  await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
  expect((rememberMe ? localStorage : sessionStorage).getItem("token")).toBe("fixture-token");
  expect((rememberMe ? sessionStorage : localStorage).getItem("token")).toBeNull();
});

const fillRegistration = async () => {
  openModal("register");
  fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Test Resident" } });
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "resident" } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "resident@example.test" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "FixturePassword1!" } });
  await waitFor(() => expect(screen.getAllByRole("combobox")[0]).toHaveTextContent("Select your barangay"));
  fireEvent.click(screen.getAllByRole("combobox")[0]);
  const option = await screen.findByRole("option", { name: "Test barangay" });
  await act(async () => { fireEvent.click(option); });
  fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
};

it("blocks missing or mismatched confirmation, then accepts matching passwords", async () => {
  await fillRegistration();
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(screen.getByLabelText("Confirm password")).toHaveAttribute("aria-invalid", "true");
  expect(registrations).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "DifferentPassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(screen.getByLabelText("Confirm password")).toHaveAttribute("aria-invalid", "true");
  expect(registrations).toHaveLength(0);
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "FixturePassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  await screen.findByRole("heading", { name: /^Welcome back/ });
  expect(registrations).toHaveLength(1);
  expect(registrations[0]).not.toHaveProperty("confirmPassword");
  fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
  expect(screen.getByLabelText("Confirm password")).toHaveValue("");
});

it("checks confirmation again when the original password changes", async () => {
  await fillRegistration();
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "FixturePassword1!" } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "ChangedPassword1!" } });
  fireEvent.click(screen.getByRole("button", { name: "Create My Account" }));
  expect(screen.getByLabelText("Confirm password")).toHaveAttribute("aria-invalid", "true");
  expect(registrations).toHaveLength(0);
});
