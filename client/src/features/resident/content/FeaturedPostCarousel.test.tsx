import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import FeaturedPostCarousel from "./FeaturedPostCarousel";
import type { PostItem } from "./types";

const first: PostItem = {
  id: "guide", title: "Sorting waste at home", body: "Separate recyclable waste before collection.",
  category: "WASTE_TIP", status: "PUBLISHED", is_featured: true, created_at: "2026-09-28T00:00:00Z",
  author_name: "MENRO Candelaria", view_count: 0, like_count: 0, is_liked: false, images: [], tags: [],
};
const second: PostItem = { ...first, id: "cleanup", title: "Barangay cleanup day", category: "EVENT" };

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const advance = (milliseconds = 7000) => act(() => vi.advanceTimersByTime(milliseconds));
const expectPost = (title: string) => expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(title);

it("advances automatically, wraps around, and opens the selected post without a pause button", () => {
  const open = vi.fn();
  render(<FeaturedPostCarousel posts={[first, second]} onOpenPost={open} />);
  advance();
  expectPost(second.title);
  expect(screen.queryByRole("button", { name: /pause|resume/i })).not.toBeInTheDocument();
  advance();
  expectPost(first.title);
  fireEvent.click(screen.getByRole("button", { name: "Read post" }));
  expect(open).toHaveBeenCalledExactlyOnceWith(first);
});

it("selects posts from the dots and updates the active dot without opening details", () => {
  const open = vi.fn();
  render(<FeaturedPostCarousel posts={[first, second]} onOpenPost={open} />);
  const firstDot = screen.getByRole("button", { name: `Show featured post 1: ${first.title}` });
  const secondDot = screen.getByRole("button", { name: `Show featured post 2: ${second.title}` });
  expect(firstDot).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(secondDot);
  expectPost(second.title);
  expect(secondDot).toHaveAttribute("aria-pressed", "true");
  expect(firstDot).toHaveAttribute("aria-pressed", "false");
  expect(open).not.toHaveBeenCalled();
});

it("pauses while hovered or focused and while the browser tab is hidden", () => {
  render(<FeaturedPostCarousel posts={[first, second]} onOpenPost={vi.fn()} />);
  const carousel = screen.getByRole("region", { name: "Featured community posts" });
  fireEvent.mouseEnter(carousel);
  advance();
  expectPost(first.title);
  fireEvent.mouseLeave(carousel);
  const title = screen.getByRole("button", { name: first.title });
  fireEvent.focus(title);
  advance();
  expectPost(first.title);
  fireEvent.blur(title, { relatedTarget: null });
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  fireEvent(document, new Event("visibilitychange"));
  advance();
  expectPost(first.title);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  fireEvent(document, new Event("visibilitychange"));
  advance();
  expectPost(second.title);
});

it("keeps manual navigation available without autoplay for reduced motion", () => {
  const original = window.matchMedia("(prefers-reduced-motion: reduce)");
  vi.spyOn(window, "matchMedia").mockReturnValue({ ...original, matches: true });
  render(<FeaturedPostCarousel posts={[first, second]} onOpenPost={vi.fn()} />);
  advance(21000);
  expectPost(first.title);
  expect(screen.queryByRole("button", { name: "Pause featured slideshow" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Next featured post" }));
  expectPost(second.title);
});

it("preserves the selected post through a refresh or reordering and recovers if it is removed", () => {
  const open = vi.fn();
  const view = render(<FeaturedPostCarousel posts={[first, second]} onOpenPost={open} />);
  fireEvent.click(screen.getByRole("button", { name: "Next featured post" }));
  view.rerender(<FeaturedPostCarousel posts={[{ ...second, body: "Updated cleanup details." }, { ...first }]} onOpenPost={open} />);
  expectPost(second.title);
  expect(screen.getByText("Updated cleanup details.")).toBeInTheDocument();
  view.rerender(<FeaturedPostCarousel posts={[first]} onOpenPost={open} />);
  expectPost(first.title);
  expect(screen.queryByRole("group", { name: "Featured post navigation" })).not.toBeInTheDocument();
  view.rerender(<FeaturedPostCarousel posts={[]} onOpenPost={open} />);
  expect(screen.queryByRole("region")).not.toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
});

it("selects photos without opening the post and resets the photo when changing posts", () => {
  const open = vi.fn();
  const gallery = { ...first, images: ["/first.jpg", "/second.jpg"] };
  render(<FeaturedPostCarousel posts={[gallery, second]} onOpenPost={open} />);
  fireEvent.click(screen.getByRole("button", { name: "Show photo 2" }));
  expect(screen.getByRole("img", { name: first.title })).toHaveAttribute("src", "/second.jpg");
  expect(open).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Next featured post" }));
  fireEvent.click(screen.getByRole("button", { name: "Previous featured post" }));
  expect(screen.getByRole("img", { name: first.title })).toHaveAttribute("src", "/first.jpg");
  advance(4000);
  expect(screen.getByRole("img", { name: first.title })).toHaveAttribute("src", "/second.jpg");
});

it("uses the shared themed placeholder when a featured photo fails", () => {
  render(<FeaturedPostCarousel posts={[{ ...first, images: ["/missing.jpg"] }]} onOpenPost={vi.fn()} />);
  fireEvent.error(screen.getByRole("img", { name: first.title }));
  expect(screen.getByRole("img", { name: `Placeholder image for ${first.title}` })).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: first.title })).not.toBeInTheDocument();
});
