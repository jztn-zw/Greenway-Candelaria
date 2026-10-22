import { useEffect } from "react";
import { toast } from "@/lib/toast";

const ConnectionStatus = () => {
  useEffect(() => {
    let online = navigator.onLine;
    const warnOffline = () => toast.warning("You’re offline", {
      id: "connection-status",
      duration: Infinity,
      description: "Some actions may be unavailable. Check your internet connection.",
    });
    const update = () => {
      const connected = navigator.onLine;
      if (connected === online) return;
      online = connected;
      if (!connected) warnOffline();
      else toast.success("Back online", {
        id: "connection-status",
        duration: 4200,
        description: "Your connection is restored. You can try your action again.",
      });
    };
    if (!online) warnOffline();
    window.addEventListener("offline", update);
    window.addEventListener("online", update);
    return () => {
      window.removeEventListener("offline", update);
      window.removeEventListener("online", update);
      toast.dismiss("connection-status");
    };
  }, []);
  return null;
};

export default ConnectionStatus;
