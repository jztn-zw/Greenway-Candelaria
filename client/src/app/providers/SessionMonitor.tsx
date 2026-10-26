import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import useAuthStore from "@/store/authStore";
import api from "@/lib/api";
import { getAuthStorage, isBrowserSignInPending } from "@/lib/authStorage";
import { endReplacedSession, SESSION_REPLACED_MESSAGE, SESSION_REPLACED_NOTICE } from "@/lib/sessionReplaced";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function SessionMonitor() {
  const token = useAuthStore(state => state.token);
  const [notice, setNotice] = useState(() => sessionStorage.getItem(SESSION_REPLACED_NOTICE) === "true" && !getAuthStorage().getItem("token"));

  useEffect(() => {
    if (!token) return;
    let active = true;
    let checking = false;
    const request = new AbortController();
    const current = () => active && useAuthStore.getState().token === token && getAuthStorage().getItem("token") === token;
    const check = async () => {
      if (!current() || document.hidden || checking) return;
      checking = true;
      try { await api.get("/auth/session", { signal: request.signal }); }
      catch { /* The shared API handles 401; network failures retain the session. */ }
      finally { checking = false; }
    };
    const socket = io((import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin).replace(/\/api\/?$/, ""),
      { auth: { token }, withCredentials: true, autoConnect: false });
    socket.on("connect", () => { void check(); });
    socket.on("session:replaced", () => { if (current() && !useAuthStore.getState().isSigningIn && !isBrowserSignInPending()) endReplacedSession(token); });
    const reconcile = () => { void check(); };
    window.addEventListener("focus", reconcile);
    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", reconcile);
    const timer = window.setInterval(reconcile, 30_000);
    socket.connect();
    return () => {
      active = false;
      request.abort();
      clearInterval(timer);
      socket.disconnect();
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
    };
  }, [token]);

  const dismiss = () => {
    sessionStorage.removeItem(SESSION_REPLACED_NOTICE);
    setNotice(false);
  };

  return <AlertDialog open={notice} onOpenChange={open => { if (!open) dismiss(); }}>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Signed in Elsewhere</AlertDialogTitle><AlertDialogDescription>{SESSION_REPLACED_MESSAGE}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogAction onClick={dismiss}>Sign In Again</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
