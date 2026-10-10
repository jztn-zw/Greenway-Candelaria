import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AxiosError } from "axios";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import api from "@/lib/api";
import useAuthStore from "@/store/authStore";
import AuthModal from "./AuthModal";

const originalAdapter = api.defaults.adapter;
let requests: number;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); useAuthStore.getState().clearAuth();
  vi.useFakeTimers(); requests = 0;
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  api.defaults.adapter = async config => {
    requests++;
    throw new AxiosError("Too many requests", "ERR_BAD_REQUEST", config, {}, {
      config, status: 429, statusText: "Too Many Requests", headers: { "retry-after": "3" },
      data: { success: false, code: "RATE_LIMITED", retryAfterSeconds: 3, message: "Too many requests. Try again in 3 seconds." },
    });
  };
});
afterEach(() => { cleanup(); api.defaults.adapter = originalAdapter; sessionStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const open = (tab: "login" | "register" = "login") => render(<MemoryRouter><AuthModal open onOpenChange={() => {}} defaultTab={tab} /></MemoryRouter>);
const fillLogin = () => {
  fireEvent.change(screen.getByLabelText(/^Username or email$/i), { target: { value: "fixture-user" } });
  fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "FixturePassword1!" } });
};
const fillRegister = () => {
  fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "fixture@example.test" } });
  fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: "FixturePassword1!" } });
  fireEvent.change(screen.getByLabelText(/^Confirm password$/i), { target: { value: "FixturePassword1!" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I agree/i }));
};

it("counts down login inline, blocks button and Enter submissions, and keeps the draft", async () => {
  open(); fillLogin();
  const button = screen.getByRole("button", { name: /Log In to GreenWay/i });
  await act(async () => { fireEvent.click(button); });
  expect(screen.getByText(/Too many login attempts/i)).toBeInTheDocument();
  expect(screen.getByRole("timer")).toHaveTextContent("0:03");
  expect(button).toBeDisabled();
  expect(screen.getByLabelText(/^Username or email$/i)).toHaveValue("fixture-user");
  expect(screen.getByLabelText(/^Password$/i)).toHaveValue("FixturePassword1!");
  await act(async () => { fireEvent.submit(button.closest("form")!); });
  expect(requests).toBe(1);
  act(() => { vi.advanceTimersByTime(1000); });
  expect(screen.getByRole("timer")).toHaveTextContent("0:02");
  act(() => { vi.advanceTimersByTime(2000); });
  expect(button).toBeEnabled();
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  expect(requests).toBe(1); // Expiry never automatically resends credentials.
  await act(async () => { fireEvent.click(button); });
  expect(requests).toBe(2);
});

it("signup has its own cooldown and keeps registration details", async () => {
  open("register"); fillRegister();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Create My Account/i })); });
  expect(screen.getByText(/Too many signup attempts/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Create My Account/i })).toBeDisabled();
  expect(screen.getByLabelText(/Email address/i)).toHaveValue("fixture@example.test");
  expect(screen.getByLabelText(/^Password$/i)).toHaveValue("FixturePassword1!");
  fireEvent.click(screen.getByRole("button", { name: /^Log In$/i }));
  expect(screen.getByRole("button", { name: /Log In to GreenWay/i })).toBeEnabled();
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Sign Up$/i }));
  expect(screen.getByRole("button", { name: /Create My Account/i })).toBeDisabled();
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.getByRole("button", { name: /Create My Account/i })).toBeEnabled();
});

it("remounting the dialog retains the expiry without storing credentials", async () => {
  const first = open(); fillLogin();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Log In to GreenWay/i })); });
  first.unmount();
  act(() => { vi.advanceTimersByTime(1000); });
  open();
  expect(screen.getByRole("timer")).toHaveTextContent("0:02");
  expect(screen.getByRole("button", { name: /Log In to GreenWay/i })).toBeDisabled();
  expect(JSON.stringify(sessionStorage)).not.toContain("FixturePassword1!");
  expect(JSON.stringify(sessionStorage)).not.toContain("fixture-user");
});

it("rapid submissions send only one request while the first is pending", async () => {
  let reject!: () => void;
  api.defaults.adapter = config => {
    requests++;
    return new Promise((_, fail) => { reject = () => fail(new AxiosError("Too many requests", "ERR_BAD_REQUEST", config, {}, {
      config, status: 429, statusText: "Too Many Requests", headers: {}, data: { retryAfterSeconds: 3 },
    })); });
  };
  open(); fillLogin();
  const form = screen.getByRole("button", { name: /Log In to GreenWay/i }).closest("form")!;
  await act(async () => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(requests).toBe(1);
  await act(async () => { reject(); });
  expect(screen.getByRole("timer")).toHaveTextContent("0:03");
});
