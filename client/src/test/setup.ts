import "@testing-library/jest-dom";
import { vi } from "vitest";

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
