import type { StateStorage } from "zustand/middleware";
import type { User } from "@/services/authService";

export const BROWSER_SESSION_KEY = "greenway-browser-session";
export const BROWSER_SESSION_EVENT = "greenway:browser-session";
const TAB_SESSION_KEY = "greenway-tab-session";
const TAB_SIGNED_OUT_KEY = "greenway-tab-signed-out";
const BROWSER_SIGNIN_KEY = "greenway-browser-signin";
const AUTH_KEYS = ["token", "user", "auth-storage"];

export interface BrowserSessionMarker {
  id: string;
  active: boolean;
  remembered: boolean;
  reason?: "logout" | "replaced";
}
export interface BrowserAuthSnapshot { markerId: string; token: string; user: User }

export const isTabSignedOut = () => sessionStorage.getItem(TAB_SIGNED_OUT_KEY) === "true";

// During a cross-tab switch, an old screen must not read or overwrite the new
// account's credentials before its in-memory store and query cache have changed.
const switchingStorage: Storage = {
  length: 0, clear() {}, getItem: () => null, key: () => null, removeItem() {}, setItem() {},
};

export function getBrowserSessionMarker(): BrowserSessionMarker | null {
  try {
    const value = JSON.parse(localStorage.getItem(BROWSER_SESSION_KEY) || "null");
    return value && typeof value.id === "string" && typeof value.active === "boolean" && typeof value.remembered === "boolean" ? value : null;
  } catch { return null; }
}

export const getAuthStorage = (): Storage => {
  if (isTabSignedOut()) return switchingStorage;
  const marker = getBrowserSessionMarker();
  if (!marker) return sessionStorage.getItem("token") ? sessionStorage : localStorage;
  if (!marker.active || marker.id !== sessionStorage.getItem(TAB_SESSION_KEY)) return switchingStorage;
  return marker.remembered ? localStorage : sessionStorage;
};

function removeCredentials(storage: Storage) {
  for (const key of AUTH_KEYS) storage.removeItem(key);
}

function publish(marker: BrowserSessionMarker) {
  sessionStorage.setItem(TAB_SESSION_KEY, marker.id);
  // Only a generation and persistence choice are shared persistently. Temporary
  // credentials are transferred directly between open tabs via BroadcastChannel.
  localStorage.setItem(BROWSER_SESSION_KEY, JSON.stringify(marker));
  window.dispatchEvent(new Event(BROWSER_SESSION_EVENT));
}

function nextSessionId() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() :
    Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join("-");
}

export function beginBrowserSignIn() {
  const id = nextSessionId();
  localStorage.setItem(BROWSER_SIGNIN_KEY, JSON.stringify({ id, startedAt: Date.now() }));
  return id;
}

export function finishBrowserSignIn(id: string) {
  try {
    if (JSON.parse(localStorage.getItem(BROWSER_SIGNIN_KEY) || "null")?.id === id) localStorage.removeItem(BROWSER_SIGNIN_KEY);
  } catch { /* An invalid handoff marker cannot change authentication. */ }
}

export function isBrowserSignInPending() {
  try {
    const started = JSON.parse(localStorage.getItem(BROWSER_SIGNIN_KEY) || "null")?.startedAt;
    const age = Date.now() - started;
    return Number.isFinite(started) && age >= 0 && age < 20_000;
  } catch { return false; }
}

export function saveBrowserAuthSession(token: string, user: User, remembered: boolean) {
  // Only a successful explicit sign-in can reopen a signed-out tab.
  sessionStorage.removeItem(TAB_SIGNED_OUT_KEY);
  removeCredentials(localStorage);
  removeCredentials(sessionStorage);
  const storage = remembered ? localStorage : sessionStorage;
  storage.setItem("token", token);
  storage.setItem("user", JSON.stringify(user));
  publish({ id: nextSessionId(), active: true, remembered });
}

export function signOutCurrentTab() {
  // Other tabs still use the shared server session; do not revoke it or remove
  // remembered credentials. This tab loses access immediately, even on reload.
  sessionStorage.setItem(TAB_SIGNED_OUT_KEY, "true");
  removeCredentials(sessionStorage);
  sessionStorage.removeItem(TAB_SESSION_KEY);
  window.dispatchEvent(new Event(BROWSER_SESSION_EVENT));
}

export const clearAuthStorage = (reason: "logout" | "replaced" = "logout") => {
  const marker = getBrowserSessionMarker();
  const ownsSession = !isTabSignedOut() && (!marker || marker.id === sessionStorage.getItem(TAB_SESSION_KEY));
  const hadToken = !!getAuthStorage().getItem("token");
  removeCredentials(sessionStorage);
  // A stale tab cannot log out a newer account while reconciling its own state.
  if (ownsSession) removeCredentials(localStorage);
  if (ownsSession && hadToken) publish({ id: nextSessionId(), active: false, remembered: false, reason });
  if (ownsSession || !marker?.active) {
    sessionStorage.setItem(TAB_SIGNED_OUT_KEY, "true");
    sessionStorage.removeItem(TAB_SESSION_KEY);
  }
};

function validUser(user: unknown): user is User {
  return !!user && typeof user === "object" && "id" in user && typeof user.id === "string" &&
    "role" in user && ["ADMIN", "DRIVER", "RESIDENT"].includes(String(user.role));
}

export function readBrowserAuthSnapshot(): BrowserAuthSnapshot | null {
  if (isTabSignedOut()) return null;
  const marker = getBrowserSessionMarker();
  if (!marker?.active || marker.id !== sessionStorage.getItem(TAB_SESSION_KEY)) return null;
  try {
    const storage = getAuthStorage();
    const token = storage.getItem("token");
    const user = JSON.parse(storage.getItem("user") || "null");
    return token && validUser(user) ? { markerId: marker.id, token, user } : null;
  } catch { return null; }
}

export function adoptBrowserAuthSnapshot(snapshot: BrowserAuthSnapshot) {
  if (isTabSignedOut()) return false;
  const marker = getBrowserSessionMarker();
  if (!marker?.active || marker.id !== snapshot.markerId || typeof snapshot.token !== "string" || !snapshot.token || !validUser(snapshot.user)) return false;
  removeCredentials(sessionStorage);
  const storage = marker.remembered ? localStorage : sessionStorage;
  storage.setItem("token", snapshot.token);
  storage.setItem("user", JSON.stringify(snapshot.user));
  sessionStorage.setItem(TAB_SESSION_KEY, marker.id);
  return true;
}

// New tabs may join this browser's active session. Remembered credentials can
// hydrate immediately; temporary credentials arrive only from an open peer.
// Explicit tab logout remains sticky, including on reload or a pasted URL.
const saved = getBrowserSessionMarker();
if (saved) {
  const hadTabSession = !!sessionStorage.getItem(TAB_SESSION_KEY);
  if (!saved.active) sessionStorage.setItem(TAB_SIGNED_OUT_KEY, "true");
  if (!saved.active || saved.remembered || sessionStorage.getItem(TAB_SESSION_KEY) !== saved.id) removeCredentials(sessionStorage);
  if ((saved.active && saved.remembered && !isTabSignedOut()) || (hadTabSession && !saved.active))
    sessionStorage.setItem(TAB_SESSION_KEY, saved.id);
} else if (sessionStorage.getItem("token") || localStorage.getItem("token")) {
  publish({ id: nextSessionId(), active: true, remembered: !sessionStorage.getItem("token") });
} else {
  sessionStorage.setItem(TAB_SIGNED_OUT_KEY, "true");
}

export function readRememberedBrowserSnapshot(): BrowserAuthSnapshot | null {
  if (isTabSignedOut()) return null;
  const marker = getBrowserSessionMarker();
  if (!marker?.active || !marker.remembered) return null;
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return token && validUser(user) ? { markerId: marker.id, token, user } : null;
  } catch {
    return null;
  }
}

export const authStateStorage: StateStorage = {
  getItem: (name) => getAuthStorage().getItem(name),
  setItem: (name, value) => getAuthStorage().setItem(name, value),
  removeItem: (name) => getAuthStorage().removeItem(name),
};
