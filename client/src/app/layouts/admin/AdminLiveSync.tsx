import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import useAuthStore from "@/store/authStore";
import { createAdminRealtime } from "@/lib/adminRealtime";

const AdminLiveSync = () => {
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const role = useAuthStore((state) => state.user?.role);
  const token = useAuthStore((state) => state.token);
  useEffect(() => {
    if (!userId || !token || role !== "ADMIN") return;
    const sync = createAdminRealtime(client, userId);
    const socket = io((import.meta.env.VITE_API_URL || window.location.origin).replace(/\/api\/?$/, ""), {
      auth: { token }, withCredentials: true, autoConnect: false,
    });
    socket.on("connect", () => {
      socket.emit("notifications:join_user");
      socket.emit("notifications:join_admins");
      socket.emit("admin:subscribe");
    });
    socket.on("admin:ready", sync.reconcile);
    socket.on("admin:data-changed", (payload: { domains?: unknown } | null) => sync.changed(payload?.domains));
    const refreshNotifications = () => sync.changed(["notifications"]);
    socket.on("notification:new", refreshNotifications);
    socket.on("notification:remove_ref", refreshNotifications);
    socket.on("notification:update_ref", refreshNotifications);
    const onVisible = () => { if (!document.hidden) sync.reconcile(); };
    document.addEventListener("visibilitychange", onVisible);
    const connectTimer = setTimeout(() => socket.connect(), 0);
    return () => {
      clearTimeout(connectTimer);
      document.removeEventListener("visibilitychange", onVisible);
      sync.dispose();
      socket.disconnect();
    };
  }, [client, userId, role, token]);
  return null;
};
export default AdminLiveSync;
