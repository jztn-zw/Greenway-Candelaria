/**
 * AdminTruckTracking.tsx
 *
 * Admin page for real-time truck monitoring.
 *
 * Data flow:
 *  1. Load one bounded /tracking/admin/overview snapshot.
 *  2. Socket.IO live:snapshot + live:update keep coordinates fresh.
 *  3. If the socket drops, use one overview sync every 8 seconds.
 *  4. Reconcile the full snapshot once per minute while connected.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import {
  Truck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Wifi,
  WifiOff,
  RotateCw,
  RotateCcw,
  ShieldCheck,
  X,
  Radio,
} from "lucide-react";
import AdminTrackingMap, {
  type ReplayTargetStopInfo,
  type ReplayCompletedStopInfo,
} from "./components/AdminTrackingMap";
import { useAutoRoute } from "@/features/collector/route-map/hooks/useAutoRoute";
import type { RouteStop } from "@/features/collector/route-map/types";
import AdminTruckCard from "./components/AdminTruckCard";
import RouteReplay from "./components/RouteReplay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { AdminTruck, TruckStatus } from "./types";
import { toast } from "sonner";
import { useCountUp } from "@/features/admin/dashboard/components/useCountUp";
import {
  PageHeaderSkeleton,
  KPIRowSkeleton,
  MapPanelSkeleton,
} from "@/components/PageLoadingSkeletons";
import {
  fetchAdminTrackingOverview,
  updateTruckStatus,
  sendAdminMessageToDriver,
  type DriverMessageRow,
  type DriverRow,
  type LiveRow,
  type TruckRow,
  type TruckRouteRow,
} from "@/services/trackingService";
import { fetchBarangays, type BarangayLocationRow } from "@/services/barangaysService";
import { useThemeMode } from "@/hooks/useThemeMode";
import { sendNotification } from "@/services/notificationsService";
import authService from "@/services/authService";

// Config
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  String(import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "") ||
  "http://localhost:3000";
const FALLBACK_SYNC_INTERVAL = 8_000;
const RECONCILE_INTERVAL = 60_000;
const DRIVER_STALE_MS = 120_000;

const buildRouteMap = (routes: TruckRouteRow[]) => {
  const map = new Map<string, TruckRouteRow>();

  const isFinished = (route: TruckRouteRow) => {
    if (String(route.route_status || "").toUpperCase() === "INACTIVE") {
      return true;
    }

    const stops = route.stops ?? [];
    return stops.length > 0 && stops.every((stop) => isTerminalStopStatus(stop.status));
  };

  for (const route of routes) {
    const current = map.get(route.truck_id);
    if (!current) {
      map.set(route.truck_id, route);
      continue;
    }

    const currentIsActive = String(current.route_status || "").toUpperCase() === "ACTIVE";
    const candidateIsActive = String(route.route_status || "").toUpperCase() === "ACTIVE";

    if (candidateIsActive !== currentIsActive) {
      map.set(route.truck_id, candidateIsActive ? route : current);
      continue;
    }

    if (isFinished(current) !== isFinished(route)) {
      map.set(route.truck_id, isFinished(route) ? current : route);
      continue;
    }

    map.set(route.truck_id, route);
  }

  return map;
};

//  Helpers 

const normaliseStatus = (raw: string): TruckStatus => {
  const map: Record<string, TruckStatus> = {
    ON_THE_WAY: "on-the-way",
    OFFLINE: "offline",
    SCHEDULED: "scheduled",
    DONE: "done",
  };
  return map[raw?.toUpperCase()] ?? "offline";
};

const parseBackendDate = (value: string): number | null => {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
  );

  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const localMs = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ).getTime();
    const utcMs = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );

    // MySQL DATETIME often arrives without timezone. Choose the candidate
    // closest to "now" to avoid false 8-hour stale/offline labels.
    const now = Date.now();
    const localDelta = Math.abs(now - localMs);
    const utcDelta = Math.abs(now - utcMs);
    return localDelta <= utcDelta ? localMs : utcMs;
  }

  const direct = Date.parse(value);
  return Number.isNaN(direct) ? null : direct;
};

const elapsedLabel = (timestamp: string, now = Date.now()): string => {
  const parsed = parseBackendDate(timestamp);
  if (parsed === null) return "unknown";

  const ms = now - parsed;
  if (ms < 0) return "just now";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return "just now";

  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""}`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""}`;

  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""}`;
};

const isPingStale = (timestamp: string | null, now = Date.now()): boolean => {
  if (!timestamp) return true;

  const parsed = parseBackendDate(timestamp);
  if (parsed === null) return true;

  return now - parsed > DRIVER_STALE_MS;
};

const isPingFresh = (timestamp: string | null, now = Date.now()): boolean =>
  !isPingStale(timestamp, now);

const normalizeBarangayName = (value: string) =>
  value
    .toLowerCase()
    .replace(/^brgy\.?\s*/i, "")
    .replace(/^barangay\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

const resolveTruckStatus = (
  rawStatus: string,
  lastPing: string | null,
  now = Date.now(),
): TruckStatus => {
  const normalizedKey = rawStatus?.toUpperCase().replace(/-/g, "_");
  const status =
    rawStatus === "scheduled" ||
    rawStatus === "on-the-way" ||
    rawStatus === "done" ||
    rawStatus === "offline"
      ? (rawStatus as TruckStatus)
      : normaliseStatus(normalizedKey);

  if (status === "on-the-way" && isPingStale(lastPing, now)) {
    return "offline";
  }

  return status;
};

/**
 * Normalise a RouteStopRow status string  our BarangayStop state union.
 */
const normaliseStopState = (
  raw: string,
): "done" | "in-progress" | "not-started" | "skipped" => {
  const map: Record<string, "done" | "in-progress" | "not-started" | "skipped"> = {
    DONE: "done",
    IN_PROGRESS: "in-progress",
    NOT_STARTED: "not-started",
    SKIPPED: "skipped",
    MISSED: "skipped",
    SKIP: "skipped",
  };
  return map[raw?.toUpperCase()] ?? "not-started";
};

const resolveCurrentBarangay = (
  route: TruckRouteRow | undefined,
  fallback: string,
): string => {
  if (!route?.stops?.length) return fallback;

  const stops = route.stops.slice().sort((a, b) => a.order_index - b.order_index);

  const inProgress = stops.find((stop) => stop.status?.toUpperCase() === "IN_PROGRESS");
  if (inProgress) return inProgress.barangay_name;

  // Follow the collection route's ordered next stop rather than the nearest
  // barangay, which can be a different stop when roads curve or loop.
  const nextNotStarted = stops.find((stop) => stop.status?.toUpperCase() === "NOT_STARTED");
  if (nextNotStarted) return nextNotStarted.barangay_name;

  const lastDone = [...stops].reverse().find((stop) => stop.status?.toUpperCase() === "DONE");
  if (lastDone) return lastDone.barangay_name;

  return fallback;
};

const isTerminalStopStatus = (raw?: string) => {
  const key = String(raw || "").toUpperCase();
  return key === "DONE" || key === "MISSED" || key === "SKIPPED";
};

const isRouteFinished = (route?: TruckRouteRow) => {
  if (!route) return false;

  if (!route.stops || route.stops.length === 0) return false;
  const allStopsTerminal = route.stops.every((stop) =>
    isTerminalStopStatus(stop.status),
  );
  if (allStopsTerminal) return true;

  return (
    Number(route.total_stops) > 0 &&
    Number(route.completed_stops) >= Number(route.total_stops)
  );
};

const resolveTrackedTruckStatus = ({
  truckStatus,
  live,
  route,
  now = Date.now(),
}: {
  truckStatus: string;
  live?: LiveRow;
  route?: TruckRouteRow;
  now?: number;
}): TruckStatus => {
  const liveStatus = live
    ? resolveTruckStatus(live.truck_status, live.last_ping, now)
    : null;
  const hasFreshPing = live ? isPingFresh(live.last_ping, now) : false;
  const persistedTruckStatus = normaliseStatus(truckStatus);

  // A fresh GPS ping is the source of truth for a truck that has just resumed
  // tracking. This prevents a previously cached OFFLINE value from masking a
  // successful collector update in the admin view.
  if (liveStatus === "on-the-way" && hasFreshPing) {
    return "on-the-way";
  }

  // Explicit persisted overrides take precedence over route inference.
  if (persistedTruckStatus === "offline") return "offline";
  if (persistedTruckStatus === "done") return "done";

  if (route && isRouteFinished(route)) {
    return "done";
  }

  if (route) {
    return liveStatus === "on-the-way" && hasFreshPing
      ? "on-the-way"
      : "scheduled";
  }

  if (liveStatus === "on-the-way" && !hasFreshPing) {
    return "offline";
  }

  return liveStatus ?? persistedTruckStatus;
};

const cleanDriverName = (value?: string | null): string | null => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  const upper = normalized.toUpperCase();
  if (upper === "UNASSIGNED" || upper === "NO DRIVER ASSIGNED") {
    return null;
  }

  return normalized;
};

const pickDriverName = (...candidates: Array<string | null | undefined>): string => {
  for (const candidate of candidates) {
    const normalized = cleanDriverName(candidate);
    if (normalized) return normalized;
  }

  return "";
};

const mapDriverMessageRow = (
  row: DriverMessageRow,
  fallbackDriverName: string,
) => ({
  id: row.id,
  text: row.message,
  timestamp: row.created_at,
  sender: row.sender_role?.toUpperCase() === "DRIVER" ? ("driver" as const) : ("admin" as const),
  senderName:
    row.sender_role?.toUpperCase() === "DRIVER"
      ? pickDriverName(row.sender_name, fallbackDriverName, "Driver")
      : "You",
  senderRole: row.sender_role,
  isRead: row.is_read,
});

const attachTruckMessages = (
  trucks: AdminTruck[],
  rows: DriverMessageRow[],
): AdminTruck[] => {
  const rowsByRoute = new Map<string, DriverMessageRow[]>();
  for (const row of rows) {
    if (!row.route_id) continue;
    if (!rowsByRoute.has(row.route_id)) rowsByRoute.set(row.route_id, []);
    rowsByRoute.get(row.route_id)?.push(row);
  }

  return trucks.map((truck) => ({
    ...truck,
    driverMessages: truck.routeId
      ? (rowsByRoute.get(truck.routeId) ?? []).map((row) =>
          mapDriverMessageRow(row, truck.driver),
        )
      : [],
  }));
};

const buildRouteSnapshotFromTruck = (
  truck: AdminTruck,
): TruckRouteRow | undefined => {
  if (!truck.routeId) return undefined;

  return {
    route_id: truck.routeId,
    truck_id: truck.id,
    truck_name: truck.name,
    route_status: truck.status === "done" ? "INACTIVE" : "ACTIVE",
    stops: truck.route.map((stop, index) => ({
      id: `${truck.id}-${index}`,
      barangay_id: "",
      barangay_name: stop.name,
      order_index: index + 1,
      status:
        stop.state === "done"
          ? "DONE"
          : stop.state === "in-progress"
            ? "IN_PROGRESS"
            : stop.state === "skipped"
              ? "SKIPPED"
              : "NOT_STARTED",
      completed_at: stop.completedAt ?? null,
    })),
    completed_stops: truck.completedBarangays,
    total_stops: truck.totalBarangays,
  };
};

/**
 * Build the initial truck list by merging:
 *  - allTrucks   gives us every truck (even scheduled ones with no GPS ping yet)
 *  - routeMap    gives us stops, wasteType, progress counts
 *  - liveRows    gives us real coords + live status
 */
const buildTruckList = (
  allTrucks: TruckRow[],
  routeMap: Map<string, TruckRouteRow>,
  liveRows: LiveRow[],
  drivers: DriverRow[],
  barangays: BarangayLocationRow[] = [],
): AdminTruck[] => {
  const liveMap = new Map(liveRows.map((r) => [r.truck_id, r]));
  const driverByTruckId = new Map(
    drivers
      .filter((driver) => driver.truck_id)
      .map((driver) => [driver.truck_id as string, driver]),
  );
  const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
  const barangayById = new Map(barangays.map((b) => [b.id, b]));
  const barangayByName = new Map(
    barangays.map((b) => [normalizeBarangayName(b.name), b]),
  );

  return allTrucks.map((truck): AdminTruck => {
    const live = liveMap.get(truck.id);
    const route = routeMap.get(truck.id);
    const assignedDriver = driverByTruckId.get(truck.id);
    const routeDriver =
      route?.driver_id ? driverById.get(route.driver_id) : undefined;

    const stops =
      route?.stops.map((s) => {
        const stopLat =
          s.latitude !== undefined &&
          s.latitude !== null &&
          Number.isFinite(Number(s.latitude))
            ? Number(s.latitude)
            : null;
        const stopLng =
          s.longitude !== undefined &&
          s.longitude !== null &&
          Number.isFinite(Number(s.longitude))
            ? Number(s.longitude)
            : null;

        const matchedBarangay =
          (s.barangay_id ? barangayById.get(s.barangay_id) : undefined) ??
          barangayByName.get(normalizeBarangayName(s.barangay_name));

        const bLat =
          matchedBarangay?.latitude !== undefined &&
          matchedBarangay?.latitude !== null &&
          Number.isFinite(Number(matchedBarangay.latitude))
            ? Number(matchedBarangay.latitude)
            : null;
        const bLng =
          matchedBarangay?.longitude !== undefined &&
          matchedBarangay?.longitude !== null &&
          Number.isFinite(Number(matchedBarangay.longitude))
            ? Number(matchedBarangay.longitude)
            : null;

        const coords: [number, number] | undefined =
          stopLat !== null && stopLng !== null
            ? [stopLat, stopLng]
            : bLat !== null && bLng !== null
              ? [bLat, bLng]
              : undefined;

        return {
          name: s.barangay_name,
          state: normaliseStopState(s.status),
          completedAt: s.completed_at ?? undefined,
          coords,
        };
      }) ?? [];

    const liveCoords = live ? ([live.latitude, live.longitude] as [number, number]) : null;

    return {
      id: truck.id,
      driverId:
        assignedDriver?.id ??
        routeDriver?.id ??
        route?.driver_id ??
        null,
      routeId: route?.route_id ?? null,
      driverUserId:
        assignedDriver?.user_id ??
        routeDriver?.user_id ??
        route?.driver_user_id ??
        null,
      name: truck.name,
      plateNumber: truck.plate_number,
      status: resolveTrackedTruckStatus({
        truckStatus: truck.status,
        live,
        route,
      }),
      wasteType: route?.waste_type ?? truck.waste_type ?? "Not assigned",
      driver: pickDriverName(
        routeDriver?.full_name,
        assignedDriver?.full_name,
        route?.driver_name,
        live?.driver_name,
      ),
      currentBarangay: resolveCurrentBarangay(route, "No route stop yet"),
      completedBarangays: route?.completed_stops ?? 0,
      totalBarangays: route?.total_stops ?? 0,
      coords: liveCoords,
      lastGpsUpdate: live ? elapsedLabel(live.last_ping) : "-",
      lastPingIso: live?.last_ping ?? null,
      driverMessages: [],
      barangaysAway: null,
      route: stops,
    };
  });
};

/**
 * Merge a fresh live:update payload into the existing truck list.
 * Only updates fields that come from GPS; leaves route/stop data intact.
 */
const mergeLiveIntoTrucks = (
  prev: AdminTruck[],
  liveRows: LiveRow[],
): AdminTruck[] => {
  const byId = new Map(liveRows.map((r) => [r.truck_id, r]));

  return prev.map((truck) => {
    const row = byId.get(truck.id);
    const routeSnapshot = buildRouteSnapshotFromTruck(truck);

    if (!row) {
      const status = resolveTrackedTruckStatus({
        truckStatus: truck.status,
        route: routeSnapshot,
      });

      return {
        ...truck,
        status,
        coords: status === "on-the-way" ? truck.coords : null,
        lastGpsUpdate: status === "done" ? truck.lastGpsUpdate : "-",
        lastPingIso: null,
      };
    }

    const status = resolveTrackedTruckStatus({
      truckStatus: row.truck_status,
      live: row,
      route: routeSnapshot,
    });

    return {
      ...truck,
      status,
      coords: [row.latitude, row.longitude],
      lastGpsUpdate: elapsedLabel(row.last_ping),
      lastPingIso: row.last_ping,
      driver: pickDriverName(truck.driver, row.driver_name),
    };
  });
};

//  Component 

type TrackingSidebarTab = "FLEET" | "REPLAY";
type TrackingStatusFilter = "ALL" | TruckStatus;

const AdminTruckTracking = () => {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [trucks, setTrucks] = useState<AdminTruck[]>([]);
  const [focusedTruckId, setFocusedTruckId] = useState<string | null>(null);
  const [replayPath, setReplayPath] = useState<
    [number, number][] | undefined
  >();
  const [replayIndex, setReplayIndex] = useState<number | undefined>();
  const [replayTargetStop, setReplayTargetStop] =
    useState<ReplayTargetStopInfo | null>(null);
  const [replayLegPath, setReplayLegPath] = useState<
    [number, number][] | undefined
  >();
  const [replayCompletedStops, setReplayCompletedStops] = useState<
    ReplayCompletedStopInfo[]
  >([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSyncSuccess, setLastSyncSuccess] = useState(true);
  const [mobileView, setMobileView] = useState<"MAP" | "LIST">("MAP");
  const [sidebarTab, setSidebarTab] = useState<TrackingSidebarTab>("FLEET");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingStatusOverride, setPendingStatusOverride] = useState<{
    truckId: string;
    truckName: string;
    targetStatus: TruckStatus;
  } | null>(null);
  const mapTheme = useThemeMode();

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trucksRef = useRef<AdminTruck[]>([]);
  trucksRef.current = trucks;

  const refreshTrackingData = useCallback(async () => {
    try {
      const [overview, barangays] = await Promise.all([
        fetchAdminTrackingOverview(),
        fetchBarangays().catch(() => []),
      ]);
      const merged = buildTruckList(
        overview.trucks,
        buildRouteMap(overview.routes),
        overview.live,
        overview.drivers,
        barangays,
      );
      setTrucks(attachTruckMessages(merged, overview.messages));
      setFocusedTruckId((prev) => {
        if (prev) return prev;
        const firstActive = merged.find(
          (t) => t.status === "on-the-way" && Boolean(t.coords),
        );
        return firstActive ? firstActive.id : null;
      });
      setLastSyncSuccess(true);
    } catch (err) {
      setLastSyncSuccess(false);
      throw err;
    }
  }, []);

  //  Live clock 
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Background tab throttling: trigger sync on tab focus if socket is disconnected
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && !socketConnected) {
        void refreshTrackingData().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [socketConnected, refreshTrackingData]);

  //  Initial data load 
  useEffect(() => {
    const loadInitial = async () => {
      try {
        await refreshTrackingData();
      } catch (err) {
        console.error("[AdminTruckTracking] Initial load failed:", err);
        toast.error("Failed to load tracking data");
      } finally {
        setIsPageLoading(false);
      }
    };

    loadInitial();
  }, [refreshTrackingData]);

  //  Socket.IO with background throttling 
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token: authService.getToken() },
      timeout: 10_000,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    const stopFallbackSync = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const startFallbackSync = () => {
      if (pollTimerRef.current) return;
      if (!document.hidden) {
        void refreshTrackingData().catch(() => {});
      }
      pollTimerRef.current = setInterval(() => {
        if (!document.hidden) {
          void refreshTrackingData().catch(() => {});
        }
      }, FALLBACK_SYNC_INTERVAL);
    };

    socket.on("connect", () => {
      setSocketConnected(true);
      setLastSyncSuccess(true);
      socket.emit("tracking:join");
      stopFallbackSync();
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      startFallbackSync();
    });

    socket.on("connect_error", () => {
      setSocketConnected(false);
      startFallbackSync();
    });

    // Full snapshot sent to this client on first join
    socket.on("live:snapshot", (liveRows: LiveRow[]) => {
      setTrucks((prev) => mergeLiveIntoTrucks(prev, liveRows));
      setLastSyncSuccess(true);
    });

    // Incremental update after each driver ping
    socket.on("live:update", (liveRows: LiveRow[]) => {
      setTrucks((prev) => mergeLiveIntoTrucks(prev, liveRows));
      setLastSyncSuccess(true);
    });

    socket.on("routes:update", () => {
      void refreshTrackingData().catch(() => {});
    });

    socket.on("live:error", (err: { code?: string; message: string }) => {
      console.error("[socket] live:error", err.message);
      if (err.code === "UNAUTHORIZED") {
        setSocketConnected(false);
        startFallbackSync();
      }
    });

    return () => {
      socket.emit("tracking:leave");
      socket.disconnect();
      stopFallbackSync();
    };
  }, [refreshTrackingData]);

  // A slow reconciliation heals any missed route/message events without competing with live socket
  useEffect(() => {
    if (!socketConnected) return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        void refreshTrackingData().catch(() => {});
      }
    }, RECONCILE_INTERVAL);

    return () => clearInterval(interval);
  }, [socketConnected, refreshTrackingData]);

  //  Handlers 

  const handleTruckClick = useCallback((truckId: string) => {
    setFocusedTruckId((prev) => (prev === truckId ? null : truckId));
  }, []);

  const handleMarkerClick = useCallback((truckId: string) => {
    setFocusedTruckId(truckId);
  }, []);

  const executeStatusChange = useCallback(
    async (truckId: string, status: TruckStatus) => {
      // Optimistic update
      setTrucks((prev) =>
        prev.map((t) => (t.id === truckId ? { ...t, status } : t)),
      );

      try {
        await updateTruckStatus(
          truckId,
          status.toUpperCase().replace(/-/g, "_"),
        );

        toast.success(`Status updated to "${status}"`, {
          description: "Change reflected on the resident-facing page.",
        });
      } catch {
        toast.error("Failed to update status", {
          description: "The change was not saved. Please try again.",
        });

        try {
          await refreshTrackingData();
        } catch {
          // Ignore secondary fetch failure
        }
      } finally {
        setPendingStatusOverride(null);
      }
    },
    [refreshTrackingData],
  );

  const handleStatusChange = useCallback(
    (truckId: string, status: TruckStatus) => {
      const truck = trucksRef.current.find((t) => t.id === truckId);
      const truckName = truck?.name || "Selected vehicle";

      // Mark Done or Offline require explicit confirmation to avoid accidental route termination
      if (status === "done" || status === "offline") {
        setPendingStatusOverride({
          truckId,
          truckName,
          targetStatus: status,
        });
        return;
      }

      void executeStatusChange(truckId, status);
    },
    [executeStatusChange],
  );

  const handleSendDriverMessage = useCallback(
    async (truck: AdminTruck, message: string) => {
      if (!truck.driverUserId) {
        toast.error("No driver assigned", {
          description: "Assign a driver to this truck before sending a message.",
        });
        return;
      }

      const currentUser = authService.getCurrentUser();
      const senderName =
        currentUser?.username?.trim() ||
        currentUser?.full_name?.trim() ||
        "Dispatch";

      if (!truck.routeId) {
        toast.error("No active route", {
          description: "This truck has no active route ID for message threading.",
        });
        return;
      }

      await sendAdminMessageToDriver(truck.driverUserId, truck.routeId, message);

      void sendNotification({
        user_ids: [truck.driverUserId],
        type: "SYSTEM",
        title: senderName,
        body: message,
        ref_id: truck.id,
        ref_module: "tracking",
      }).catch(() => {
        toast.warning("Message saved, notification delayed", {
          description: "The collector can still see the message in GreenWay.",
        });
      });

      // Add the sent message to local state so it appears in the thread
      setTrucks((prev) =>
        prev.map((t) =>
          t.id === truck.id
            ? {
                ...t,
                driverMessages: [
                  ...t.driverMessages,
                  {
                    id: `msg-admin-${Date.now()}`,
                    text: message,
                    timestamp: new Date().toISOString(),
                    sender: "admin" as const,
                    senderName: senderName,
                    senderRole: "ADMIN",
                  },
                ],
              }
            : t,
        ),
      );

      toast.success(`Message sent to ${truck.driver}`, {
        description: message,
      });
    },
    [],
  );

  //  Recompute elapsed labels every tick 
  const displayTrucks = useMemo(
    () =>
      trucks.map((t) =>
        t.lastPingIso
          ? {
              ...t,
              status: resolveTruckStatus(t.status, t.lastPingIso, currentTime.getTime()),
              lastGpsUpdate: elapsedLabel(
                t.lastPingIso,
                currentTime.getTime(),
              ),
            }
          : t,
      ),
    [trucks, currentTime],
  );


  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshTrackingData();
      toast.success("Tracking telemetry refreshed", {
        description: "Live positions and route progress updated.",
      });
    } catch {
      toast.error("Failed to refresh telemetry");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Resolve active/focused truck and its target stop directly in parent (matching Collector pattern)
  const activeTruck = useMemo(() => {
    if (focusedTruckId) {
      const match = displayTrucks.find((t) => t.id === focusedTruckId);
      if (match) return match;
    }
    return (
      displayTrucks.find((t) => t.status === "on-the-way" && Boolean(t.coords)) ??
      displayTrucks.find((t) => Boolean(t.coords)) ??
      null
    );
  }, [displayTrucks, focusedTruckId]);

  const activeTruckCoords = activeTruck?.coords ?? null;

  const rawStops: RouteStop[] = useMemo(() => {
    if (!activeTruck?.route) return [];
    return activeTruck.route
      .filter((s) => Boolean(s.coords))
      .map((s, idx) => ({
        id: `${activeTruck.id}-${idx}`,
        barangayId: `${activeTruck.id}-${idx}`,
        stopNumber: idx + 1,
        barangay: s.name,
        status:
          s.state === "done"
            ? "done"
            : s.state === "skipped"
              ? "skipped"
              : s.state === "in-progress"
                ? "in-progress"
                : "not-yet",
        completedAt: s.completedAt,
        skippedReason: s.skippedReason,
        coords: s.coords!,
        distanceKm: 0,
      }));
  }, [activeTruck?.id, activeTruck?.route]);

  const autoRoutedStops = useAutoRoute(rawStops, activeTruckCoords);
  const activeStop = useMemo(
    () => autoRoutedStops.find((s) => s.status === "in-progress") ?? null,
    [autoRoutedStops]
  );
  const activeStopCoords = activeStop?.coords ?? null;

  //  KPI calculations 
  const activeTrucks = displayTrucks.filter((t) => t.status === "on-the-way").length;
  const totalCompleted = trucks.reduce(
    (sum, t) => sum + t.completedBarangays,
    0,
  );
  const totalStops = trucks.reduce((sum, t) => sum + t.totalBarangays, 0);
  const completionPct =
    totalStops > 0 ? Math.round((totalCompleted / totalStops) * 100) : 0;
  const doneTrucks = trucks.filter((t) => t.status === "done").length;

  const animatedActive = useCountUp(activeTrucks);
  const animatedCompletion = useCountUp(completionPct);
  const animatedCompleted = useCountUp(totalCompleted);
  const animatedDone = useCountUp(doneTrucks);

  //  Render 
  if (isPageLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5">
        <PageHeaderSkeleton />
        <KPIRowSkeleton count={4} />
        <MapPanelSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      {/* -- Page Header -- */}
      <div className="flex items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
                Live Fleet Tracking
              </h1>
              <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-semibold border-primary/30 text-primary bg-primary/5">
                Candelaria
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Real-time GPS telemetry, route execution, and dispatch controls for municipal trucks.
            </p>
          </div>
        </div>
      </div>

      {/* -- Executive Metric KPI Strip -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          {
            title: "Active Fleet",
            value: `${animatedActive}/${displayTrucks.length}`,
            description: `${activeTrucks} vehicles on live duty`,
            icon: Truck,
            iconBox: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          },
          {
            title: "Barangays Covered",
            value: `${animatedCompleted}/${totalStops}`,
            description: `${totalStops - totalCompleted} remaining stops`,
            icon: MapPin,
            iconBox: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
          },
          {
            title: "Fleet Progress",
            value: `${animatedCompletion}%`,
            description: "Overall municipality progress",
            icon: CheckCircle2,
            iconBox: "bg-primary/10 text-primary border-primary/20",
          },
          {
            title: "Routes Finished",
            value: `${animatedDone}/${displayTrucks.length}`,
            description: `${doneTrucks} trucks completed routes`,
            icon: ShieldCheck,
            iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="bg-card border border-border/80 rounded-2xl p-3 sm:p-5 shadow-2xs space-y-1 sm:space-y-1.5 transition-all hover:border-border"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate">
                  {kpi.title}
                </span>
                <div
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center shrink-0",
                    kpi.iconBox
                  )}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-bold font-display text-foreground tabular-nums tracking-tight">
                {kpi.value}
              </div>
              <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                {kpi.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* -- Mobile View Switcher (Visible only on < lg) -- */}
      <div className="flex lg:hidden justify-center pt-0.5 pb-1">
        <div className="bg-muted/70 p-1 rounded-xl border border-border/80 flex items-center gap-1 w-full max-w-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setMobileView("MAP")}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              mobileView === "MAP"
                ? "bg-card text-foreground shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Navigation className="w-3.5 h-3.5 text-primary" />
            <span>Map View</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileView("LIST")}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              mobileView === "LIST"
                ? "bg-card text-foreground shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span>Fleet Controls</span>
          </button>
        </div>
      </div>

      {/* -- Main Workspace: Map + Control Sidebar -- */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 items-start">
        {/* Left 2 Cols: Map View */}
        <div
          className={cn(
            "lg:col-span-2 h-[460px] sm:h-[560px] lg:h-[700px]",
            mobileView === "LIST" ? "hidden lg:block" : "block",
          )}
        >
          <AdminTrackingMap
            trucks={displayTrucks}
            focusedTruckId={focusedTruckId}
            activeTruck={activeTruck}
            activeTruckCoords={activeTruckCoords}
            activeStop={activeStop}
            activeStopCoords={activeStopCoords}
            autoRoutedStops={autoRoutedStops}
            onMarkerClick={handleMarkerClick}
            replayPath={replayPath}
            replayIndex={replayIndex}
            replayTargetStop={replayTargetStop}
            replayLegPath={replayLegPath}
            replayCompletedStops={replayCompletedStops}
            theme={mapTheme}
          />
        </div>

        {/* Right 1 Col: Tabbed Control Center */}
        <div
          className={cn(
            "rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs h-[600px] sm:h-[680px] lg:h-[700px] flex flex-col overflow-hidden",
            mobileView === "MAP" ? "hidden lg:flex" : "flex",
          )}
        >
          {/* Top Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 shrink-0">
            {[
              { id: "FLEET" as const, label: "Fleet", icon: Truck, count: displayTrucks.length },
              { id: "REPLAY" as const, label: "Replay", icon: RotateCcw },
            ].map((tab) => {
              const isActive = sidebarTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === "FLEET") {
                      setReplayPath(undefined);
                      setReplayIndex(undefined);
                      setReplayTargetStop(null);
                      setReplayLegPath(undefined);
                      setReplayCompletedStops([]);
                    }
                    setSidebarTab(tab.id);
                  }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
                    isActive
                      ? "bg-card text-foreground font-bold shadow-2xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span className="truncate">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full shrink-0",
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto pt-3 pr-1 space-y-3">
            {sidebarTab === "FLEET" && (
              <>
                {/* List of Fleet Trucks */}
                {displayTrucks.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
                    <Truck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-xs font-semibold text-foreground">
                      No fleet vehicles found
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      There are currently no trucks configured for live tracking.
                    </p>
                  </div>
                ) : (
                  displayTrucks.map((truck) => (
                    <AdminTruckCard
                      key={truck.id}
                      truck={truck}
                      isSelected={focusedTruckId === truck.id}
                      onClick={() => handleTruckClick(truck.id)}
                      onStatusChange={handleStatusChange}
                      onSendMessage={handleSendDriverMessage}
                    />
                  ))
                )}
              </>
            )}

            {sidebarTab === "REPLAY" && (
              <RouteReplay
                trucks={trucks}
                onReplayPath={setReplayPath}
                onReplayIndex={setReplayIndex}
                onReplayTargetStop={setReplayTargetStop}
                onReplayLegPath={setReplayLegPath}
                onReplayCompletedStops={setReplayCompletedStops}
              />
            )}
          </div>
        </div>
      </div>

      {/* Manual Status Override Confirmation Dialog */}
      <AlertDialog
        open={Boolean(pendingStatusOverride)}
        onOpenChange={(open) => {
          if (!open) setPendingStatusOverride(null);
        }}
      >
        <AlertDialogContent className="w-[92vw] sm:max-w-md rounded-2xl border border-border/80 p-0 shadow-2xl overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3.5 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <AlertDialogTitle className="text-base font-semibold text-foreground font-display">
                Confirm Status Override
              </AlertDialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setPendingStatusOverride(null)}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to manually set{" "}
              <strong className="text-foreground font-semibold">
                {pendingStatusOverride?.truckName}
              </strong>{" "}
              status to{" "}
              <strong className="text-foreground font-semibold uppercase">
                {pendingStatusOverride?.targetStatus}
              </strong>
              ?
              {pendingStatusOverride?.targetStatus === "done" && (
                <span className="block mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-medium text-xs">
                  Marking a truck as Done will deactivate any unfinished stops on its route and mark them as Missed.
                </span>
              )}
              {pendingStatusOverride?.targetStatus === "offline" && (
                <span className="block mt-2.5 p-2.5 rounded-xl bg-muted/60 border border-border/60 text-foreground font-medium text-xs">
                  The vehicle telemetry will be marked offline for all dispatchers and residents.
                </span>
              )}
            </AlertDialogDescription>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border/60 bg-muted/20">
            <AlertDialogCancel
              onClick={() => setPendingStatusOverride(null)}
              className="h-9 px-4 rounded-xl text-xs font-semibold hover:bg-muted cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatusOverride) {
                  void executeStatusChange(
                    pendingStatusOverride.truckId,
                    pendingStatusOverride.targetStatus,
                  );
                }
              }}
              className={cn(
                "h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer shadow-xs",
                pendingStatusOverride?.targetStatus === "done" || pendingStatusOverride?.targetStatus === "offline"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              Confirm Override
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer */}
      <p className="text-[11px] text-muted-foreground text-center pt-1">
        All changes are immediately reflected on the resident-facing Truck
        Tracking page · GPS updates via authenticated Socket.IO with secure REST fallback
      </p>
    </div>
  );
};

export default AdminTruckTracking;







