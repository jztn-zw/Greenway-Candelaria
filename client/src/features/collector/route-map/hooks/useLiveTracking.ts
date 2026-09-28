
import { useState, useEffect } from "react";
import { pingLocation } from "@/services/trackingService";

export const isRetryablePingFailure = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === undefined || status >= 500;
};

interface Options {
  truckId: string | null;
  routeId?: string | null;
  isRouteEnded: boolean;
  isTrackingEnabled?: boolean;
}

// Only one acquisition/request at a time. Cleanup invalidates late GPS callbacks.
export const useLiveTracking = ({ truckId, routeId, isRouteEnded, isTrackingEnabled = true }: Options) => {
  const [truckCoords, setTruckCoords] = useState<[number, number] | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const abort = new AbortController();
    setTruckCoords(null);
    setLastPing(null);
    setGpsError(null);
    if (!truckId || !routeId || isRouteEnded || !isTrackingEnabled) return;
    const next = () => { if (!cancelled) timer = setTimeout(send, 5000); };
    const send = () => {
      if (cancelled) return;
      if (!navigator.onLine) { setGpsError("Offline. GPS will resume with a fresh location when connected."); next(); return; }
      if (!navigator.geolocation) { setGpsError("This browser does not support GPS."); return; }
      navigator.geolocation.getCurrentPosition(async ({ coords, timestamp }) => {
        if (cancelled) return;
        if (Date.now() - timestamp > 120000) { setGpsError("GPS location is outdated. Waiting for a fresh fix."); next(); return; }
        try {
          await pingLocation(truckId, coords.latitude, coords.longitude, {
            route_run_id: routeId, sample_id: crypto.randomUUID(), captured_at: new Date(timestamp).toISOString(),
          }, abort.signal);
          if (cancelled) return;
          setTruckCoords([coords.latitude, coords.longitude]);
          setLastPing(timestamp);
          setGpsError(null);
        } catch (error) {
          if (cancelled) return;
          setGpsError(error instanceof Error ? error.message : "GPS could not be sent.");
          const status = (error as { response?: { status?: number } }).response?.status;
          if (!isRetryablePingFailure(error) && status !== 422 && status !== 429) return;
        }
        next();
      }, (error) => {
        if (cancelled) return;
        setGpsError(error.code === 1 ? "Allow location access in your browser to share truck GPS." : "GPS is unavailable. Waiting for a location fix.");
        next();
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    };
    send();
    return () => { cancelled = true; clearTimeout(timer); abort.abort(); };
  }, [truckId, routeId, isRouteEnded, isTrackingEnabled]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  const fresh = lastPing !== null && now - lastPing <= 120000;
  return { truckCoords: fresh ? truckCoords : null, isOffline, pendingSync: 0, gpsError, lastPing };
};
