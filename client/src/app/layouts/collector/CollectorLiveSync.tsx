import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import useAuthStore from "@/store/authStore";
import { createQueryRealtime } from "@/lib/adminRealtime";
import type { NotificationRow } from "@/services/notificationsService";

const CollectorLiveSync = () => {
  const client = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const token = useAuthStore((state) => state.token);
  useEffect(() => {
    if (!userId || !token) return;
    const sync = createQueryRealtime(client, userId, () => !document.hidden, "collector", ["profile", "routes", "history", "schedule", "notifications", "messenger"], [], ["notifications"]);
    const socket = io((import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin).replace(/\/api\/?$/, ""), { auth: { token }, withCredentials: true, autoConnect: false });
    socket.on("connect", () => { socket.emit("notifications:join_user"); socket.emit("collector:subscribe"); });
    socket.on("collector:ready", sync.reconcile);
    socket.on("collector:data-changed", (payload: { domains?: string[] }) => {
      const domains = payload?.domains;
      if (!Array.isArray(domains)) return;
      if (domains.includes("schedule")) sync.changed(["schedule"]);
      if (domains.some((domain) => ["routes", "drivers", "trucks", "barangays"].includes(domain))) sync.changed(["profile", "routes", "history"]);
    });
    socket.on("notification:new", (row: NotificationRow) => {
      if (row.user_id !== userId) return;
      sync.changed(["notifications"]);
      if (row.ref_module === "driver-messages") sync.changed(["messenger"]);
      if (["routes", "tracking", "trucks", "drivers"].includes(row.ref_module ?? "")) sync.changed(["profile", "routes", "history"]);
    });
    socket.on("notification:remove_ref", () => sync.changed(["notifications"]));
    socket.on("notification:update_ref", () => sync.changed(["notifications"]));
    const visible = () => { if (!document.hidden) sync.reconcile(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    const timer = setTimeout(() => socket.connect(), 0);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", visible); sync.dispose(); socket.disconnect(); };
  }, [client, userId, token]);
  return null;
};
export default CollectorLiveSync;
