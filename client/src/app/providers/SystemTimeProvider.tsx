import { useEffect, useState, type PropsWithChildren } from "react";
import ActionButtonLoader from "@/components/common/ActionButtonLoader";
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
  return (
    <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-sm text-muted-foreground">
      <ActionButtonLoader
        variant="display"
        className="text-primary [--action-loader-width:7rem] [--action-loader-height:4.5rem] [--action-loader-canvas-size:10rem] md:[--action-loader-width:9rem] md:[--action-loader-height:5.75rem] md:[--action-loader-canvas-size:13rem] lg:[--action-loader-width:11rem] lg:[--action-loader-height:7rem] lg:[--action-loader-canvas-size:16rem]"
      />
      <span>Loading GreenWay…</span>
    </div>
  );
};
export default SystemTimeProvider;
