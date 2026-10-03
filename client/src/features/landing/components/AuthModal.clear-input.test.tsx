import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AuthModal from "./AuthModal";

vi.mock("@/services/barangaysService", () => ({
  fetchBarangays: vi.fn().mockResolvedValue([]),
  fetchBarangayStreets: vi.fn().mockResolvedValue({ streets: [] }),
}));

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each([
  { tab: "login" as const, id: "identifier", value: "resident" },
  { tab: "register" as const, id: "fullName", value: "Juan Dela Cruz" },
  { tab: "register" as const, id: "username", value: "resident" },
  { tab: "register" as const, id: "email", value: "resident@example.com" },
  { tab: "register" as const, id: "phone", value: "9123456789" },
])("clears $id without submitting or closing the form and restores input focus", async ({ tab, id, value }) => {
  const close = vi.fn();
  render(<MemoryRouter><AuthModal open onOpenChange={close} defaultTab={tab} /></MemoryRouter>);
  await screen.findByRole("dialog");
  const input = document.getElementById(id) as HTMLInputElement;
  const submit = vi.fn();
  input.closest("form")!.addEventListener("submit", submit);
  fireEvent.change(input, { target: { value } });
  expect(input.value).not.toBe("");
  const field = within(input.parentElement!);
  fireEvent.click(field.getByRole("button", { name: "Clear input" }));
  expect(input).toHaveValue("");
  expect(input).toHaveFocus();
  expect(field.queryByRole("button", { name: "Clear input" })).not.toBeInTheDocument();
  expect(submit).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});
