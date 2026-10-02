import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useThemeMode } from "@/hooks/useThemeMode";
import { getThemeMode, setThemeMode, toggleThemeMode } from "./theme";

let frames: FrameRequestCallback[];

const finishFrame = () => {
  frames.splice(0).forEach((frame) => frame(0));
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

const mockViewTransitions = () => {
  const transitions: { update: () => void; finish: () => void; skip: ReturnType<typeof vi.fn> }[] = [];
  const start = vi.fn((update: () => void) => {
    const finished = deferred();
    const skip = vi.fn();
    transitions.push({ update, finish: finished.resolve, skip });
    return { ready: Promise.resolve(), finished: finished.promise, skipTransition: skip };
  });
  Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });
  return { start, transitions };
};

beforeEach(() => {
  document.documentElement.className = "";
  localStorage.clear();
  frames = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
});

afterEach(() => {
  cleanup();
  finishFrame();
  Reflect.deleteProperty(document, "startViewTransition");
  document.documentElement.className = "";
  vi.restoreAllMocks();
});

it("keeps multiple consumers synchronized and saves the selected theme without view-transition support", () => {
  const topbar = renderHook(useThemeMode);
  const settings = renderHook(useThemeMode);
  act(() => setThemeMode("dark"));

  expect(topbar.result.current).toBe("dark");
  expect(settings.result.current).toBe("dark");
  expect(localStorage.getItem("theme")).toBe("dark");
  expect(document.documentElement).toHaveClass("theme-switching");
  finishFrame();
  expect(document.documentElement).not.toHaveClass("theme-switching");

  act(() => toggleThemeMode());
  expect(topbar.result.current).toBe("light");
  expect(settings.result.current).toBe("light");
  expect(localStorage.getItem("theme")).toBe("light");
});

it("updates React consumers inside the snapshot callback and restores local transitions when the fade finishes", async () => {
  const { start, transitions } = mockViewTransitions();
  const consumer = renderHook(useThemeMode);
  setThemeMode("dark");

  expect(start).toHaveBeenCalledOnce();
  expect(getThemeMode()).toBe("light");
  act(() => transitions[0].update());
  expect(consumer.result.current).toBe("dark");
  expect(document.documentElement).toHaveClass("theme-switching");

  await act(async () => transitions[0].finish());
  expect(document.documentElement).not.toHaveClass("theme-switching");
});

it("uses the latest choice when toggled again before the previous snapshot is captured", async () => {
  const { transitions } = mockViewTransitions();
  toggleThemeMode();
  toggleThemeMode();

  expect(transitions[0].skip).toHaveBeenCalledOnce();
  transitions[0].update();
  expect(localStorage.getItem("theme")).toBeNull();
  transitions[1].update();
  expect(localStorage.getItem("theme")).toBe("light");

  transitions[0].finish();
  await Promise.resolve();
  expect(document.documentElement).toHaveClass("theme-switching");
  transitions[1].finish();
  await Promise.resolve();
  expect(document.documentElement).not.toHaveClass("theme-switching");
});

it("switches immediately for reduced motion even when view transitions are available", () => {
  const { start } = mockViewTransitions();
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
  setThemeMode("dark");
  expect(start).not.toHaveBeenCalled();
  expect(getThemeMode()).toBe("dark");
  finishFrame();
  expect(document.documentElement).not.toHaveClass("theme-switching");
});

it("still changes theme if the browser cannot start the fade", () => {
  Object.defineProperty(document, "startViewTransition", {
    value: () => { throw new Error("Transition unavailable"); }, configurable: true,
  });
  setThemeMode("dark");
  expect(getThemeMode()).toBe("dark");
  finishFrame();
  expect(document.documentElement).not.toHaveClass("theme-switching");
});

it("does not animate when the selected theme is already active", () => {
  const { start } = mockViewTransitions();
  setThemeMode("light");
  expect(start).not.toHaveBeenCalled();
  expect(document.documentElement).not.toHaveClass("theme-switching");
});
