import { useEffect, useState, type PropsWithChildren } from "react";
import useAuthStore from "@/store/authStore";
import { BROWSER_SESSION_EVENT, BROWSER_SESSION_KEY, getBrowserSessionMarker, isTabSignedOut, readBrowserAuthSnapshot, readRememberedBrowserSnapshot, type BrowserAuthSnapshot } from "@/lib/authStorage";
import { SESSION_REPLACED_NOTICE } from "@/lib/sessionReplaced";

export default function BrowserSessionSync({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(() => isTabSignedOut() || !getBrowserSessionMarker()?.active || !!readBrowserAuthSnapshot());

  useEffect(() => {
    let active = true;
    let redirecting = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("greenway-auth");
    const send = (message: unknown) => channel?.postMessage(message);
    const requestSnapshot = () => send({ type: "request", markerId: getBrowserSessionMarker()?.id });
    const apply = (markerId: string, snapshot: BrowserAuthSnapshot | null) => {
      if (!active || redirecting || isTabSignedOut() || useAuthStore.getState().isSigningIn) return;
      const previous = useAuthStore.getState();
      if (!previous.syncBrowserSession(markerId, snapshot)) return;
      setReady(true);
      // A full navigation drops every previous account's local selection/cache;
      // drafts already saved under their account keys remain available.
      redirecting = true;
      if (!snapshot && getBrowserSessionMarker()?.reason === "replaced") sessionStorage.setItem(SESSION_REPLACED_NOTICE, "true");
      const home = snapshot?.user.role === "ADMIN" ? "/admin" : snapshot?.user.role === "DRIVER" ? "/collector" : snapshot ? "/resident" : "/login";
      window.location.replace(home);
    };
    const reconcile = () => {
      if (isTabSignedOut()) { setReady(true); return; }
      const marker = getBrowserSessionMarker();
      if (!marker || redirecting) { setReady(true); return; }
      const local = readBrowserAuthSnapshot();
      const current = useAuthStore.getState();
      if (!marker.active) {
        if (current.token && !current.isSigningIn) apply(marker.id, null);
        else setReady(true);
      } else if (local && local.token === current.token) setReady(true);
      else if (!current.isSigningIn) {
        const stored = readRememberedBrowserSnapshot();
        if (stored) apply(marker.id, stored);
        else {
          // No open temporary-session peer means there is nothing to restore.
          // Allow sign-in without persisting that peer's credentials.
          setReady(false);
          requestSnapshot();
          clearTimeout(timeout);
          timeout = setTimeout(() => { if (active) setReady(true); }, 600);
        }
      }
    };
    const changed = () => {
      if (isTabSignedOut()) { setReady(true); return; }
      const snapshot = readBrowserAuthSnapshot();
      if (snapshot) send({ type: "snapshot", snapshot });
      else send({ type: "changed" });
      reconcile();
    };
    if (channel) channel.onmessage = event => {
      const message = event.data;
      if (!message || typeof message !== "object") return;
      if (message.type === "request") {
        const snapshot = readBrowserAuthSnapshot();
        if (snapshot && snapshot.markerId === message.markerId) send({ type: "snapshot", snapshot });
      } else if (message.type === "snapshot") {
        const snapshot = message.snapshot as BrowserAuthSnapshot | undefined;
        if (!snapshot || typeof snapshot !== "object" || snapshot.markerId !== getBrowserSessionMarker()?.id) return;
        if (snapshot.token !== useAuthStore.getState().token || !readBrowserAuthSnapshot()) apply(snapshot.markerId, snapshot);
      } else if (message.type === "changed") reconcile();
    };
    const storage = (event: StorageEvent) => { if (event.key === BROWSER_SESSION_KEY || event.key === null) reconcile(); };
    const visible = () => { if (!document.hidden) reconcile(); };
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (previous.isSigningIn && !state.isSigningIn) changed();
    });
    window.addEventListener(BROWSER_SESSION_EVENT, changed);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    reconcile();
    return () => {
      active = false;
      clearTimeout(timeout);
      unsubscribe();
      channel?.close();
      window.removeEventListener(BROWSER_SESSION_EVENT, changed);
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  return ready ? children : null;
}
