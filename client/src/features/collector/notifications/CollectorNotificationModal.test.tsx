import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import CollectorNotificationModal from "./CollectorNotificationModal";
import type { NotificationRow } from "@/services/notificationsService";
const auth = vi.hoisted(() => ({ id: "collector-A" }));
vi.mock("@/store/authStore", () => ({ default: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: auth.id } }) }));
const notification: NotificationRow = { id: "alert", user_id: "collector-A", type: "COLLECTION_DONE", title: "Collection finished", body: "Private collector A details", is_read: false, created_at: "2026-09-27 00:00:00" };
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  auth.id = "collector-A";
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });
const render = async () => { await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><CollectorNotificationModal notification={notification} open onOpenChange={() => {}} /></MemoryRouter>)); };
it("uses the API type and original body for notification details", async () => {
  await render(); const dialog = document.querySelector('[role="dialog"]');
  expect(dialog?.textContent).toContain("Collection Completed"); expect(dialog?.textContent).toContain(notification.body);
});
it("hides open details immediately when they belong to the previous account", async () => {
  await render(); auth.id = "collector-B"; await render();
  expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(document.body.textContent).not.toContain(notification.body);
});
