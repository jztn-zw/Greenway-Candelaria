import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AnimatedSection from "./AnimatedSection";

let notifyIntersection: IntersectionObserverCallback;
let notifyPreference: (event: { matches: boolean }) => void;
const disconnect = vi.fn();

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { notifyIntersection = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.spyOn(window, "matchMedia").mockImplementation(() => ({
    matches: false,
    addEventListener: (_name: string, callback: typeof notifyPreference) => { notifyPreference = callback; },
    removeEventListener: vi.fn(),
  }) as unknown as MediaQueryList);
});

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); disconnect.mockClear(); });

const enterViewport = () => act(() => notifyIntersection([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

it("reveals a section once when it enters the viewport", () => {
  const { container } = render(<AnimatedSection><p>Collection guide</p></AnimatedSection>);
  const section = container.firstElementChild;
  expect(section).toHaveAttribute("data-revealed", "false");
  enterViewport();
  expect(section).toHaveAttribute("data-revealed", "true");
  act(() => notifyIntersection([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
  expect(section).toHaveAttribute("data-revealed", "true");
  expect(disconnect).toHaveBeenCalled();
});

it("shows keyboard-focused content immediately without waiting for scroll", () => {
  const { container } = render(<AnimatedSection delay={200}><a href="#contact">Contact MENRO</a></AnimatedSection>);
  fireEvent.focus(screen.getByRole("link", { name: "Contact MENRO" }));
  expect(container.firstElementChild).toHaveAttribute("data-revealed", "true");
});

it("clears a pending reveal when the section unmounts", () => {
  vi.useFakeTimers();
  const { unmount } = render(<AnimatedSection delay={200}><p>Collection guide</p></AnimatedSection>);
  enterViewport();
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("shows content when IntersectionObserver is unavailable", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  const { container } = render(<AnimatedSection><p>Collection guide</p></AnimatedSection>);
  expect(container.firstElementChild).toHaveAttribute("data-revealed", "true");
});

it("shows content immediately when reduced motion is enabled", () => {
  vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
  const { container } = render(<AnimatedSection delay={200}><p>Collection guide</p></AnimatedSection>);
  expect(container.firstElementChild).toHaveAttribute("data-revealed", "true");
});

it("cancels the delay when reduced motion is turned on", () => {
  vi.useFakeTimers();
  const { container } = render(<AnimatedSection delay={200}><p>Collection guide</p></AnimatedSection>);
  enterViewport();
  act(() => notifyPreference({ matches: true }));
  expect(container.firstElementChild).toHaveAttribute("data-revealed", "true");
  expect(vi.getTimerCount()).toBe(0);
});
