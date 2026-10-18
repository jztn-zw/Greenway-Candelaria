import { act, cleanup, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { saveBrowserNotificationSettings } from "@/services/residentBrowserNotifications";
import ResidentLiveSync from "./ResidentLiveSync";

const mocks = vi.hoisted(() => ({ changed: vi.fn(), reconcile: vi.fn(), dispose: vi.fn(),
  listeners: new Map<string, (row?: unknown) => void>() }));
vi.mock("socket.io-client", () => ({ io: () => ({
  on: (name: string, handler: (row?: unknown) => void) => mocks.listeners.set(name, handler),
  emit() {}, connect() {}, disconnect() {},
}) }));
vi.mock("@/lib/residentQuery", () => ({ useResidentQuery: () => ({}) }));
vi.mock("@/lib/adminRealtime", () => ({ createResidentRealtime: () => mocks }));
let client: QueryClient;
const notices: { close: ReturnType<typeof vi.fn> }[] = [];
beforeEach(() => {
  vi.clearAllMocks(); mocks.listeners.clear(); notices.length = 0; localStorage.clear();
  vi.stubGlobal("isSecureContext", true); vi.stubGlobal("navigator", {});
  vi.stubGlobal("Notification", class { static permission = "granted"; close = vi.fn(); constructor() { notices.push(this); } });
  useAuthStore.setState({ user: { id: "resident-a", role: "RESIDENT" } as never, token: "fixture" });
  client = new QueryClient();
});
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
const mount = () => render(<QueryClientProvider client={client}><ResidentLiveSync /></QueryClientProvider>);
const notice = { id: "notification-a", user_id: "resident-a", type: "REPORT_UPDATE" };

it("the inbox refreshes even when browser alerts or a category are off", async () => {
  mount();
  await act(async () => mocks.listeners.get("notification:new")!(notice));
  expect(mocks.changed).toHaveBeenCalledWith(["notifications"]);
  expect(notices).toHaveLength(0);
  saveBrowserNotificationSettings("resident-a", { enabled: true, reports: false });
  await act(async () => mocks.listeners.get("notification:new")!({ ...notice, id: "second" }));
  expect(mocks.changed).toHaveBeenCalledTimes(2);
  expect(notices).toHaveLength(0);
});

it("browser delivery respects ownership and account changes without changing other live subscriptions", async () => {
  saveBrowserNotificationSettings("resident-a", { enabled: true });
  mount();
  const previousHandler = mocks.listeners.get("notification:new")!;
  await act(async () => previousHandler({ ...notice, user_id: "someone-else" }));
  expect(notices).toHaveLength(0);
  await act(async () => previousHandler(notice));
  expect(notices).toHaveLength(1);
  act(() => useAuthStore.setState({ user: { id: "resident-b", role: "RESIDENT" } as never, token: "new-session" }));
  expect(notices[0].close).toHaveBeenCalled();
  await act(async () => previousHandler({ ...notice, id: "late" }));
  expect(notices).toHaveLength(1);
  expect(mocks.listeners.has("resident:data-changed")).toBe(true);
});
