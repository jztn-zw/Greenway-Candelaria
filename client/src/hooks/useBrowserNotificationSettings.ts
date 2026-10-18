import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import useAuthStore from "@/store/authStore";
import { browserNotificationPermission, browserNotificationSnapshot, enableBrowserNotifications,
  readBrowserNotificationSettings, saveBrowserNotificationSettings, subscribeBrowserNotifications,
  type BrowserNotificationField } from "@/services/residentBrowserNotifications";

export function useBrowserNotificationSettings() {
  const userId = useAuthStore(state => state.user?.id);
  const token = useAuthStore(state => state.token);
  useSyncExternalStore(subscribeBrowserNotifications, () => browserNotificationSnapshot(userId), () => "");
  const permission = useSyncExternalStore(subscribeBrowserNotifications, browserNotificationPermission, () => "unsupported" as const);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const pending = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setError(""); setBusy(false); pending.current = false; }, [userId, token]);
  const current = () => {
    const owner = useAuthStore.getState();
    return mounted.current && owner.user?.id === userId && owner.user?.role === "RESIDENT" && owner.token === token;
  };
  const update = async (field: BrowserNotificationField, enabled: boolean) => {
    if (!userId || !current() || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      if (field === "enabled" && enabled) await enableBrowserNotifications();
      if (!current()) return;
      saveBrowserNotificationSettings(userId, { [field]: enabled });
    } catch (cause) {
      if (current()) setError(cause instanceof Error ? cause.message : "Could not save browser notification preferences.");
    } finally {
      if (current()) { pending.current = false; setBusy(false); }
    }
  };
  return { settings: readBrowserNotificationSettings(userId), permission, busy, error, update };
}
