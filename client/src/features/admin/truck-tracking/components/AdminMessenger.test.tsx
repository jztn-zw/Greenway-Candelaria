import useAuthStore from "@/store/authStore";
import { act, fireEvent, render, screen } from "@/components/messenger/testUtils";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { AdminMessenger } from "./AdminMessenger";
import { fetchConversation, sendConversationMessage } from "@/services/messengerService";
import { getAdminNotificationDestination } from "@/features/admin/notifications/notificationPresentation";
vi.mock("@/services/messengerService", () => ({ fetchConversation: vi.fn(), sendConversationMessage: vi.fn() }));
beforeEach(() => {
  useAuthStore.setState({ user: { id: "test-user", role: "ADMIN" } as never, token: "test-session" });
  vi.clearAllMocks(); Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.mocked(fetchConversation).mockResolvedValue({ items: [{ id: "message", sender_role: "DRIVER", sender_name: "Collector Ana", message: "Truck needs assistance", is_read: false, created_at: "2026-09-28 01:00:00" }], target: null, unreadCount: 0, nextCursor: null });
  vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111" });
});
afterEach(() => vi.unstubAllGlobals());
const drivers = [{ id: "driver", user_id: "collector", full_name: "Collector Ana", account_status: "ACTIVE" }];
const markNotificationAsRead = vi.fn(async (_id: string) => {});
const onConversationViewed = vi.fn();
const unreadMessageNotifications = new Map<string, string[]>();
const openCollector = async (driverId: string) => {
  await act(async () => { window.dispatchEvent(new CustomEvent("admin:open-messages", { detail: { driverId } })); });
};
const chooseCollector = async (name: string) => {
  await act(async () => { screen.getByLabelText("Collector").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })); });
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((item) => item.textContent === name);
  if (!option) throw new Error(`Collector option ${name} not found`);
  await act(async () => { option.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
};
it("admin notification links open the specific collector message without a route", async () => {
  const url = getAdminNotificationDestination({ id: "notice", user_id: "admin", type: "SYSTEM", title: "Message", body: "Help", is_read: false, created_at: "", ref_module: "driver-messages", metadata: { driver_id: "driver", message_id: "message" } })!;
  unreadMessageNotifications.set("driver", ["new-notification"]);
  await act(async () => { render(<MemoryRouter initialEntries={[url]}><AdminMessenger drivers={drivers} unreadMessageNotifications={unreadMessageNotifications} markNotificationAsRead={markNotificationAsRead} onConversationViewed={onConversationViewed} /></MemoryRouter>); });
  expect(screen.getByText("Truck needs assistance")).toBeTruthy();
  expect(markNotificationAsRead).toHaveBeenCalledWith("new-notification");
  expect(onConversationViewed).toHaveBeenCalledWith("driver", expect.objectContaining({ id: "message" }));
  expect(document.querySelector('[data-message-id="message"]')?.className).toContain("ring-primary");
  expect(fetchConversation).toHaveBeenCalledWith("driver", undefined);
});
it("admin can select an unassigned collector and reply without route data", async () => {
  await act(async () => { render(<MemoryRouter><AdminMessenger drivers={drivers} unreadMessageNotifications={new Map()} markNotificationAsRead={markNotificationAsRead} onConversationViewed={onConversationViewed} /></MemoryRouter>); });
  expect(screen.queryByRole("button", { name: "Collector messages" })).toBeNull();
  await openCollector("driver");
  vi.mocked(sendConversationMessage).mockResolvedValue({ id: "reply", sender_role: "ADMIN", sender_name: "Admin Maria", message: "We will assist", is_read: false, created_at: "2026-09-28 01:01:00" });
  fireEvent.change(screen.getByRole("textbox", { name: "Message collector" }), { target: { value: "We will assist" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send message" })); });
  expect(sendConversationMessage).toHaveBeenCalledWith("We will assist", expect.any(String), "driver");
  expect(screen.getByText("Admin Maria")).toBeTruthy();
});
it("changing collector discards the previous conversation and draft", async () => {
  await act(async () => { render(<MemoryRouter><AdminMessenger drivers={[...drivers, { ...drivers[0], id: "other", full_name: "Collector Ben" }]} unreadMessageNotifications={new Map()} markNotificationAsRead={markNotificationAsRead} onConversationViewed={onConversationViewed} /></MemoryRouter>); });
  await openCollector("driver");
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Private draft" } });
  vi.mocked(fetchConversation).mockResolvedValue({ items: [], target: null, unreadCount: 0, nextCursor: null });
  await chooseCollector("Collector Ben");
  expect(screen.queryByText("Truck needs assistance")).toBeNull();
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
});
it("acknowledges only the selected collector's new message notifications", async () => {
  const unread = new Map([["driver", ["first", "second"]], ["other", ["other-message"]]]);
  await act(async () => { render(<MemoryRouter><AdminMessenger drivers={drivers} unreadMessageNotifications={unread} markNotificationAsRead={markNotificationAsRead} onConversationViewed={onConversationViewed} /></MemoryRouter>); });
  await openCollector("driver");
  expect(markNotificationAsRead).toHaveBeenCalledTimes(2);
  expect(markNotificationAsRead).toHaveBeenCalledWith("first");
  expect(markNotificationAsRead).toHaveBeenCalledWith("second");
  expect(markNotificationAsRead).not.toHaveBeenCalledWith("other-message");
});
