import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import { act, render, screen } from "@testing-library/react";
import api from "./api";
import AppProviders from "@/app/providers/AppProviders";
import { useQuery } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { Toaster } from "@/components/ui/sonner";

const originalAdapter = api.defaults.adapter;
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear();
  useAuthStore.setState({ token: null, user: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { api.defaults.adapter = originalAdapter; vi.useRealTimers(); vi.restoreAllMocks(); });
const limited = (seconds: number | undefined, header?: string) => {
  api.defaults.adapter = async config => {
    throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
      config, status: 429, statusText: "Too Many Requests",
      headers: header ? { "retry-after": header } : {},
      data: { success: false, code: "RATE_LIMITED", message: "Too many requests.", retryAfterSeconds: seconds },
    });
  };
};
it("returns cooldown metadata without a toast or clearing the session", async () => {
  localStorage.setItem("token", "fixture-session");
  const { unmount } = render(<Toaster />);
  limited(3);
  await act(async () => { await expect(api.post("/reports", {})).rejects.toThrow(/3 seconds/); });
  expect(localStorage.getItem("token")).toBe("fixture-session");
  await act(async () => { vi.advanceTimersByTime(200); });
  expect(screen.queryByText("Request limit reached")).not.toBeInTheDocument();
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  unmount();
});
it("uses Retry-After when the body has no wait duration", async () => {
  limited(undefined, "45");
  await expect(api.post("/auth/login", {})).rejects.toMatchObject({ retryAfterSeconds: 45, message: expect.stringMatching(/45 seconds/) });
});
it("does not show a stale session's cooldown after another account signs in", async () => {
  localStorage.setItem("token", "account-A");
  const { unmount } = render(<Toaster />);
  let reject!: () => void;
  api.defaults.adapter = config => new Promise((_, fail) => {
    reject = () => fail(new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
      config, status: 429, statusText: "Too Many Requests", headers: {}, data: { retryAfterSeconds: 500 },
    }));
  });
  const pending = api.post("/reports", {});
  localStorage.setItem("token", "account-B");
  await act(async () => { reject(); await expect(pending).rejects.toThrow(); vi.advanceTimersByTime(200); });
  expect(screen.queryByText(/Try again in 8:20/)).not.toBeInTheDocument();
  expect(localStorage.getItem("token")).toBe("account-B");
  unmount();
});
it("does not automatically retry rate-limited queries", async () => {
  let requests = 0;
  api.defaults.adapter = async config => {
    requests++;
    throw new AxiosError("Too many requests", "ERR_BAD_REQUEST", config, {}, {
      config, status: 429, statusText: "Too Many Requests", headers: {}, data: { retryAfterSeconds: 60 },
    });
  };
  const Read = () => {
    const query = useQuery({ queryKey: ["limited-fixture"], queryFn: () => api.get("/tracking/live") });
    return <p>{query.isError ? "Read blocked" : "Reading"}</p>;
  };
  const { unmount } = render(<AppProviders><Read /></AppProviders>);
  await act(async () => { await Promise.resolve(); });
  await act(async () => { vi.advanceTimersByTime(5000); });
  expect(screen.getByText("Read blocked")).toBeInTheDocument();
  // System time may be requested by the provider as well.
  expect(requests).toBeLessThanOrEqual(2);
  unmount();
});
