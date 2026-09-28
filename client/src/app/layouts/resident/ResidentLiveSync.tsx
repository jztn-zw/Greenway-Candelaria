import { fetchProfile } from "@/services/profileService";
import { useResidentQuery } from "@/lib/residentQuery";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import useAuthStore from "@/store/authStore";
import { createResidentRealtime } from "@/lib/adminRealtime";

const ResidentLiveSync = () => {
  const client = useQueryClient();
  const profile = useResidentQuery("profile", ["me"], fetchProfile);
  useEffect(() => {
    const current = useAuthStore.getState().user;
    if (!profile.data || !current || profile.data.id !== current.id) return;
    useAuthStore.getState().setUser({ ...current, ...profile.data } as typeof current);
  }, [profile.data]);
  const userId = useAuthStore((state) => state.user?.id);
  const role = useAuthStore((state) => state.user?.role);
  const barangayId = useAuthStore((state) => state.user?.barangay_id);
  const scope = useAuthStore((state) => `${state.user?.barangay_id ?? ""}:${state.user?.street_id ?? ""}`);
  const token = useAuthStore((state) => state.token);
  useEffect(() => {
    if (!userId || !token || role !== "RESIDENT") return;
    const sync = createResidentRealtime(client, userId);
    const socket = io((import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || window.location.origin).replace(/\/api\/?$/, ""), {
      auth: { token }, withCredentials: true, autoConnect: false,
    });
    socket.on("connect", () => {
      socket.emit("notifications:join_user");
      if (barangayId) socket.emit("notifications:join_barangay", barangayId);
      socket.emit("resident:subscribe");
    });
    socket.on("resident:ready", sync.reconcile);
    socket.on("resident:data-changed", (payload: { domains?: unknown } | null) => {
      const domains = payload?.domains;
      sync.changed(domains);
      if (Array.isArray(domains) && domains.some((domain) => domain === "routes" || domain === "barangays")) sync.changed(["tracking"]);
    });
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
  }, [client, userId, role, token, scope, barangayId]);
  return null;
};
export default ResidentLiveSync;
