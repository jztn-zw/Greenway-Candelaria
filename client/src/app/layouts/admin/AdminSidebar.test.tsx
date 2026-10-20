import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";

const viewport = vi.hoisted(() => ({ isMobile: true }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => viewport.isMobile }));
vi.mock("@/store/authStore", () => ({
  default: (selector: (state: { user: null; logout: () => Promise<void> }) => unknown) =>
    selector({ user: null, logout: async () => undefined }),
}));

function SidebarState() {
  const { openMobile, setOpenMobile, state } = useSidebar();
  const location = useLocation();
  return <>
    <button onClick={() => setOpenMobile(true)}>Open mobile sidebar</button>
    <output data-testid="mobile-state">{String(openMobile)}</output>
    <output data-testid="desktop-state">{state}</output>
    <output data-testid="pathname">{location.pathname}</output>
  </>;
}

function renderSidebar(path = "/admin") {
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SidebarProvider><SidebarState /><AdminSidebar /></SidebarProvider>
    </MemoryRouter>,
  );
  if (viewport.isMobile) fireEvent.click(screen.getByRole("button", { name: "Open mobile sidebar" }));
}

let navigationTime = 1000;
beforeEach(() => {
  viewport.isMobile = true;
  // Each test starts outside the shared navigation link's rapid-click cooldown.
  navigationTime += 1000;
  vi.spyOn(performance, "now").mockReturnValue(navigationTime);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each([
  ["Dashboard", "/admin"],
  ["Community Posts", "/admin/posts"],
  ["Announcements", "/admin/announcements"],
  ["Event Management", "/admin/schedule"],
  ["Route Manager", "/admin/routes"],
  ["Barangay Management", "/admin/barangays"],
  ["Resident Management", "/admin/residents"],
  ["Collector Management", "/admin/drivers"],
  ["Waste Reports Management", "/admin/reports"],
  ["Live Truck Tracking", "/admin/tracking"],
  ["Analytics", "/admin/analytics"],
  ["Audit Logs", "/admin/audit-logs"],
  ["Notifications", "/admin/notifications"],
])("closes the mobile sidebar when selecting %s, including the current page", (name, path) => {
  renderSidebar(path);
  fireEvent.click(screen.getByRole("link", { name }));
  expect(screen.getByTestId("mobile-state")).toHaveTextContent("false");
  expect(screen.getByTestId("pathname")).toHaveTextContent(path);
});

it("closes the mobile sidebar when selecting the dashboard logo", () => {
  renderSidebar("/admin/reports");
  fireEvent.click(screen.getByTitle("Go to Admin Dashboard"));
  expect(screen.getByTestId("mobile-state")).toHaveTextContent("false");
  expect(screen.getByTestId("pathname")).toHaveTextContent(/^\/admin$/);
});

it("navigates to another module and closes the mobile sidebar", () => {
  renderSidebar();
  fireEvent.click(screen.getByRole("link", { name: "Waste Reports Management" }));
  expect(screen.getByTestId("mobile-state")).toHaveTextContent("false");
  expect(screen.getByTestId("pathname")).toHaveTextContent("/admin/reports");
});

it.each(["Profile", "Settings"])("closes the mobile sidebar after navigating to %s", (name) => {
  renderSidebar();
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  const buttons = screen.getAllByRole("button", { name });
  fireEvent.click(buttons[buttons.length - 1]);
  expect(screen.getByTestId("mobile-state")).toHaveTextContent("false");
  expect(screen.getByTestId("pathname")).toHaveTextContent(`/admin/${name.toLowerCase()}`);
});

it("keeps the sidebar open while expanding groups and opening the account menu", () => {
  renderSidebar();
  fireEvent.click(screen.getByRole("button", { name: /Community content/i }));
  expect(screen.getByTestId("mobile-state")).toHaveTextContent("true");
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
  expect(screen.getByTestId("mobile-state")).toHaveTextContent("true");
});

it("keeps desktop navigation expanded", () => {
  viewport.isMobile = false;
  renderSidebar();
  fireEvent.click(screen.getByRole("link", { name: "Waste Reports Management" }));
  expect(screen.getByTestId("pathname")).toHaveTextContent("/admin/reports");
  expect(screen.getByTestId("desktop-state")).toHaveTextContent("expanded");
});
