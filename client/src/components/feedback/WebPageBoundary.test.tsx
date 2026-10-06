import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import WebPageBoundary from "./WebPageBoundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("reopens the page when the underlying render problem is gone", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  let shouldFail = true;
  let attempts = 0;
  const Page = () => {
    attempts += 1;
    if (shouldFail) throw new Error("Temporary render failure");
    return <h1>Page recovered</h1>;
  };

  render(<MemoryRouter initialEntries={["/resident/profile"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <WebPageBoundary><Page /></WebPageBoundary>
  </MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
  const failedAttempts = attempts;

  shouldFail = false;
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(attempts).toBeGreaterThan(failedAttempts);
  expect(screen.getByRole("heading", { name: "Page recovered" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Something went wrong" })).toBeNull();
});

it("reports that a retry happened when the page fails again", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  let attempts = 0;
  const Page = () => {
    attempts += 1;
    throw new Error("Persistent render failure");
  };

  render(<MemoryRouter initialEntries={["/resident/profile"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <WebPageBoundary><Page /></WebPageBoundary>
  </MemoryRouter>);
  const failedAttempts = attempts;

  fireEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(attempts).toBeGreaterThan(failedAttempts);
  expect(screen.getByText("The page still couldn't open. Please try again in a moment.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
});
