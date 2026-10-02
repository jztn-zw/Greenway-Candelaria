import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Button } from "./button";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

it("shows the action text before the truck and keeps an accessible loading name", () => {
  act(() => root.render(<Button loading={false} loadingLabel="Saving changes…">Save changes</Button>));
  expect(host.querySelector(".gw-button-label")?.textContent).toBe("Save changes");
  expect(host.querySelector("button")?.textContent).toBe("Save changes");
  expect(host.querySelector(".gw-action-loader")).toBeNull();

  act(() => root.render(<Button loading loadingLabel="Saving changes…">Save changes</Button>));
  const button = host.querySelector("button")!;
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute("aria-busy", "true");
  expect(button).toHaveAccessibleName("Saving changes…");
  expect(host.querySelector(".gw-button-label")).toHaveAttribute("aria-hidden", "true");
  expect(host.querySelector(".gw-button-loader")).toHaveAttribute("aria-hidden", "true");
  expect(host.querySelector(".gw-button-loader")).toHaveAttribute("data-loading-copy", "Saving changes…");
  expect(host.querySelector(".gw-button-loader-truck")).not.toBeNull();
  expect(host.querySelector(".gw-action-loader")).not.toBeNull();
});

it("removes the loader immediately when the operation completes", () => {
  vi.useFakeTimers();
  act(() => root.render(<Button loading loadingLabel="Saving changes">Save changes</Button>));
  expect(host.querySelector("button")).toHaveAccessibleName("Saving changes");

  act(() => root.render(<Button loading={false} loadingLabel="Saving changes">Save changes</Button>));
  expect(host.querySelector("button")).not.toBeDisabled();
  expect(host.querySelector("button")).toHaveAttribute("aria-busy", "false");
  expect(host.querySelector("button")).toHaveAccessibleName("Save changes");
  expect(host.querySelector(".gw-action-loader")).toBeNull();
  expect(host.querySelector('[role="status"]')).toBeNull();
});

it("updates the loading action without remounting the truck", () => {
  act(() => root.render(<Button loading loadingLabel="Uploading photos…">Submit report</Button>));
  const truck = host.querySelector(".gw-action-loader");
  act(() => root.render(<Button loading loadingLabel="Creating report…">Submit report</Button>));
  expect(host.querySelector(".gw-action-loader")).toBe(truck);
  expect(host.querySelector("button")).toHaveAccessibleName("Creating report…");
});

it("keeps ordinary buttons and slotted links intact", () => {
  const ref = createRef<HTMLButtonElement>();
  act(() => root.render(<Button ref={ref}>Open profile</Button>));
  expect(ref.current).toBe(host.querySelector("button"));
  expect(host.querySelector(".gw-button-label")).toBeNull();
  expect(ref.current).toHaveAccessibleName("Open profile");

  act(() => root.render(<Button asChild><a href="/profile">Open profile</a></Button>));
  expect(host.querySelector("a")).toHaveAttribute("href", "/profile");
  expect(host.querySelector("a")).toHaveAccessibleName("Open profile");
  expect(host.querySelector("button")).toBeNull();
});
