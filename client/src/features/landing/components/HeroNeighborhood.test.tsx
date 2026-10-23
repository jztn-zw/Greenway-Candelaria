import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import HeroNeighborhood from "./HeroNeighborhood";

const theme = vi.hoisted(() => ({ value: "light" }));
vi.mock("@/hooks/useThemeMode", () => ({ useThemeMode: () => theme.value }));
const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");

afterEach(() => {
  cleanup();
  theme.value = "light";
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalDecode);
  else Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
});

function controlDecoding() {
  const pending: { resolve: () => void; reject: () => void }[] = [];
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: () => new Promise<void>((resolve, reject) => pending.push({ resolve, reject: () => reject(new Error("Image unavailable")) })),
  });
  return pending;
}

it("reveals scenery, truck and labels together only after both images decode", async () => {
  const pending = controlDecoding();
  const { container } = render(<HeroNeighborhood><span>Collection Schedule</span></HeroNeighborhood>);
  const scene = container.firstElementChild;
  expect(scene).toHaveStyle({ visibility: "hidden" });
  expect(container.querySelectorAll("img")).toHaveLength(2);
  await act(async () => pending[0].resolve());
  expect(scene).toHaveStyle({ visibility: "hidden" });
  await act(async () => pending[1].resolve());
  expect(scene).toHaveStyle({ visibility: "visible" });
  expect(screen.getByText("Collection Schedule")).toBeVisible();
});

it("ignores stale decoding when the theme changes and releases the scene if an asset fails", async () => {
  const pending = controlDecoding();
  const { container, rerender } = render(<HeroNeighborhood />);
  theme.value = "dark";
  rerender(<HeroNeighborhood />);
  expect(container.querySelector("img")?.src).toContain("hero-neighborhood-night");
  await act(async () => { pending[0].resolve(); pending[1].resolve(); });
  expect(container.firstElementChild).toHaveStyle({ visibility: "hidden" });
  await act(async () => { pending[2].resolve(); pending[3].reject(); });
  expect(container.firstElementChild).toHaveStyle({ visibility: "visible" });
});

it("reveals already cached and decoded images without an artificial delay", async () => {
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: () => Promise.resolve() });
  const { container } = render(<HeroNeighborhood />);
  await act(async () => {});
  expect(container.firstElementChild).toHaveStyle({ visibility: "visible" });
});
