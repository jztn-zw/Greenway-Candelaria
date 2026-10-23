import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResidentAppPreview from "./ResidentAppPreview";

let visibility: (visible: boolean) => void;
const decodeDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) {
      visibility = visible => callback([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe() {}
    disconnect() {}
  });
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: () => Promise.resolve() });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (decodeDescriptor) Object.defineProperty(HTMLImageElement.prototype, "decode", decodeDescriptor);
  else Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
});

async function reveal() {
  await act(async () => { visibility(true); });
}

it("automatically shows app screens without a video player or pause controls", async () => {
  const { container } = render(<ResidentAppPreview />);
  const preview = screen.getByRole("region", { name: "Animated resident app preview" });
  expect(preview).toHaveAttribute("data-screen", "Home");
  expect(container.querySelector("video")).toBeNull();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  await reveal();
  for (const name of ["Tracking", "Report", "Reports", "Home"]) {
    act(() => vi.advanceTimersByTime(4200));
    expect(preview).toHaveAttribute("data-screen", name);
  }
});

it("holds the screen while hovered, focused, or off screen", async () => {
  render(<ResidentAppPreview />);
  const preview = screen.getByRole("region", { name: "Animated resident app preview" });
  await reveal();
  fireEvent.mouseEnter(preview);
  act(() => vi.advanceTimersByTime(9000));
  expect(preview).toHaveAttribute("data-screen", "Home");
  fireEvent.mouseLeave(preview);
  fireEvent.focus(preview);
  act(() => vi.advanceTimersByTime(9000));
  expect(preview).toHaveAttribute("data-screen", "Home");
  fireEvent.blur(preview);
  act(() => visibility(false));
  act(() => vi.advanceTimersByTime(9000));
  expect(preview).toHaveAttribute("data-screen", "Home");
  await reveal();
  act(() => vi.advanceTimersByTime(4200));
  expect(preview).toHaveAttribute("data-screen", "Tracking");
});

it("waits for decoded artwork and respects reduced motion", async () => {
  let finish: () => void = () => {};
  const pending = new Promise<void>(resolve => { finish = resolve; });
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: () => pending });
  render(<ResidentAppPreview />);
  const preview = screen.getByRole("region", { name: "Animated resident app preview" });
  await reveal();
  act(() => vi.advanceTimersByTime(9000));
  expect(preview).toHaveAttribute("data-screen", "Home");
  await act(async () => finish());
  act(() => vi.advanceTimersByTime(4200));
  expect(preview).toHaveAttribute("data-screen", "Tracking");
  cleanup();

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  vi.spyOn(window, "matchMedia").mockReturnValue({ ...media, matches: true });
  render(<ResidentAppPreview />);
  await reveal();
  act(() => vi.advanceTimersByTime(9000));
  expect(screen.getByRole("region", { name: "Animated resident app preview" })).toHaveAttribute("data-screen", "Home");
});
