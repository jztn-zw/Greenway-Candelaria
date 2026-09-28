import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import CollectorLiveSync from "./CollectorLiveSync";
import { collectorKey } from "@/lib/collectorQuery";
const socket = vi.hoisted(() => ({ listeners: new Map<string, (value?: unknown) => void>(),
  on: vi.fn(), emit: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }));
vi.mock("socket.io-client", () => ({ io: () => socket }));
let client: QueryClient; let root: Root; let visible: boolean;
const cleanups: (() => void)[] = [];
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); socket.listeners.clear();
  socket.on.mockImplementation((name, handler) => { socket.listeners.set(name, handler); return socket; });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useAuthStore.setState({ user: { id: "collector", role: "DRIVER" } as never, token: "session" });
  visible = true; vi.spyOn(document, "hidden", "get").mockImplementation(() => !visible);
  client = new QueryClient(); root = createRoot(document.createElement("div"));
});
afterEach(() => { act(() => root.unmount()); cleanups.splice(0).forEach((cleanup) => cleanup()); client.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });
const observe = (domain: string) => {
  const key = collectorKey("collector", domain, "test"); client.setQueryData(key, 28);
  const read = vi.fn().mockResolvedValue(29);
  const observer = new QueryObserver(client, { queryKey: key, queryFn: read, staleTime: Infinity });
  cleanups.push(observer.subscribe(() => {})); return { key, read };
};
const mount = async () => { await act(async () => root.render(<QueryClientProvider client={client}><CollectorLiveSync /></QueryClientProvider>)); };
it("admin schedule events refresh only the relevant collector cache", async () => {
  const schedule = observe("schedule"); const messages = observe("messenger");
  const other = ["resident", "resident", "schedule"]; client.setQueryData(other, 9);
  await mount();
  await act(async () => { socket.listeners.get("collector:data-changed")!({ domains: ["schedule"] }); await vi.advanceTimersByTimeAsync(300); });
  expect(client.getQueryData(schedule.key)).toBe(29); expect(schedule.read).toHaveBeenCalledTimes(1);
  expect(messages.read).not.toHaveBeenCalled(); expect(client.getQueryState(other)?.isInvalidated).toBe(false);
});
it("messages from another account are ignored; own dispatch messages refresh notifications and chat only", async () => {
  const messages = observe("messenger"); const notices = observe("notifications"); const schedule = observe("schedule");
  await mount();
  await act(async () => { socket.listeners.get("notification:new")!({ user_id: "other", ref_module: "driver-messages" }); await vi.advanceTimersByTimeAsync(300); });
  expect(messages.read).not.toHaveBeenCalled();
  await act(async () => { socket.listeners.get("notification:new")!({ user_id: "collector", ref_module: "driver-messages" }); await vi.advanceTimersByTimeAsync(300); });
  expect(messages.read).toHaveBeenCalledTimes(1); expect(notices.read).toHaveBeenCalledTimes(1); expect(schedule.read).not.toHaveBeenCalled();
});
it("hidden tabs defer fallback reads and reconcile when visible", async () => {
  const notices = observe("notifications"); await mount(); visible = false;
  await act(async () => { await vi.advanceTimersByTimeAsync(60_300); }); expect(notices.read).not.toHaveBeenCalled();
  visible = true;
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); await vi.advanceTimersByTimeAsync(300); });
  expect(notices.read).toHaveBeenCalledTimes(1);
});
