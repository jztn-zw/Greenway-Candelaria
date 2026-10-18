import type { NotificationRow } from "./notificationsService";

export const browserNotificationDefaults = {
  enabled: false, reminders: true, collection: true, reports: true, community: true,
};
export type BrowserNotificationSettings = typeof browserNotificationDefaults;
export type BrowserNotificationField = keyof BrowserNotificationSettings;
const changedEvent = "greenway:resident-browser-notifications";
const storageKey = (userId: string) => `greenway:resident:browser-notifications:v1:${userId}`;

export function browserNotificationSnapshot(userId?: string) {
  try { return userId ? localStorage.getItem(storageKey(userId)) ?? "" : ""; }
  catch { return ""; }
}

export function readBrowserNotificationSettings(userId?: string): BrowserNotificationSettings {
  try {
    const saved = JSON.parse(browserNotificationSnapshot(userId) || "{}");
    return Object.fromEntries(Object.entries(browserNotificationDefaults).map(([key, value]) =>
      [key, typeof saved?.[key] === "boolean" ? saved[key] : value])) as BrowserNotificationSettings;
  } catch { return { ...browserNotificationDefaults }; }
}

export function saveBrowserNotificationSettings(userId: string, patch: Partial<BrowserNotificationSettings>) {
  const next = { ...readBrowserNotificationSettings(userId), ...patch };
  // Write before notifying React; a blocked store must not appear to save successfully.
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  window.dispatchEvent(new Event(changedEvent));
}

export function subscribeBrowserNotifications(listener: () => void) {
  window.addEventListener(changedEvent, listener);
  window.addEventListener("storage", listener);
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.removeEventListener(changedEvent, listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

export function browserNotificationPermission(): NotificationPermission | "unsupported" {
  try { return window.isSecureContext && "Notification" in window ? Notification.permission : "unsupported"; }
  catch { return "unsupported"; }
}

let worker: Promise<ServiceWorkerRegistration> | undefined;
async function notificationWorker() {
  if (!("serviceWorker" in navigator)) return undefined;
  if (!worker) {
    worker = navigator.serviceWorker.register("/resident-notifications-sw.js", { scope: "/resident/" }).then(async registration => {
      if (registration.active) return registration;
      const installing = registration.installing || registration.waiting;
      if (!installing) throw new Error("Browser notification setup failed. Please try again.");
      await new Promise<void>((resolve, reject) => {
        const finish = () => {
          if (installing.state !== "activated" && installing.state !== "redundant") return;
          clearTimeout(timer);
          installing.removeEventListener("statechange", finish);
          if (installing.state === "activated") resolve();
          else reject(new Error("Browser notification setup failed. Please try again."));
        };
        const timer = window.setTimeout(() => {
          installing.removeEventListener("statechange", finish);
          reject(new Error("Browser notification setup timed out. Please try again."));
        }, 6000);
        installing.addEventListener("statechange", finish);
        finish();
      });
      return registration;
    }).catch(error => { worker = undefined; throw error; });
  }
  return worker;
}

export async function enableBrowserNotifications() {
  const permission = browserNotificationPermission();
  if (permission === "unsupported") throw new Error("Browser notifications need HTTPS and a supported browser.");
  // Keep this call directly in the user gesture; no prompt runs during mounting or delivery.
  const result = permission === "granted" ? permission : await Notification.requestPermission();
  if (result !== "granted") throw new Error(result === "denied"
    ? "Notifications are blocked. Allow them in this browser’s site settings, then try again."
    : "Choose Allow in the browser prompt to enable browser notifications.");
  await notificationWorker();
}

const category: Record<NotificationRow["type"], Exclude<BrowserNotificationField, "enabled"> | "enabled"> = {
  COLLECTION_REMINDER: "reminders", TRUCK_IS_NEAR: "collection", COLLECTION_DONE: "collection",
  MISSED_COLLECTION: "collection", REPORT_UPDATE: "reports", NEW_POST: "community",
  ANNOUNCEMENT: "community", SYSTEM: "enabled",
};

/** Browser delivery supplements the inbox and never writes read receipts or phone preferences. */
export function createResidentBrowserDelivery(userId: string, isCurrent: () => boolean) {
  let disposed = false;
  const seen = new Set<string>();
  const displayed = new Set<Notification>();
  const allowed = (row: NotificationRow) => {
    const settings = readBrowserNotificationSettings(userId);
    return !disposed && isCurrent() && browserNotificationPermission() === "granted"
      && settings.enabled && settings[category[row.type]];
  };
  return {
    async deliver(value: unknown) {
      if (!value || typeof value !== "object") return;
      const row = value as NotificationRow;
      if (row.user_id !== userId || typeof row.id !== "string" || !row.id || !Object.prototype.hasOwnProperty.call(category, row.type)
        || seen.has(row.id) || !allowed(row)) return;
      seen.add(row.id);
      if (seen.size > 200) seen.delete(seen.values().next().value!);
      try {
        const registration = await notificationWorker();
        if (!allowed(row)) return;
        const options: NotificationOptions = {
          body: "Open GreenWay to view this update.", tag: `greenway-resident:${userId}:${row.id}`,
          data: { userId, url: "/resident/notifications" },
        };
        if (registration) {
          await registration.showNotification("GreenWay update", options);
          if (disposed || !isCurrent()) {
            const notifications = await registration.getNotifications({ tag: options.tag });
            notifications.forEach(notification => notification.close());
          }
        }
        else {
          const notification = new Notification("GreenWay update", options);
          displayed.add(notification);
          notification.onclose = () => displayed.delete(notification);
          notification.onclick = () => {
            notification.close();
            if (disposed || !isCurrent()) return;
            window.focus();
            window.location.assign("/resident/notifications");
          };
        }
      } catch { /* Display failures never interrupt authorized inbox delivery. */ }
    },
    dispose() {
      disposed = true;
      displayed.forEach(notification => notification.close());
      displayed.clear();
      // No registration/permission prompt is created during cleanup.
      if (worker) void worker.then(async registration => {
        const notifications = await registration.getNotifications();
        notifications.filter(notification => notification.data?.userId === userId).forEach(notification => notification.close());
      }).catch(() => { /* Notification cleanup is best effort after the session ends. */ });
    },
  };
}
