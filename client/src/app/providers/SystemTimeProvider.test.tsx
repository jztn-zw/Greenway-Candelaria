import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import api from "@/lib/api";
import SystemTimeProvider from "./SystemTimeProvider";

const clock = vi.hoisted(() => ({ now: null as number | null, listeners: new Set<() => void>() }));
vi.mock("@/lib/api", () => ({ default: { get: vi.fn() } }));
vi.mock("@/lib/serverClock", () => ({
  getServerNow: () => clock.now,
  syncServerClock: (value: string) => { clock.now = Date.parse(value); clock.listeners.forEach(listener => listener()); },
  subscribeToServerClock: (listener: () => void) => { clock.listeners.add(listener); return () => clock.listeners.delete(listener); },
}));
const response = { data: { data: { server_time: "2026-10-06T16:59:00Z" } } };
beforeEach(() => { clock.now = null; vi.mocked(api.get).mockReset(); });

it("waits for trusted time before mounting screens", async () => {
  let resolve!: (value: typeof response) => void;
  vi.mocked(api.get).mockReturnValue(new Promise(done => { resolve = done; }));
  render(<SystemTimeProvider><p>Ready screen</p></SystemTimeProvider>);
  expect(screen.getByRole("status")).toHaveTextContent("Loading GreenWay");
  expect(screen.queryByText("Ready screen")).not.toBeInTheDocument();
  await act(async () => resolve(response));
  expect(screen.getByText("Ready screen")).toBeInTheDocument();
});

it("offers retry if startup time is unavailable instead of trusting the PC", async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(response);
  render(<SystemTimeProvider><p>Ready screen</p></SystemTimeProvider>);
  await screen.findByText("Unable to load GreenWay");
  expect(screen.queryByText("Ready screen")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
  expect(await screen.findByText("Ready screen")).toBeInTheDocument();
});

it("keeps a form draft mounted when a later time refresh fails", async () => {
  vi.mocked(api.get).mockResolvedValueOnce(response).mockRejectedValueOnce(new Error("Offline"));
  render(<SystemTimeProvider><input aria-label="Draft" defaultValue="" /></SystemTimeProvider>);
  const draft = await screen.findByRole("textbox", { name: "Draft" });
  fireEvent.change(draft, { target: { value: "Unsaved notice" } });
  fireEvent.focus(window);
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("textbox", { name: "Draft" })).toBe(draft);
  expect(draft).toHaveValue("Unsaved notice");
});
