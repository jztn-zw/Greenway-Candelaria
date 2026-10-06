import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConfirmationDialog } from "./ConfirmationDialog";

vi.mock("@/components/common/ActionButtonLoader", () => ({ default: () => <span data-action-loader /> }));
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const confirm = () => [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Delete") || button.textContent?.includes("Deleting"))!;
const deferred = () => {
  let resolve!: (value: unknown) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<unknown>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const render = (onConfirm: () => void | Promise<unknown>, onOpenChange = vi.fn()) => {
  act(() => root.render(<ConfirmationDialog open onOpenChange={onOpenChange} title="Delete item?" description="Confirm removal." confirmLabel="Delete" pendingLabel="Deleting…" onConfirm={onConfirm} closeOnConfirm />));
  return onOpenChange;
};

it("keeps the confirmation busy for the real promise and closes after success", async () => {
  const request = deferred(); const action = vi.fn(() => request.promise); const change = render(action);
  act(() => { confirm().click(); confirm().click(); });
  expect(action).toHaveBeenCalledTimes(1);
  expect(confirm()).toBeDisabled();
  expect(confirm()).toHaveAttribute("aria-busy", "true");
  expect(document.querySelector('[aria-label="Close confirmation"]')).toBeDisabled();
  expect(change).not.toHaveBeenCalled();
  await act(async () => request.resolve(true));
  expect(change).toHaveBeenCalledWith(false);
  expect(confirm()).not.toBeDisabled();
  expect(document.querySelector("[data-action-loader]")).toBeNull();
});

it.each(["rejection", "failure result"])("clears loading and allows retry after %s", async (failure) => {
  const request = deferred(); const action = vi.fn(() => request.promise); const change = render(action);
  act(() => confirm().click());
  await act(async () => { if (failure === "rejection") request.reject(new Error("Unavailable")); else request.resolve(false); });
  expect(change).not.toHaveBeenCalled();
  expect(confirm()).not.toBeDisabled();
  expect(confirm()).toHaveAttribute("aria-busy", "false");
  expect(document.querySelector("[data-action-loader]")).toBeNull();
  action.mockImplementationOnce(() => Promise.resolve(true));
  await act(async () => confirm().click());
  expect(action).toHaveBeenCalledTimes(2);
  expect(change).toHaveBeenCalledWith(false);
});

it("does not manufacture a loading phase for a synchronous action", () => {
  const action = vi.fn(); const change = render(action);
  act(() => confirm().click());
  expect(action).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledWith(false);
  expect(document.querySelector("[data-action-loader]")).toBeNull();
  expect(confirm()).toHaveAttribute("aria-busy", "false");
});
