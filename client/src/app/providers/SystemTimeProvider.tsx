import { useEffect, useState, type PropsWithChildren } from "react";
import { LoaderCircle } from "lucide-react";
import api from "@/lib/api";
import { getServerNow, syncServerClock } from "@/lib/serverClock";
import { useSystemTime } from "@/hooks/useSystemTime";
import PageErrorState from "@/components/feedback/PageErrorState";
import { parseApiTimestamp } from "@/utils/apiTimestamp";

const SystemTimeProvider = ({ children }: PropsWithChildren) => {
  const now = useSystemTime();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (pending || controller.signal.aborted || document.visibilityState === "hidden") return;
      pending = true;
      const requestedAt = performance.now();
      try {
        const response = await api.get<{ data: { server_time: string } }>("/time", { signal: controller.signal });
        if (controller.signal.aborted) return;
        const time = response.data.data.server_time;
        if (typeof time !== "string" || !parseApiTimestamp(time)) throw new Error("System time unavailable");
        syncServerClock(time, requestedAt);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally { pending = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5 * 60_000);
    const reconcile = () => { void refresh(); };
    window.addEventListener("focus", reconcile);
    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", reconcile);
    return () => {
      controller.abort(); clearInterval(timer);
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
    };
  }, [attempt]);
  if (now !== null || getServerNow() !== null) return children;
  if (failed) return <PageErrorState fullScreen kind="unavailable" title="Unable to load GreenWay" description="We couldn't connect to the system. Check your connection and try again." onRetry={() => { setFailed(false); setAttempt(value => value + 1); }} />;
  return <div role="status" className="flex min-h-dvh items-center justify-center gap-2 bg-background text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Loading GreenWay…</div>;
};
export default SystemTimeProvider;
