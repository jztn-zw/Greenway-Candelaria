import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { useBrowserNotificationSettings } from "./useBrowserNotificationSettings";
import { readBrowserNotificationSettings } from "@/services/residentBrowserNotifications";
import { toast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", {});
  useAuthStore.setState({ user: { id: "resident-a", role: "RESIDENT" } as never, token: "session-a" });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("a denied enable request leaves browser delivery off and exposes a recoverable error", async () => {
  const requestPermission = vi.fn().mockResolvedValue("denied");
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  const { result } = renderHook(useBrowserNotificationSettings);
  expect(requestPermission).not.toHaveBeenCalled();
  await act(async () => { await result.current.update("enabled", true); });
  expect(result.current.settings.enabled).toBe(false);
  expect(result.current.error).toMatch(/site settings/);
  expect(result.current.busy).toBe(false);
  expect(toast.error).toHaveBeenCalledWith("Could not save notification preferences", expect.objectContaining({ description: expect.stringMatching(/site settings/) }));
});

it("late permission responses cannot save to another account or a replaced session", async () => {
  for (const change of [{ user: { id: "resident-b", role: "RESIDENT" } as never, token: "session-b" }, { token: "replaced" }]) {
    useAuthStore.setState({ user: { id: "resident-a", role: "RESIDENT" } as never, token: "session-a" });
    let finish!: (value: NotificationPermission) => void;
    vi.stubGlobal("Notification", { permission: "default", requestPermission: () => new Promise(resolve => { finish = resolve; }) });
    const { result, unmount } = renderHook(useBrowserNotificationSettings);
    let pending!: Promise<void>;
    act(() => { pending = result.current.update("enabled", true); });
    act(() => useAuthStore.setState(change));
    await act(async () => { finish("granted"); await pending; });
    expect(readBrowserNotificationSettings("resident-a").enabled).toBe(false);
    expect(readBrowserNotificationSettings("resident-b").enabled).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
    unmount();
  }
});

it("failed persistence keeps the displayed preference unchanged", async () => {
  vi.stubGlobal("Notification", { permission: "granted" });
  const { result } = renderHook(useBrowserNotificationSettings);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("Storage blocked"); });
  await act(async () => { await result.current.update("enabled", true); });
  expect(result.current.settings.enabled).toBe(false);
  expect(result.current.error).toBe("Storage blocked");
});
