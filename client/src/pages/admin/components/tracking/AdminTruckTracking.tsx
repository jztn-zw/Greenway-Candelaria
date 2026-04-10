/**
 * AdminTruckTracking.tsx
 *
 * Admin page for real-time truck monitoring.
 *
 * Data flow:
 *  1. On mount  fetch all trucks from /trucks (gives us the sidebar list)
 *  2. On mount  fetch today's routes from /routes/today (stops, wasteType, progress)
 *  3. On mount  fetch /tracking/live (latest GPS coords per truck)
 *  4. Socket.IO  live:snapshot + live:update keep coords fresh in real-time
 *  5. If socket drops  fall back to polling /tracking/live every 8 s
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import {
  Truck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Wifi,
  WifiOff,
} from "lucide-react";
import AdminTrackingMap from "./components/AdminTrackingMap";
import AdminTruckCard from "./components/AdminTruckCard";
import RouteReplay from "./components/RouteReplay";
import MissedCollectionLogDynamic from "./components/MissedCollectionLogDynamic";
import { Badge } from "@/components/ui/badge";
import type { AdminTruck, TruckStatus } from "./types";
import { toast } from "sonner";
import { useCountUp } from "../dashboard/useCountUp";
import {
  PageHeaderSkeleton,
  KPIRowSkeleton,
  MapPanelSkeleton,
} from "@/components/PageLoadingSkeletons";
import {
  fetchLiveTrucks,
  fetchAllDrivers,
  fetchAllTrucks,
  fetchDriverMessagesForAdmin,
  fetchTodayRoutes,
  updateTruckStatus,
  sendAdminMessageToDriver,
  type DriverMessageRow,
  type DriverRow,
  type LiveRow,
  type TruckRow,
  type TruckRouteRow,
} from "@/services/trackingService";
import { useThemeMode } from "@/hooks/useThemeMode";
import { sendNotification } from "@/services/notificationsService";
import authService from "@/services/authService";

//  Config 
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:2000";
const POLL_INTERVAL = 8_000;
const LIVE_SYNC_INTERVAL = 4_000;
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

const getStopCoords = (stop: {
  latitude?: number;
  longitude?: number;
}): [number, number] | null => {
  const lat = Number(stop.latitude);
  const lng = Number(stop.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
};

const resolveCurrentBarangay = (
  route: TruckRouteRow | undefined,
  liveCoords: [number, number] | null,
  fallback: string,
): string => {
  if (!route?.stops?.length) return fallback;

  const stops = route.stops.slice().sort((a, b) => a.order_index - b.order_index);

  const inProgress = stops.find((stop) => stop.status?.toUpperCase() === "IN_PROGRESS");
  if (inProgress) return inProgress.barangay_name;

  if (liveCoords) {
    const pendingWithCoords = stops
      .filter((stop) => {
        const status = stop.status?.toUpperCase();
        return status !== "DONE" && status !== "MISSED" && status !== "SKIPPED";
      })
      .map((stop) => {
        const coords = getStopCoords(stop);
        if (!coords) return null;
        const dLat = coords[0] - liveCoords[0];
        const dLng = coords[1] - liveCoords[1];
        return {
          name: stop.barangay_name,
          distanceSq: dLat * dLat + dLng * dLng,
        };
      })
      .filter((entry): entry is { name: string; distanceSq: number } => Boolean(entry));

    if (pendingWithCoords.length > 0) {
      pendingWithCoords.sort((a, b) => a.distanceSq - b.distanceSq);
      return pendingWithCoords[0].name;
    }
  }

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

  if (String(route.route_status || "").toUpperCase() === "INACTIVE") {
    return true;
  }

  if (!route.stops || route.stops.length === 0) return false;
  return route.stops.every((stop) => isTerminalStopStatus(stop.status));
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

  if (route && isRouteFinished(route)) {
    return persistedTruckStatus === "offline" ? "offline" : "done";
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

const hydrateTruckMessages = async (
  trucks: AdminTruck[],
): Promise<AdminTruck[]> => {
  const hydratedMessages = await Promise.all(
    trucks.map(async (truck) => {
      if (!truck.driverId || !truck.routeId) {
        return [truck.id, truck.driverMessages] as const;
      }

      try {
        const rows = await fetchDriverMessagesForAdmin(truck.driverId, truck.routeId, 200);
        return [
          truck.id,
          rows.map((row) => mapDriverMessageRow(row, truck.driver)),
        ] as const;
      } catch {
        return [truck.id, truck.driverMessages] as const;
      }
    }),
  );

  const messageMap = new Map(hydratedMessages);
  return trucks.map((truck) => ({
    ...truck,
    driverMessages: messageMap.get(truck.id) ?? truck.driverMessages,
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
): AdminTruck[] => {
  const liveMap = new Map(liveRows.map((r) => [r.truck_id, r]));
  const driverByTruckId = new Map(
    drivers
      .filter((driver) => driver.truck_id)
      .map((driver) => [driver.truck_id as string, driver]),
  );
  const driverById = new Map(drivers.map((driver) => [driver.id, driver]));

  return allTrucks.map((truck): AdminTruck => {
    const live = liveMap.get(truck.id);
    const route = routeMap.get(truck.id);
    const assignedDriver = driverByTruckId.get(truck.id);
    const routeDriver =
      route?.driver_id ? driverById.get(route.driver_id) : undefined;

    const stops =
      route?.stops.map((s) => ({
        name: s.barangay_name,
        state: normaliseStopState(s.status),
        completedAt: s.completed_at ?? undefined,
      })) ?? [];

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
      currentBarangay: resolveCurrentBarangay(route, liveCoords, "No route stop yet"),
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
      truckStatus: truck.status,
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

const mergeTruckRowsIntoTrucks = (
  prev: AdminTruck[],
  allTrucks: TruckRow[],
): AdminTruck[] => {
  const byId = new Map(allTrucks.map((truck) => [truck.id, truck]));

  return prev.map((truck) => {
    const freshTruck = byId.get(truck.id);
    if (!freshTruck) return truck;

    const routeSnapshot = buildRouteSnapshotFromTruck(truck);
    const status = resolveTrackedTruckStatus({
      truckStatus: freshTruck.status,
      live: truck.lastPingIso && truck.coords
        ? {
            truck_id: truck.id,
            truck_name: truck.name,
            truck_plate: truck.plateNumber,
            truck_status: freshTruck.status,
            driver_name: truck.driver,
            latitude: truck.coords[0],
            longitude: truck.coords[1],
            last_ping: truck.lastPingIso,
          }
        : undefined,
      route: routeSnapshot,
    });

    return {
      ...truck,
      name: freshTruck.name,
      plateNumber: freshTruck.plate_number,
      wasteType:
        truck.wasteType && truck.wasteType !== "Not assigned"
          ? truck.wasteType
          : freshTruck.waste_type ?? truck.wasteType,
      status,
    };
  });
};

const mergeRoutesIntoTrucks = (
  prev: AdminTruck[],
  routes: TruckRouteRow[],
): AdminTruck[] => {
  const routeMap = buildRouteMap(routes);

  return prev.map((truck) => {
    const route = routeMap.get(truck.id);
    if (!route) {
      return {
        ...truck,
        routeId: null,
        currentBarangay: "No route stop yet",
        completedBarangays: 0,
        totalBarangays: 0,
        route: [],
      };
    }

    const stops = route.stops
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({
        name: s.barangay_name,
        state: normaliseStopState(s.status),
        completedAt: s.completed_at ?? undefined,
      }));

    return {
      ...truck,
      driverId: truck.driverId ?? route.driver_id ?? null,
      routeId: route.route_id ?? truck.routeId,
      driver: pickDriverName(truck.driver, route.driver_name),
      wasteType: route.waste_type ?? truck.wasteType,
      status: resolveTrackedTruckStatus({
        truckStatus: truck.status,
        live: truck.lastPingIso && truck.coords
          ? {
              truck_id: truck.id,
              truck_name: truck.name,
              truck_plate: truck.plateNumber,
              truck_status: truck.status,
              driver_name: truck.driver,
              latitude: truck.coords[0],
              longitude: truck.coords[1],
              last_ping: truck.lastPingIso,
            }
          : undefined,
        route,
      }),
      currentBarangay: resolveCurrentBarangay(route, truck.coords, truck.currentBarangay),
      completedBarangays: route.completed_stops,
      totalBarangays: route.total_stops,
      route: stops,
    };
  });
};
const mergeDriversIntoTrucks = (
  prev: AdminTruck[],
  drivers: DriverRow[],
): AdminTruck[] => {
  const driverByUserId = new Map(
    drivers.map((driver) => [driver.user_id, driver]),
  );
  const driverByTruckId = new Map(
    drivers
      .filter((driver) => driver.truck_id)
      .map((driver) => [driver.truck_id as string, driver]),
  );

  return prev.map((truck) => {
    const driver =
      (truck.driverUserId ? driverByUserId.get(truck.driverUserId) : undefined) ??
      driverByTruckId.get(truck.id);

    if (!driver) return truck;

    return {
      ...truck,
      driverId: truck.driverId ?? driver.id ?? null,
      driverUserId: truck.driverUserId ?? driver.user_id ?? null,
      driver: pickDriverName(driver.full_name, truck.driver),
    };
  });
};

//  Component 

const AdminTruckTracking = () => {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [trucks, setTrucks] = useState<AdminTruck[]>([]);
  const [focusedTruckId, setFocusedTruckId] = useState<string | null>(null);
  const [replayPath, setReplayPath] = useState<
    [number, number][] | undefined
  >();
  const [replayIndex, setReplayIndex] = useState<number | undefined>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [socketConnected, setSocketConnected] = useState(false);
  const mapTheme = useThemeMode();

  const trucksRef = useRef<AdminTruck[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    trucksRef.current = trucks;
  }, [trucks]);

  const refreshRouteAndDriverData = useCallback(async () => {
    const [routesResult, driversResult, trucksResult] = await Promise.allSettled([
      fetchTodayRoutes(),
      fetchAllDrivers(),
      fetchAllTrucks(),
    ]);

    const currentTrucks = trucksRef.current;
    const withTruckRows =
      trucksResult.status === "fulfilled"
        ? mergeTruckRowsIntoTrucks(currentTrucks, trucksResult.value)
        : currentTrucks;

    const withRoutes =
      routesResult.status === "fulfilled"
        ? mergeRoutesIntoTrucks(withTruckRows, routesResult.value)
        : withTruckRows;

    const merged =
      driversResult.status === "fulfilled"
        ? mergeDriversIntoTrucks(withRoutes, driversResult.value)
        : withRoutes;

    const hydrated = await hydrateTruckMessages(merged);
    setTrucks(hydrated);
  }, []);

  //  Live clock 
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  //  Initial data load 
  //
  //  We fire all three requests in parallel with Promise.allSettled so that
  //  a failure in routes doesn't prevent trucks from loading.
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [trucksResult, routesResult, liveResult, driversResult] =
          await Promise.allSettled([
            fetchAllTrucks(),
            fetchTodayRoutes(),
            fetchLiveTrucks(),
            fetchAllDrivers(),
          ]);

        const allTrucks =
          trucksResult.status === "fulfilled" ? trucksResult.value : [];
        const todayRoutes =
          routesResult.status === "fulfilled" ? routesResult.value : [];
        const liveRows =
          liveResult.status === "fulfilled" ? liveResult.value : [];
        const drivers =
          driversResult.status === "fulfilled" ? driversResult.value : [];

        if (trucksResult.status === "rejected") {
          toast.error("Could not load truck list", {
            description: "Check your connection or backend status.",
          });
        }

        // Build a map for O(1) route lookups
        const routeMap = buildRouteMap(todayRoutes);

        const merged = buildTruckList(allTrucks, routeMap, liveRows, drivers);
        const hydrated = await hydrateTruckMessages(merged);
        setTrucks(hydrated);
      } catch (err) {
        console.error("[AdminTruckTracking] Initial load failed:", err);
        toast.error("Failed to load tracking data");
      } finally {
        setIsPageLoading(false);
      }
    };

    loadInitial();
  }, []);

  //  Socket.IO 
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      timeout: 10_000,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("tracking:join");

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);

      // Fall back to REST polling while disconnected
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(async () => {
          try {
            const liveRows = await fetchLiveTrucks();
            setTrucks((prev) => mergeLiveIntoTrucks(prev, liveRows));
          } catch {
            // Silently skip; will retry on next interval
          }
        }, POLL_INTERVAL);
      }
    });

    // Full snapshot sent to this client on first join
    socket.on("live:snapshot", (liveRows: LiveRow[]) => {
      setTrucks((prev) => mergeLiveIntoTrucks(prev, liveRows));
    });

    // Incremental update after each driver ping
    socket.on("live:update", (liveRows: LiveRow[]) => {
      setTrucks((prev) => mergeLiveIntoTrucks(prev, liveRows));
    });

    socket.on("routes:update", () => {
      void refreshRouteAndDriverData();
    });

    socket.on("live:error", (err: { message: string }) => {
      console.error("[socket] live:error", err.message);
    });

    return () => {
      socket.emit("tracking:leave");
      socket.disconnect();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [refreshRouteAndDriverData]);

  useEffect(() => {
    const syncLiveNow = async () => {
      try {
        const liveRows = await fetchLiveTrucks();
        setTrucks((prev) => mergeLiveIntoTrucks(prev, liveRows));
      } catch {
        // Keep UI as-is; next tick/socket update will retry
      }
    };

    void syncLiveNow();
    const interval = setInterval(() => {
      void syncLiveNow();
    }, LIVE_SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshRouteAndDriverData();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [refreshRouteAndDriverData]);

  //  Handlers 

  const handleTruckClick = useCallback((truckId: string) => {
    setFocusedTruckId((prev) => (prev === truckId ? null : truckId));
  }, []);

  const handleMarkerClick = useCallback((truckId: string) => {
    setFocusedTruckId(truckId);
  }, []);

  const handleStatusChange = useCallback(
    async (truckId: string, status: TruckStatus) => {
      // Optimistic update  update UI immediately before the API confirms
      setTrucks((prev) =>
        prev.map((t) => (t.id === truckId ? { ...t, status } : t)),
      );

      try {
        // Send DB status format: "on-the-way"  "ON_THE_WAY"
        await updateTruckStatus(
          truckId,
          status.toUpperCase().replace(/-/g, "_"),
        );

        toast.success(`Status updated to "${status}"`, {
          description: "Change reflected on the resident-facing page.",
        });
      } catch {
        // Roll back on failure
        toast.error("Failed to update status", {
          description: "The change was not saved. Please try again.",
        });

        // Re-fetch live data to restore correct state
        try {
          const liveRows = await fetchLiveTrucks();
          setTrucks((prev) => mergeLiveIntoTrucks(prev, liveRows));
        } catch {
          // Ignore secondary fetch failure
        }
      }
    },
    [],
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

      await sendNotification({
        user_ids: [truck.driverUserId],
        type: "SYSTEM",
        title: senderName,
        body: message,
        ref_id: truck.id,
        ref_module: "tracking",
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

  const dateStr = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

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
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">
                Truck Tracking
              </h1>
              <p className="text-sm text-muted-foreground">
                {dateStr} · {timeStr}
              </p>
            </div>
          </div>

          {/* Socket status indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg ${
              socketConnected
                ? "bg-primary/5 border-primary/10"
                : "bg-destructive/5 border-destructive/10"
            }`}
          >
            {socketConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] text-primary font-medium">
                  Live · updates in real-time
                </span>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse ml-0.5" />
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-destructive" />
                <span className="text-[11px] text-destructive font-medium">
                  Reconnecting...
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          {
            label: "Active Trucks",
            value: `${animatedActive}/${displayTrucks.length}`,
            icon: Truck,
            accent: true,
          },
          {
            label: "Barangays Collected",
            value: `${animatedCompleted}/${totalStops}`,
            icon: MapPin,
            accent: false,
          },
          {
            label: "Completion Rate",
            value: `${animatedCompletion}%`,
            icon: CheckCircle2,
            accent: false,
          },
          {
            label: "Routes Completed",
            value: `${animatedDone}/${displayTrucks.length}`,
            icon: AlertTriangle,
            accent: false,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-card border rounded-xl p-4 ${
              kpi.accent
                ? "border-primary/20 border-l-4 border-l-primary"
                : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {kpi.label}
                </p>
                <p className="text-lg font-bold text-foreground mt-1 tabular-nums">
                  {kpi.value}
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <kpi.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Layout: Map + Sidebar */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2 h-[420px] lg:h-[580px]">
          <AdminTrackingMap
            trucks={displayTrucks}
            focusedTruckId={focusedTruckId}
            onMarkerClick={handleMarkerClick}
            replayPath={replayPath}
            replayIndex={replayIndex}
            theme={mapTheme}
          />
        </div>

        {/* Right Panel */}
        <div className="space-y-3 lg:max-h-[580px] lg:overflow-y-auto lg:pr-1">
          {/* Sticky: Vehicles header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mb-2">
            <div className="flex items-center justify-between pt-1">
              <h2 className="text-sm font-display font-semibold text-foreground">
                Vehicles
              </h2>
              <span className="text-xs text-muted-foreground">
                {displayTrucks.length} truck{displayTrucks.length !== 1 ? "s" : ""} ·{" "}
                {activeTrucks} active
              </span>
            </div>
          </div>

          {displayTrucks.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No truck data available yet.
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

          {/* Sticky: Missed Collection Log header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mb-2 pt-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-display font-semibold text-foreground">
                Missed Collection Log
              </h2>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-destructive/20 font-semibold">
                !
              </Badge>
            </div>
          </div>
          <MissedCollectionLogDynamic trucks={trucks} />

          {/* Sticky: Route Replay header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 -mb-2 pt-2">
            <h2 className="text-sm font-display font-semibold text-foreground">
              Route Replay
            </h2>
          </div>
          <RouteReplay
            trucks={trucks}
            onReplayPath={setReplayPath}
            onReplayIndex={setReplayIndex}
          />
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-muted-foreground text-center pt-1">
        All changes are immediately reflected on the resident-facing Truck
        Tracking page · GPS updates via Socket.IO
      </p>
    </div>
  );
};

export default AdminTruckTracking;













