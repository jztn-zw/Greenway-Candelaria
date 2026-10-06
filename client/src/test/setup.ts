import "@testing-library/jest-dom";
import { vi,beforeEach } from "vitest";
import { syncServerClock } from "@/lib/serverClock";

// Standalone component tests receive a trusted time fixture, like app startup.
// Tests that choose a collection date explicitly resync to that fixture.
beforeEach(() => syncServerClock(new Date().toISOString(), performance.now()));

// The animation player needs browser canvas and visibility APIs that jsdom lacks.
vi.mock("@lottiefiles/dotlottie-react", () => ({ DotLottieReact: () => null }));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
