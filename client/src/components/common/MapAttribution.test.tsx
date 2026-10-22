import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MapAttribution from "./MapAttribution";

afterEach(() => { cleanup(); vi.useRealTimers(); });
it("shows the credit briefly, then keeps it available behind the info button", () => {
  vi.useFakeTimers(); render(<MapAttribution />);
  const button = screen.getByRole('button', { name: 'Map information' });
  expect(screen.getByRole('link', { name: 'OpenStreetMap contributors' })).toBeVisible();
  act(() => vi.advanceTimersByTime(5000));
  expect(button).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('link')).toBeNull();
  fireEvent.click(button);
  expect(screen.getByRole('link')).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
  expect(button).toHaveAttribute('aria-expanded', 'true');
});
it("does not close a credit panel the user has reopened", () => {
  vi.useFakeTimers(); render(<MapAttribution />);
  const button = screen.getByRole('button', { name: 'Map information' });
  fireEvent.click(button); fireEvent.click(button);
  act(() => vi.advanceTimersByTime(10000));
  expect(button).toHaveAttribute('aria-expanded', 'true');
});
