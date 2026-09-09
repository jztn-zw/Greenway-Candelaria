/**
 * useLiveTracking.ts
 *
 * Two responsibilities:
 * 1. SEND: Gets the driver's browser GPS and pings /tracking/ping every N seconds
 * 2. RECEIVE: Polls /tracking/live to get the latest truck coords for the map
 *
 * Both are independent intervals so they don't block each other.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchLiveTrucks, pingLocation } from "@/services/trackingService";
import { toFiniteNumber } from "../routeMap.utils";

const PING_INTERVAL_MS = 5_000; // send GPS ping every 5s
const RECEIVE_INTERVAL_MS = 4_000; // poll live trucks every 4s

type QueuedPing = { lat: number; lng: number };

const getHttpStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === "number" ? response.status : null;
};

// Authentication, validation, and paused-route errors will not succeed by
// retrying. Network failures and 5xx responses can safely be retried.
export const isRetryablePingFailure = (error: unknown) => {
  const status = getHttpStatus(error);
  return status === null || status >= 500;
};

interface UseLiveTrackingOptions {
  /** The truck this driver is operating */
  truckId: string | null;
  /** Whether the route has ended — stops all tracking */
  isRouteEnded: boolean;
  /** Enable live ping/poll only when route is actually running */
  isTrackingEnabled?: boolean;
}

interface UseLiveTrackingReturn {
  /** Latest [lat, lng] of this driver's truck from the live endpoint */
  truckCoords: [number, number] | null;
  /** Whether the browser is offline */
  isOffline: boolean;
  /** How many pings are queued for retry when back online */
  pendingSync: number;
}

export const useLiveTracking = ({
  truckId,
  isRouteEnded,
  isTrackingEnabled = true,
}: UseLiveTrackingOptions): UseLiveTrackingReturn => {
  const [truckCoords, setTruckCoords] = useState<[number, number] | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  // GPS is a latest-state signal, not a historical queue. Retaining only the
  // newest position prevents an old offline trail from moving the truck back
  // in time after reconnection.
  const pendingPing = useRef<QueuedPing | null>(null);
  const isPingInFlight = useRef(false);

  const queueLatestPing = useCallback((ping: QueuedPing) => {
    pendingPing.current = ping;
    setPendingSync(1);
  }, []);

  const clearPendingPing = useCallback(() => {
    pendingPing.current = null;
    setPendingSync(0);
  }, []);

  // ─── Online / Offline detection ──────────────────────────────────────────
  useEffect(() => {
    const goOnline = async () => {
      setIsOffline(false);

      const queued = pendingPing.current;
      if (!truckId || !queued || isPingInFlight.current) return;

      try {
        isPingInFlight.current = true;
        await pingLocation(truckId, queued.lat, queued.lng);
        clearPendingPing();
      } catch (error) {
        if (!isRetryablePingFailure(error)) clearPendingPing();
      } finally {
        isPingInFlight.current = false;
      }
    };

    const goOffline = () => setIsOffline(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [truckId, clearPendingPing]);

  useEffect(() => {
    if (isRouteEnded || !isTrackingEnabled) clearPendingPing();
  }, [isRouteEnded, isTrackingEnabled, clearPendingPing]);

  // ─── SEND: Ping the driver's GPS location to backend ────────────────────
  useEffect(() => {
    if (!truckId || isRouteEnded || !isTrackingEnabled) return;

    const sendPing = async () => {
      if (!navigator.geolocation || isPingInFlight.current) return;

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const { latitude, longitude } = coords;

          if (isOffline) {
            queueLatestPing({ lat: latitude, lng: longitude });
            return;
          }

          try {
            isPingInFlight.current = true;
            await pingLocation(truckId, latitude, longitude);
            clearPendingPing();
          } catch (error) {
            if (isRetryablePingFailure(error)) {
              queueLatestPing({ lat: latitude, lng: longitude });
            } else {
              clearPendingPing();
              console.warn("[useLiveTracking] GPS ping was rejected and will not retry", getHttpStatus(error));
            }
          } finally {
            isPingInFlight.current = false;
          }
        },
        (err) => {
          // Geolocation denied or unavailable — silent fail
          console.warn("[useLiveTracking] Geolocation error:", err.message);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 },
      );
    };

    // Send immediately, then on interval
    sendPing();
    const id = setInterval(sendPing, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [truckId, isRouteEnded, isOffline, isTrackingEnabled, queueLatestPing, clearPendingPing]);

  // ─── RECEIVE: Poll /tracking/live for this truck's latest coords ─────────
  useEffect(() => {
    if (!truckId || isRouteEnded || !isTrackingEnabled) return;

    const poll = async () => {
      try {
        const rows = await fetchLiveTrucks();
        const mine = rows.find((r) => r.truck_id === truckId);
        if (mine) {
          const lat = toFiniteNumber(mine.latitude);
          const lng = toFiniteNumber(mine.longitude);
          if (lat !== null && lng !== null) {
            setTruckCoords([lat, lng]);
          }
        }
      } catch {
        // Silent — map just keeps last known coords
      }
    };

    poll();
    const id = setInterval(poll, RECEIVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [truckId, isRouteEnded, isTrackingEnabled]);

  return { truckCoords, isOffline, pendingSync };
};
