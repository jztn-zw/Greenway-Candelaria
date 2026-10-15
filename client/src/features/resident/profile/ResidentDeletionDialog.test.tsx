import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import authService from "@/services/authService";
import useAuthStore from "@/store/authStore";
import ResidentDeletionDialog from "./ResidentDeletionDialog";

vi.mock("@/services/authService", () => ({ default: { deleteAccount: vi.fn(), logout: vi.fn() } }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn() } }));
const Location = () => <span data-testid="location">{useLocation().pathname}</span>;
let client: QueryClient;
beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ user: { id: "resident", role: "RESIDENT" } as never, token: "old-session", isAuthenticated: true });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); vi.useRealTimers(); });
const open = () => render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/resident/profile"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Location /><ResidentDeletionDialog onClose={vi.fn()} /></MemoryRouter></QueryClientProvider>);
const confirm = () => screen.getByRole("button", { name: "Delete Account" });
const password = () => screen.getByLabelText("Current Password");
const type = () => fireEvent.change(password(), { target: { value: " password " } });

it("requires a password and preserves the exact value before clearing the session on success", async () => {
  vi.mocked(authService.deleteAccount).mockResolvedValue(undefined);
  open(); expect(confirm()).toBeDisabled(); type();
  await act(async () => fireEvent.click(confirm()));
  expect(authService.deleteAccount).toHaveBeenCalledExactlyOnceWith(" password ");
  expect(authService.logout).not.toHaveBeenCalled();
  expect(useAuthStore.getState().token).toBeNull();
  expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
});

it("keeps the password and session after a failed confirmation", async () => {
  vi.mocked(authService.deleteAccount).mockRejectedValue(new Error("Current password is incorrect"));
  open(); type(); await act(async () => fireEvent.click(confirm()));
  expect(screen.getByRole("alert")).toHaveTextContent("Current password is incorrect");
  expect(password()).toHaveValue(" password ");
  expect(useAuthStore.getState().token).toBe("old-session");
  expect(screen.getByTestId("location")).toHaveTextContent("/resident/profile");
});

it("does not clear a newer login when an older deletion finishes", async () => {
  let finish!: () => void;
  vi.mocked(authService.deleteAccount).mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
  open(); type(); await act(async () => fireEvent.click(confirm()));
  await act(async () => {
    useAuthStore.setState({ user: { id: "other", role: "RESIDENT" } as never, token: "new-session" });
    finish();
  });
  expect(useAuthStore.getState().token).toBe("new-session");
});

it("counts down inline after rate limiting and permits retry after expiry", async () => {
  vi.useFakeTimers();
  vi.mocked(authService.deleteAccount).mockRejectedValue({ response: { status: 429, data: { retryAfterSeconds: 2 } } });
  open(); type(); await act(async () => fireEvent.click(confirm()));
  expect(confirm()).toBeDisabled(); expect(screen.getByRole("timer")).toHaveTextContent("0:02");
  await act(async () => vi.advanceTimersByTime(1000));
  expect(screen.getByRole("timer")).toHaveTextContent("0:01");
  await act(async () => vi.advanceTimersByTime(1000));
  expect(confirm()).not.toBeDisabled();
  expect(useAuthStore.getState().token).toBe("old-session");
});

it("waits for a pending settings save before allowing deletion", async () => {
  let finish!: () => void;
  const mutation = client.getMutationCache().build(client, {
    meta: { residentUserId: "resident" },
    mutationFn: () => new Promise<void>((resolve) => { finish = resolve; }),
  });
  const saving = mutation.execute(undefined);
  await act(async () => { open(); });
  type();
  expect(confirm()).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Please wait for your changes to finish saving.");
  expect(authService.deleteAccount).not.toHaveBeenCalled();
  await act(async () => { finish(); await saving; });
});
