import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "@/lib/toast";
import ConnectionStatus from "./ConnectionStatus";

vi.mock("@/lib/toast", () => ({ toast: { warning: vi.fn(), success: vi.fn(), dismiss: vi.fn() } }));
let online = true;
beforeEach(() => {
  vi.clearAllMocks();
  online = true;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const connection = (connected: boolean) => {
  online = connected;
  act(() => { window.dispatchEvent(new Event(connected ? "online" : "offline")); });
};

it("stays quiet on a normal online visit", () => {
  render(<ConnectionStatus />);
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast.warning).not.toHaveBeenCalled();
});

it("shows one persistent offline warning and replaces it on recovery", () => {
  render(<ConnectionStatus />);
  connection(false);
  connection(false);
  expect(toast.warning).toHaveBeenCalledTimes(1);
  expect(toast.warning).toHaveBeenCalledWith("You’re offline", expect.objectContaining({ id: "connection-status", duration: Infinity }));
  connection(true);
  connection(true);
  expect(toast.success).toHaveBeenCalledTimes(1);
  expect(toast.success).toHaveBeenCalledWith("Back online", expect.objectContaining({ id: "connection-status", duration: 4200 }));
  connection(false);
  expect(toast.warning).toHaveBeenCalledTimes(2);
});

it("warns when the website starts offline and announces recovery", () => {
  online = false;
  render(<ConnectionStatus />);
  expect(toast.warning).toHaveBeenCalledTimes(1);
  connection(true);
  expect(toast.success).toHaveBeenCalledTimes(1);
});

it("does not repeat notices on rerender and removes listeners on unmount", () => {
  const { rerender, unmount } = render(<ConnectionStatus />);
  connection(false);
  rerender(<ConnectionStatus />);
  expect(toast.warning).toHaveBeenCalledTimes(1);
  unmount();
  expect(toast.dismiss).toHaveBeenCalledWith("connection-status");
  connection(true);
  expect(toast.success).not.toHaveBeenCalled();
});
