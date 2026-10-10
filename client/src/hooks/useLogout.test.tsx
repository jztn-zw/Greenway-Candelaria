import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AppProviders from "@/app/providers/AppProviders";
import ProtectedRoute from "@/app/routes/ProtectedRoute";
import Navbar from "@/features/landing/components/Navbar";
import authService, { type User } from "@/services/authService";
import useAuthStore from "@/store/authStore";
import useLogout from "./useLogout";

const modalOpened = vi.hoisted(() => vi.fn());
vi.mock("@/features/landing/components/AuthModal", () => ({ default: ({ open }: { open: boolean }) => {
  if (open) modalOpened();
  return open ? <p>Login dialog</p> : null;
} }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/lib/api", () => ({ default: { get: vi.fn(async () => ({ data: { data: { server_time: new Date().toISOString() } } })) } }));
vi.mock("@/services/authService", () => ({ default: {
  login: vi.fn(), logout: vi.fn(), getMe: vi.fn(),
  getToken: () => sessionStorage.getItem("token") ?? localStorage.getItem("token"), getCurrentUser: () => null,
} }));

const routes = { ADMIN: "/admin", RESIDENT: "/resident", DRIVER: "/collector" };
const user = (role: string): User => ({ id: `fixture-${role}`, role, full_name: "Fixture", username: "fixture", email: null, status: "ACTIVE", avatar_url: null, barangay_id: null });
const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
let privateClient: QueryClient;
const Dashboard = () => {
  const logout = useLogout();
  privateClient = useQueryClient();
  return <button onClick={() => { void logout().catch(() => {}); }}>Log Out</button>;
};
const mount = () => render(<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <AppProviders><Routes>
    <Route path="/" element={<Navbar />} />
    <Route path="/login" element={<Navbar />} />
    {Object.entries(routes).map(([role, path]) => <Route key={role} path={path} element={<ProtectedRoute allowedRoles={[role]}><Dashboard /></ProtectedRoute>} />)}
  </Routes></AppProviders>
</BrowserRouter>);
const signIn = async (role: string) => {
  vi.mocked(authService.login).mockResolvedValueOnce({ user: user(role), token: `session-${role}` });
  await act(async () => { await useAuthStore.getState().login("fixture", "fixture-password"); });
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); sessionStorage.clear();
  useAuthStore.getState().clearAuth();
  useAuthStore.setState({ hasHydrated: true });
  vi.mocked(authService.logout).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); useAuthStore.getState().clearAuth(); window.history.replaceState({}, "", "/"); });

it.each(Object.entries(routes))("logs out %s straight to home while revocation is pending", async (role, path) => {
  await signIn(role);
  window.history.replaceState({}, "", path);
  await act(async () => { mount(); });
  const oldCache = privateClient;
  oldCache.setQueryData(["private"], "Private fixture data");
  const pending = deferred();
  vi.mocked(authService.logout).mockImplementationOnce(() => {
    expect(authService.getToken()).toBe(`session-${role}`);
    return pending.promise;
  });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Log Out" })); });
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(authService.getToken()).toBeNull();
  expect(oldCache.getQueryData(["private"])).toBeUndefined();
  expect(window.location.pathname).toBe("/");
  expect(modalOpened).not.toHaveBeenCalled();
  await act(async () => { pending.resolve(); });
  expect(window.location.pathname).toBe("/");
  expect(modalOpened).not.toHaveBeenCalled();
});

it("stays on home if server logout fails", async () => {
  await signIn("ADMIN"); window.history.replaceState({}, "", routes.ADMIN);
  await act(async () => { mount(); });
  const pending = deferred(); vi.mocked(authService.logout).mockReturnValueOnce(pending.promise);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Log Out" })); });
  await act(async () => { pending.reject(new Error("Network unavailable")); });
  expect(window.location.pathname).toBe("/");
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(modalOpened).not.toHaveBeenCalled();
});

it("a delayed logout does not navigate away from a newer login", async () => {
  await signIn("RESIDENT"); window.history.replaceState({}, "", routes.RESIDENT);
  await act(async () => { mount(); });
  const pending = deferred(); vi.mocked(authService.logout).mockReturnValueOnce(pending.promise);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Log Out" })); });
  await signIn("DRIVER");
  await act(async () => {
    window.history.pushState({}, "", routes.DRIVER);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await act(async () => { pending.resolve(); });
  expect(window.location.pathname).toBe(routes.DRIVER);
  expect(useAuthStore.getState().user?.role).toBe("DRIVER");
  expect(modalOpened).not.toHaveBeenCalled();
});

it("still opens login for an unauthenticated protected-page visit", async () => {
  window.history.replaceState({}, "", routes.ADMIN);
  await act(async () => { mount(); });
  expect(window.location.pathname).toBe("/login");
  expect(screen.getByText("Login dialog")).toBeInTheDocument();
});
