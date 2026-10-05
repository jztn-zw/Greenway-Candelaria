import { act } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminTopbar from "./AdminTopbar";
import useAuthStore from "@/store/authStore";
import { fetchAllDrivers } from "@/services/trackingService";
import { fetchConversation, sendConversationMessage, fetchAdminUnreadMessages, markAdminMessagesAsRead } from "@/services/messengerService";

const mocks = vi.hoisted(() => ({ markAsRead: vi.fn(), notifications: [
  { id: "message-notice", ref_module: "driver-messages", ref_id: "collector", is_read: false },
  { id: "other-message", ref_module: "driver-messages", ref_id: "other", is_read: false },
  { id: "report", ref_module: "reports", ref_id: "report", is_read: false },
] }));
vi.mock("@/features/admin/notifications/useAdminNotifications", () => ({ default: () => ({
  notifications: mocks.notifications, unreadCount: 3, markAsRead: mocks.markAsRead,
  markAllAsRead: vi.fn(), isMutating: false,
}) }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ toggleSidebar: vi.fn() }) }));
vi.mock("@/hooks/useThemeMode", () => ({ useThemeMode: () => "dark" }));
vi.mock("@/services/trackingService", () => ({ fetchAllDrivers: vi.fn() }));
vi.mock("@/services/messengerService", () => ({ fetchConversation: vi.fn(), sendConversationMessage: vi.fn(), fetchAdminUnreadMessages: vi.fn(), markAdminMessagesAsRead: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: { id: "admin", role: "ADMIN" } as never, token: "test-token" });
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111" });
  vi.mocked(fetchAllDrivers).mockResolvedValue([
    { id: "collector", user_id: "collector-user", full_name: "Offline collector", account_status: "ACTIVE" },
  ]);
  vi.mocked(fetchConversation).mockResolvedValue({ items: [], target: null, nextCursor: null, unreadCount: 0 });
  vi.mocked(fetchAdminUnreadMessages).mockResolvedValue({ unreadCount: 402, byDriver: [{ driverId: "collector", unreadCount: 402 }] });
  vi.mocked(markAdminMessagesAsRead).mockResolvedValue(undefined);
  vi.mocked(sendConversationMessage).mockResolvedValue({ id: "sent", sender_role: "ADMIN", sender_name: "MENRO", message: "Please check in", is_read: false, created_at: "2026-10-05 01:00:00" });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function Page() {
  const navigate = useNavigate();
  return <><AdminTopbar /><button onClick={() => navigate("/admin/reports")}>Go to reports</button></>;
}
function mount(path = "/admin") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Page /></MemoryRouter></QueryClientProvider>);
  return client;
}

it("opens messaging from another admin page and sends to an offline, unassigned collector", async () => {
  mount("/admin/posts?action=create");
  const trigger = screen.getByRole("button", { name: "Collector messages" });
  await waitFor(() => expect(trigger).toHaveTextContent("402 unread collector messages"));
  expect(fetchAllDrivers).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  expect(mocks.markAsRead).not.toHaveBeenCalled();
  await waitFor(() => expect(fetchAllDrivers).toHaveBeenCalledTimes(1));
  fireEvent.keyDown(screen.getByLabelText("Collector"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "Offline collector" }));
  await screen.findByRole("textbox", { name: "Message collector" });
  fireEvent.change(screen.getByRole("textbox", { name: "Message collector" }), { target: { value: "Please check in" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send message" })); });
  expect(sendConversationMessage).toHaveBeenCalledWith("Please check in", expect.any(String), "collector");
  expect(mocks.markAsRead).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.click(screen.getByRole("button", { name: "Go to reports" }));
  fireEvent.click(screen.getByRole("button", { name: "Collector messages" }));
  expect(screen.getByLabelText("Collector")).toHaveTextContent("Offline collector");
});

it("provides retry when the collector list cannot load", async () => {
  vi.mocked(fetchAllDrivers).mockRejectedValueOnce(new Error("Offline"));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Collector messages" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load collectors");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(fetchAllDrivers).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});

it("opens a notification's exact conversation from any admin page", async () => {
  vi.mocked(fetchConversation).mockResolvedValue({ items: [{ id: "message", sender_role: "DRIVER", sender_name: "Offline collector", message: "Please assist", is_read: false, created_at: "2026-10-05 01:00:00" }], target: null, nextCursor: null, unreadCount: 0 });
  mount("/admin/reports?messageDriver=collector&message=message");
  expect(await screen.findByText("Please assist")).toBeTruthy();
  expect(mocks.markAsRead).not.toHaveBeenCalled();
  expect(document.querySelector('[data-message-id="message"]')?.className).toContain("ring-primary");
});

it("keeps the admin page interactive while the floating chat is open", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Collector messages" }));
  const panel = screen.getByRole("dialog", { name: "Collector messages" });
  expect(panel.getAttribute("aria-modal")).not.toBe("true");
  expect(document.querySelector(".gw-modal-overlay")).toBeNull();
  expect(panel).toHaveClass("admin-messenger-panel");
  fireEvent.click(screen.getByRole("button", { name: "Go to reports" }));
  expect(screen.getByRole("dialog", { name: "Collector messages" })).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Waste Reports");
  fireEvent.keyDown(panel, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Collector messages" }));
});

it("uses a multiline composer, keeps Shift+Enter for a new line, and sends with Enter", async () => {
  mount("/admin/reports?messageDriver=collector");
  const composer = await screen.findByRole("textbox", { name: "Message collector" });
  expect(composer.tagName).toBe("TEXTAREA");
  fireEvent.change(composer, { target: { value: "First line\nSecond line" } });
  fireEvent.keyDown(composer, { key: "Enter", shiftKey: true });
  expect(sendConversationMessage).not.toHaveBeenCalled();
  fireEvent.keyDown(composer, { key: "Enter", isComposing: true });
  expect(sendConversationMessage).not.toHaveBeenCalled();
  await act(async () => { fireEvent.keyDown(composer, { key: "Enter" }); });
  expect(sendConversationMessage).toHaveBeenCalledExactlyOnceWith("First line\nSecond line", expect.any(String), "collector");
  expect(composer).toHaveValue("");
  expect(composer).toHaveAttribute("maxlength", "1000");
});

it.each([1000, 1001])("enforces the 1,000-character limit for a %i-character draft", async (length) => {
  mount("/admin/reports?messageDriver=collector");
  const composer = await screen.findByRole("textbox", { name: "Message collector" });
  const text = "x".repeat(length);
  fireEvent.change(composer, { target: { value: text } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send message" })); });
  if (length === 1000) {
    expect(sendConversationMessage).toHaveBeenCalledExactlyOnceWith(text, expect.any(String), "collector");
    expect(composer).toHaveValue("");
  } else {
    expect(sendConversationMessage).not.toHaveBeenCalled();
    expect(composer).toHaveValue(text);
  }
});
