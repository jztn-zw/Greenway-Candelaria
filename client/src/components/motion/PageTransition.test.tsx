import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PageTransition from "./PageTransition";

function Pages({ role }: { role: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <>
      <button onClick={() => navigate(`/${role}/notifications`)}>Next page</button>
      <button onClick={() => navigate(`${pathname}?filter=unread`)}>Change filter</button>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
      <main>
        <PageTransition><h1>{pathname}</h1></PageTransition>
      </main>
    </>
  );
}

function renderPages(role = "admin") {
  render(
    <MemoryRouter initialEntries={[`/${role}/reports`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Pages role={role} />
    </MemoryRouter>,
  );
  return screen.getByRole("main");
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(["admin", "resident", "collector"])("opens the next %s page at the top", (role) => {
  const main = renderPages(role);
  main.scrollTop = 640;
  main.scrollLeft = 30;
  vi.mocked(window.scrollTo).mockClear();

  fireEvent.click(screen.getByRole("button", { name: "Next page" }));

  expect(screen.getByRole("heading")).toHaveTextContent(`/${role}/notifications`);
  expect(main.scrollTop).toBe(0);
  expect(main.scrollLeft).toBe(0);
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
});

it("keeps the page position when only query parameters change", () => {
  const main = renderPages();
  main.scrollTop = 480;
  vi.mocked(window.scrollTo).mockClear();

  fireEvent.click(screen.getByRole("button", { name: "Change filter" }));

  expect(main.scrollTop).toBe(480);
  expect(window.scrollTo).not.toHaveBeenCalled();
});

it("resets on back and forward navigation between pages", () => {
  const main = renderPages();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  main.scrollTop = 500;
  vi.mocked(window.scrollTo).mockClear();

  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByRole("heading")).toHaveTextContent("/admin/reports");
  expect(main.scrollTop).toBe(0);
  expect(window.scrollTo).toHaveBeenCalledTimes(1);

  main.scrollTop = 350;
  fireEvent.click(screen.getByRole("button", { name: "Forward" }));
  expect(screen.getByRole("heading")).toHaveTextContent("/admin/notifications");
  expect(main.scrollTop).toBe(0);
  expect(window.scrollTo).toHaveBeenCalledTimes(2);
});
