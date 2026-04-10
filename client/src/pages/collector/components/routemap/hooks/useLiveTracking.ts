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

const PING_INTERVAL_MS = 5_000; // send GPS ping every 5s
const RECEIVE_INTERVAL_MS = 4_000; // poll live trucks every 4s

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

interface UseLiveTrackingOptions {
  /** The truck this driver is operating */
  truckId: string | null;
  /** Whether the route has ended — stops all tracking */
  isRouteEnded: boolean;
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
}: UseLiveTrackingOptions): UseLiveTrackingReturn => {
  const [truckCoords, setTruckCoords] = useState<[number, number] | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  // Queue of failed pings to retry when online
  const pendingQueue = useRef<Array<{ lat: number; lng: number }>>([]);

  // ─── Online / Offline detection ──────────────────────────────────────────
  useEffect(() => {
    const goOnline = async () => {
      setIsOffline(false);

      // Drain the retry queue
      const queue = [...pendingQueue.current];
      if (!truckId || queue.length === 0) return;

      const remaining: Array<{ lat: number; lng: number }> = [];
      for (const { lat, lng } of queue) {
        try {
          await pingLocation(truckId, lat, lng);
        } catch {
          // Keep failed pings queued so they can retry on the next reconnect.
          remaining.push({ lat, lng });
        }
      }

      pendingQueue.current = remaining;
      setPendingSync(remaining.length);
    };

    const goOffline = () => setIsOffline(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [truckId]);

  // ─── SEND: Ping the driver's GPS location to backend ────────────────────
  useEffect(() => {
    if (!truckId || isRouteEnded) return;

    const sendPing = async () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const { latitude, longitude } = coords;

          if (isOffline) {
            // Queue for later
            pendingQueue.current.push({ lat: latitude, lng: longitude });
            setPendingSync(pendingQueue.current.length);
            return;
          }

          try {
            await pingLocation(truckId, latitude, longitude);
          } catch {
            // Network failed — queue it
            pendingQueue.current.push({ lat: latitude, lng: longitude });
            setPendingSync(pendingQueue.current.length);
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
  }, [truckId, isRouteEnded, isOffline]);

  // ─── RECEIVE: Poll /tracking/live for this truck's latest coords ─────────
  useEffect(() => {
    if (!truckId || isRouteEnded) return;

    const poll = async () => {
      try {
        const rows = await fetchLiveTrucks();
        const mine = rows.find((r) => r.truck_id === truckId);
        if (mine) {
          const lat = toNumber(mine.latitude);
          const lng = toNumber(mine.longitude);
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
  }, [truckId, isRouteEnded]);

  return { truckCoords, isOffline, pendingSync };
};
