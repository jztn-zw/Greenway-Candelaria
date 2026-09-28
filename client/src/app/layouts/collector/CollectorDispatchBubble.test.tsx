import useAuthStore from "@/store/authStore";
import { act, fireEvent, render, screen } from "@/components/messenger/testUtils";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CollectorDispatchBubble from "./CollectorDispatchBubble";
import { fetchConversation, sendConversationMessage, type ConversationPage, type WebMessage } from "@/services/messengerService";
import { markMyDriverMessagesAsRead } from "@/services/trackingService";
vi.mock("@/services/messengerService", () => ({ fetchConversation: vi.fn(), sendConversationMessage: vi.fn() }));
vi.mock("@/services/trackingService", () => ({ markMyDriverMessagesAsRead: vi.fn() }));
const message: WebMessage = { id: "message", route_id: "run", sender_role: "ADMIN", sender_name: "Admin Maria", message: "Dispatch instruction", is_read: false, created_at: "2026-09-28 01:00:00" };
const page = (items = [message], nextCursor: string | null = null): ConversationPage => ({ items, target: null, unreadCount: 402, nextCursor });
let visibleCallback: IntersectionObserverCallback;
class Observer {
  constructor(callback: IntersectionObserverCallback) { visibleCallback = callback; }
  observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn();
}
beforeEach(() => {
  useAuthStore.setState({ user: { id: "test-user", role: "DRIVER" } as never, token: "test-session" });
  vi.resetAllMocks(); vi.useFakeTimers();
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("IntersectionObserver", Observer);
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "11111111-1111-4111-8111-111111111111") });
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.mocked(fetchConversation).mockResolvedValue(page());
  vi.mocked(markMyDriverMessagesAsRead).mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const mount = async () => { await act(async () => { render(<CollectorDispatchBubble />); }); };
const open = async () => { await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Open MENRO messages/ })); }); };
const write = (text: string) => fireEvent.change(screen.getByRole("textbox", { name: "Message MENRO" }), { target: { value: text } });
it("shows the full unread count and never auto-opens or marks unseen messages read", async () => {
  await mount();
  expect(screen.getByRole("button", { name: "Open MENRO messages, 402 unread" })).toBeTruthy();
  vi.mocked(fetchConversation).mockResolvedValue(page([message, { ...message, id: "new" }]));
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(markMyDriverMessagesAsRead).not.toHaveBeenCalled();
});
it("opens selected notification messages and marks only visible rows read", async () => {
  await mount();
  await act(async () => { window.dispatchEvent(new CustomEvent("collector:open-messages", { detail: { messageId: "message" } })); });
  expect(screen.getByText("Admin Maria")).toBeTruthy();
  expect(markMyDriverMessagesAsRead).not.toHaveBeenCalled();
  const element = document.querySelector('[data-message-id="message"]')!;
  await act(async () => { visibleCallback([{ target: element, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], {} as IntersectionObserver); });
  expect(markMyDriverMessagesAsRead).toHaveBeenCalledWith(undefined, ["message"]);
  expect(element.className).toContain("ring-primary");
});
it("hidden tabs do not mark messages read", async () => {
  await mount(); await open();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => { visibleCallback([{ target: document.querySelector('[data-message-id="message"]')!, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], {} as IntersectionObserver); });
  expect(markMyDriverMessagesAsRead).not.toHaveBeenCalled();
});
it("failed sends keep the draft and reuse the request ID when retried", async () => {
  await mount(); await open(); write("Help please");
  vi.mocked(sendConversationMessage).mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce({ ...message, id: "saved", sender_role: "DRIVER", message: "Help please" });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send message" })); });
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("Help please");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send message" })); });
  const calls = vi.mocked(sendConversationMessage).mock.calls;
  expect(calls[0][1]).toBe(calls[1][1]);
  expect(screen.getAllByText("Help please")).toHaveLength(1);
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
});
it("a refresh arriving during send cannot duplicate or remove the saved row", async () => {
  await mount(); await open();
  let resolveFetch!: (value: ConversationPage) => void;
  vi.mocked(fetchConversation).mockImplementationOnce(() => new Promise((resolve) => { resolveFetch = resolve; }));
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  const saved = { ...message, id: "saved", sender_role: "DRIVER", message: "Assistance" };
  vi.mocked(sendConversationMessage).mockResolvedValue(saved); write("Assistance");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send message" })); });
  await act(async () => { resolveFetch(page()); });
  expect(screen.getAllByText("Assistance")).toHaveLength(1);
  vi.mocked(fetchConversation).mockResolvedValue(page([message, saved]));
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(screen.getAllByText("Assistance")).toHaveLength(1);
});
it("loads older pages and keeps them during latest-message refresh", async () => {
  vi.mocked(fetchConversation).mockResolvedValue(page([message], "older-cursor"));
  await mount(); await open();
  vi.mocked(fetchConversation).mockImplementation(async (_driver, params) => params?.cursor ? page([{ ...message, id: "old", message: "Earlier dispatch", created_at: "2026-09-27 01:00:00" }]) : page([message], "older-cursor"));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Load older messages" })); });
  expect(fetchConversation).toHaveBeenLastCalledWith(undefined, { cursor: "older-cursor" });
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(screen.getByText("Earlier dispatch")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Load older messages" })).toBeNull();
});
it("a missing old notification does not stop latest messages from loading", async () => {
  vi.mocked(fetchConversation).mockImplementation(async (_driver, params) => { if (params?.message_id) throw new Error("404"); return page(); });
  await mount();
  await act(async () => { window.dispatchEvent(new CustomEvent("collector:open-messages", { detail: { messageId: "missing" } })); });
  expect(screen.getByText("Dispatch instruction")).toBeTruthy();
  expect(screen.getByRole("alert").textContent).toContain("selected message");
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(screen.getByText("Dispatch instruction")).toBeTruthy();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry latest messages" })); });
  expect(screen.queryByRole("alert")).toBeNull();
});
it("shows loading instead of an empty conversation and limits the accessible composer", async () => {
  vi.mocked(fetchConversation).mockReturnValue(new Promise(() => {}));
  await mount(); await open();
  expect(screen.getByRole("status").textContent).toContain("Loading messages");
  expect(screen.queryByText("No messages yet.")).toBeNull();
  expect((screen.getByRole("textbox", { name: "Message MENRO" }) as HTMLInputElement).maxLength).toBe(255);
  expect(screen.getByRole("button", { name: "Send message" })).toBeTruthy();
});
it("unchanged background refresh does not force scrolling", async () => {
  await mount(); await open(); vi.mocked(Element.prototype.scrollIntoView).mockClear();
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
});

it("closing and reopening preserves an unsent draft", async () => {
  await mount(); await open(); write("Unsent assistance request");
  fireEvent.click(screen.getByRole("button", { name: "Close messages" }));
  await open();
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("Unsent assistance request");
});
it("local HTTP installations can safely send when randomUUID is unavailable", async () => {
  vi.stubGlobal("crypto", { getRandomValues: (values: Uint8Array) => { values.fill(7); return values; } });
  vi.mocked(sendConversationMessage).mockResolvedValue({ ...message, id: "saved", sender_role: "DRIVER", message: "Assistance" });
  await mount(); await open(); write("Assistance");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send message" })); });
  expect(sendConversationMessage).toHaveBeenCalledWith("Assistance", expect.stringMatching(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/), undefined);
});

it("pauses refreshes until all visible-message read requests finish", async () => {
  vi.mocked(fetchConversation).mockResolvedValue(page([message, { ...message, id: "second" }]));
  const finish: (() => void)[] = [];
  vi.mocked(markMyDriverMessagesAsRead).mockImplementation(() => new Promise<void>((resolve) => finish.push(resolve)));
  await mount(); await open();
  const before = vi.mocked(fetchConversation).mock.calls.length;
  await act(async () => { visibleCallback(["message", "second"].map((id) => ({ target: document.querySelector(`[data-message-id="${id}"]`)!, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry)), {} as IntersectionObserver); });
  expect(finish).toHaveLength(2);
  await act(async () => { finish[0](); await vi.advanceTimersByTimeAsync(15_000); });
  expect(fetchConversation).toHaveBeenCalledTimes(before);
  await act(async () => { finish[1](); });
  fireEvent.click(screen.getByRole("button", { name: "Close messages" }));
  expect(screen.getByRole("button", { name: "Open MENRO messages, 400 unread" })).toBeTruthy();
});
