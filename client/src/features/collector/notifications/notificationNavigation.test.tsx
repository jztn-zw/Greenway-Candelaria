import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CollectorNotifications from "./CollectorNotifications";
import CollectorTopbar from "@/app/layouts/collector/CollectorTopbar";
import type { NotificationRow } from "@/services/notificationsService";
import { getManilaNow } from "@/utils/date";

const state = vi.hoisted(() => ({
  notifications: [] as NotificationRow[], recentNotifications: [] as NotificationRow[], unreadCount: 1,
  total: 1, isLoading: false, isMutating: false, category: "all" as const, error: null as string | null, nextCursor: null,
  loadMore: vi.fn(), fetchNotifications: vi.fn(), markAsRead: vi.fn(), markAllAsRead: vi.fn(), clearAll: vi.fn(),
}));
vi.mock("@/hooks/useNotifications", () => ({ default: () => state }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ toggleSidebar: vi.fn() }) }));
vi.mock("@/store/authStore", () => ({ default: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: "collector" } }) }));

const row: NotificationRow = { id: "notice", user_id: "collector", type: "SYSTEM", title: "Selected alert", body: "Original notification details", is_read: false, created_at: "2026-09-28 00:00:00" };
const Location = () => { const location = useLocation(); return <output data-location>{location.pathname}{location.search}</output>; };
let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const open = async (surface: "page" | "bell", notification: NotificationRow) => {
  state.notifications = [notification]; state.recentNotifications = [notification];
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/collector/notifications"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Location />{surface === "page" ? <CollectorNotifications /> : <CollectorTopbar />}
    </MemoryRouter>,
  ));
  if (surface === "bell") await act(async () => document.querySelector<HTMLButtonElement>('button[title="Notifications"]')!.click());
  await act(async () => [...document.querySelectorAll("button")].find(button => button.textContent?.includes(notification.title))!.click());
};

for (const surface of ["page", "bell"] as const) {
  it.each([
    ["truck assignment", { ref_module: "drivers", metadata: { destination: "profile" } }, "/collector/profile"],
    ["saved route run", { ref_module: "routes", ref_id: "template", metadata: { destination: "route-history", run_id: "older-run" } }, "/collector/route-history?route=older-run"],
    ["today's assigned route", { ref_module: "routes", metadata: { destination: "route-map", route_ids: ["assigned-template"] } }, "route-map"],
  ] as const)(`${surface} opens %s immediately`, async (_label, reference, target) => {
    const date = getManilaNow().dateKey;
    const notification = { ...row, ...reference, metadata: { ...reference.metadata, collection_date: date } };
    await open(surface, notification);
    expect(document.querySelector("[data-location]")?.textContent).toBe(target === "route-map" ? `/collector/route-map?date=${date}&template=assigned-template` : target);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(state.markAsRead).toHaveBeenCalledWith(row.id);
  });

  it.each(["selected", "legacy"])(`${surface} opens the %s dispatch conversation on click`, async kind => {
    const listener = vi.fn(); window.addEventListener("collector:open-messages", listener);
    try {
      await open(surface, { ...row, ref_module: "driver-messages", metadata: kind === "selected" ? JSON.stringify({ message_id: "specific-message", route_id: "specific-run" }) : null });
      expect(listener).toHaveBeenCalledOnce();
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual(kind === "selected" ? { messageId: "specific-message", routeId: "specific-run" } : { messageId: undefined, routeId: undefined });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    } finally { window.removeEventListener("collector:open-messages", listener); }
  });

  it.each([
    ["announcement", { type: "ANNOUNCEMENT", ref_module: "announcements" }],
    ["cancelled route", { ref_module: "routes", metadata: { destination: "notification" } }],
    ["old route alert", { ref_module: "routes", metadata: { destination: "route-map", collection_date: "2020-01-01", route_ids: ["old-template"] } }],
  ] as const)(`${surface} shows the original %s details when there is no current related page`, async (_label, reference) => {
    await open(surface, { ...row, ...reference, is_read: true });
    expect(document.querySelector("[data-location]")?.textContent).toBe("/collector/notifications");
    expect(document.querySelector('[role="dialog"]')).toHaveTextContent(row.body);
    expect(state.markAsRead).not.toHaveBeenCalled();
    if (surface === "bell") expect(document.querySelector('button[title="Notifications"]')).toHaveAttribute("aria-expanded", "false");
  });
}

it("keeps recent notifications visible and retries when the bell refresh fails", async () => {
  state.error = "Network Error";
  state.recentNotifications = [row];
  await act(async () => root.render(
    <MemoryRouter initialEntries={["/collector"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CollectorTopbar />
    </MemoryRouter>,
  ));
  await act(async () => document.querySelector<HTMLButtonElement>('button[title="Notifications"]')!.click());

  expect(document.querySelector('[role="status"]')).toHaveTextContent("Couldn't refresh notifications");
  expect([...document.querySelectorAll("button")].some(button => button.textContent?.includes(row.title))).toBe(true);
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent?.includes("Try again"))!.click());
  expect(state.fetchNotifications).toHaveBeenCalledOnce();
});
