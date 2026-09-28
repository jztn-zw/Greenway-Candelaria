import { act, useState as ReactUseState } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { Route, Routes, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AppProviders from "./AppProviders";
import App from "@/App";
import useAuthStore from "@/store/authStore";
import type { User } from "@/services/authService";
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));
const loginRole = vi.hoisted(() => ({ value: "ADMIN" }));
vi.mock("@/app/routes/AppRoutes", () => ({ default: () => <Routes>
  <Route path="/" element={<Login role={loginRole.value} />} />
  <Route path="/admin" element={<p>ADMIN dashboard</p>} />
  <Route path="/resident" element={<p>RESIDENT dashboard</p>} />
  <Route path="/collector" element={<p>DRIVER dashboard</p>} />
</Routes> }));
const routes: Record<string, string> = { ADMIN: "/admin", RESIDENT: "/resident", DRIVER: "/collector" };
const user = (role: string): User => ({ id: `user-${role}`, role, full_name: "Test", username: "test", email: "test@example.com", status: "ACTIVE", avatar_url: null, barangay_id: null });
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.history.replaceState({}, "", "/");
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false, hasHydrated: true });
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); useAuthStore.setState({ user: null, token: null, isAuthenticated: false }); localStorage.clear(); });
const Login = ({ role }: { role: string }) => {
  const navigate = useNavigate();
  const login = async () => {
    // An external store can publish the new session before the async login
    // handler resumes with the navigate function captured on the login page.
    await new Promise<void>((resolve) => {
      flushSync(() => useAuthStore.setState({ user: user(role), token: `token-${role}`, isAuthenticated: true }));
      resolve();
    });
    navigate(routes[role]);
  };
  return <button onClick={() => void login()}>Login</button>;
};
it.each(["ADMIN", "RESIDENT", "DRIVER"])("navigates to the %s dashboard after login without reloading", async (role) => {
  loginRole.value = role;
  await act(async () => root.render(<App />));
  await act(async () => host.querySelector<HTMLButtonElement>("button")!.click());
  expect(host.textContent).toContain(`${role} dashboard`);
  expect(window.location.pathname).toBe(routes[role]);
});
it("replaces and clears private caches and remounts consumers on account changes", async () => {
  let mounts = 0;
  const clients: ReturnType<typeof useQueryClient>[] = [];
  const CacheConsumer = () => {
    const client = useQueryClient(); if (!clients.includes(client)) clients.push(client);
    return <p>{client.getQueryData<string>(["private"]) ?? "No private data"}</p>;
  };
  const MountedConsumer = () => { const [identity] = ReactUseState(() => ++mounts); return <><span>{identity}</span><CacheConsumer /></>; };
  await act(async () => root.render(<AppProviders><MountedConsumer /></AppProviders>));
  clients[0].setQueryData(["private"], "Account A secret");
  await act(async () => useAuthStore.setState({ user: user("DRIVER"), token: "account-B", isAuthenticated: true }));
  expect(mounts).toBe(2); expect(clients).toHaveLength(2); expect(clients[0].getQueryData(["private"])).toBeUndefined();
  expect(host.textContent).toContain("No private data");
});
