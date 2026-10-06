import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { AdminMessenger } from "./AdminMessenger";
import { fetchConversation, markAdminMessagesAsRead } from "@/services/messengerService";
vi.mock("@/services/messengerService", () => ({ fetchConversation: vi.fn(), sendConversationMessage: vi.fn(), markAdminMessagesAsRead: vi.fn() }));
let visible!: IntersectionObserverCallback;
beforeEach(() => {
  vi.resetAllMocks(); useAuthStore.setState({ user: { id: "admin", role: "ADMIN" } as never, token: "session" });
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("IntersectionObserver", class { constructor(callback: IntersectionObserverCallback) { visible = callback; } observe() {} disconnect() {} });
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.mocked(fetchConversation).mockResolvedValue({ items: [{ id: "incoming", sender_role: "DRIVER", sender_name: "Collector", message: "Please assist", is_read: false, created_at: "2026-10-05 01:00:00" }], unreadCount: 1, target: null, nextCursor: null });
  vi.mocked(markAdminMessagesAsRead).mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={["/admin?messageDriver=collector"]}><AdminMessenger drivers={[]} /></MemoryRouter></QueryClientProvider>);
const view = async () => { await act(async () => { visible([{ target: document.querySelector('[data-message-id="incoming"]')!, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], {} as IntersectionObserver); }); };
it("does not mark a message read until its bubble is visible", async () => {
  mount(); await screen.findByText("Please assist"); expect(markAdminMessagesAsRead).not.toHaveBeenCalled();
  expect(typeof visible).toBe("function");
  await view(); expect(markAdminMessagesAsRead).toHaveBeenCalledWith("collector", ["incoming"]);
});
it("keeps hidden-tab messages unread", async () => {
  mount(); await screen.findByText("Please assist"); vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await view(); expect(markAdminMessagesAsRead).not.toHaveBeenCalled();
});
it("allows a failed read receipt to retry instead of permanently acknowledging it", async () => {
  vi.mocked(markAdminMessagesAsRead).mockRejectedValueOnce(new Error("Offline"));
  mount(); await screen.findByText("Please assist"); await view();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  await view(); expect(markAdminMessagesAsRead).toHaveBeenCalledTimes(2);
});
