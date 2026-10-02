import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import PaginationControls from "./PaginationControls";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hosts: HTMLDivElement[] = [];
afterEach(() => hosts.splice(0).forEach((host) => host.remove()));

it.each(["table", "floating", "inline"] as const)("keeps %s pagination usable without a count summary", (variant) => {
  const host = document.createElement("div");
  hosts.push(host);
  document.body.appendChild(host);
  const root = createRoot(host);
  const onPageChange = vi.fn();
  const render = (currentPage: number, totalPages = 8) => act(() => root.render(
    <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} variant={variant} />,
  ));

  render(3);
  const nav = host.querySelector('nav[aria-label="Pagination"]')!;
  expect(nav.textContent).not.toMatch(/Showing|Page \d+ of/);
  expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe("3");
  act(() => (nav.querySelector('[aria-label="Next page"]') as HTMLButtonElement).click());
  expect(onPageChange).toHaveBeenLastCalledWith(4);
  act(() => (nav.querySelector('[aria-label="Previous page"]') as HTMLButtonElement).click());
  expect(onPageChange).toHaveBeenLastCalledWith(2);

  render(8);
  expect((host.querySelector('[aria-label="Next page"]') as HTMLButtonElement).disabled).toBe(true);
  render(1);
  expect((host.querySelector('[aria-label="Previous page"]') as HTMLButtonElement).disabled).toBe(true);
  render(1, 1);
  expect(host.querySelector('nav[aria-label="Pagination"]')).toBeNull();
  act(() => root.unmount());
});
