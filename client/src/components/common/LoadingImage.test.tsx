import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import LoadingImage from "./LoadingImage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("keeps partial images hidden until decoding finishes", async () => {
  let finishDecode!: () => void;
  render(<LoadingImage src="/photo.jpg" alt="Collection photo" />);
  const image = screen.getByRole("img", { name: "Collection photo" });
  Object.defineProperty(image, "naturalWidth", { value: 800 });
  Object.defineProperty(image, "decode", { value: () => new Promise<void>((resolve) => { finishDecode = resolve; }) });
  fireEvent.load(image);
  expect(image).toHaveStyle({ opacity: "0" });
  expect(screen.getByRole("status", { name: "Loading image" })).toBeInTheDocument();
  await act(async () => { finishDecode(); });
  expect(image).toHaveAttribute("data-ready", "true");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("does not reveal an old image after the source changes", async () => {
  let finishOldDecode!: () => void;
  const { rerender } = render(<LoadingImage src="/old.jpg" alt="Photo" />);
  const oldImage = screen.getByRole("img", { name: "Photo" });
  Object.defineProperty(oldImage, "naturalWidth", { value: 800 });
  Object.defineProperty(oldImage, "decode", { value: () => new Promise<void>((resolve) => { finishOldDecode = resolve; }) });
  fireEvent.load(oldImage);
  rerender(<LoadingImage src="/new.jpg" alt="Photo" />);
  await act(async () => { finishOldDecode(); });
  expect(screen.getByRole("img", { name: "Photo" })).toHaveStyle({ opacity: "0" });
  expect(screen.getByRole("status")).toBeInTheDocument();
});

it("reveals images already loaded from the cache", async () => {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(800);
  render(<LoadingImage src="/cached.jpg" alt="Cached photo" />);
  await waitFor(() => expect(screen.getByRole("img")).toHaveAttribute("data-ready", "true"));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("shows a fallback and preserves the caller's error handler", () => {
  const onError = vi.fn();
  render(<LoadingImage src="/broken.jpg" alt="Evidence" onError={onError} />);
  fireEvent.error(screen.getByRole("img", { name: "Evidence" }));
  expect(screen.getByRole("img", { name: "Evidence unavailable" })).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(onError).toHaveBeenCalledOnce();
});

it("ends loading if decoding fails", async () => {
  render(<LoadingImage src="/invalid.jpg" alt="Invalid photo" />);
  const image = screen.getByRole("img", { name: "Invalid photo" });
  Object.defineProperty(image, "decode", { value: () => Promise.reject(new Error("Invalid image")) });
  fireEvent.load(image);
  await waitFor(() => expect(screen.getByRole("img", { name: "Invalid photo unavailable" })).toBeInTheDocument());
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
