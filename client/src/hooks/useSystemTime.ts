import { useEffect,useState } from "react";
import { getServerNow,subscribeToServerClock } from "@/lib/serverClock";

export const useSystemTime = (interval = 30_000) => {
  const [now, setNow] = useState(getServerNow);
  useEffect(() => {
    const update = () => setNow(getServerNow());
    const unsubscribe = subscribeToServerClock(update);
    const timer = setInterval(update, interval);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      unsubscribe(); clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [interval]);
  return now;
};
