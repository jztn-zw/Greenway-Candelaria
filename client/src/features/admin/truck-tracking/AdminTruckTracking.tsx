import { badgeStyles } from "@/components/ui/badgeStyles";
import { AdminMessenger } from "./components/AdminMessenger";
import { useAdminQuery } from "@/lib/adminQuery";
import useAdminNotifications from "@/features/admin/notifications/useAdminNotifications";
import useAuthStore from "@/store/authStore";
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

import { AdminTruckTrackingPageSkeleton } from "@/components/PageLoadingSkeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCountUp } from "@/features/admin/dashboard/components/useCountUp";
import { useScheduledRouteOrder } from "@/features/collector/route-map/hooks/useAutoRoute";
import type { RouteStop } from "@/features/collector/route-map/types";
import { useThemeMode } from "@/hooks/useThemeMode";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import authService from "@/services/authService";
import { fetchBarangays, type BarangayLocationRow } from "@/services/barangaysService";
import {
fetchAdminTrackingOverview,
type AdminTrackingOverview,
type DriverMessageRow,
type DriverRow,
type LiveRow,
type TruckRouteRow,
type TruckRow,
} from "@/services/trackingService";
import {
Navigation,
PanelRightClose,
RotateCcw,
Truck
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import AdminTrackingMap from "./components/AdminTrackingMap";
import AdminTruckCard from "./components/AdminTruckCard";
import RouteReplay from "./components/RouteReplay";
import type { ReplayTargetLocation } from "./utils/replayTrip";
import type { AdminTruck, TruckStatus } from "./types";
import { isNewerMessage, loadSeenMessages, messagePosition, saveSeenMessages, unreadDriverMessageCount } from "./messageUnread";

// Config
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  String(import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "") ||
  "http://localhost:3000";
const FALLBACK_SYNC_INTERVAL = 8_000;
const RECONCILE_INTERVAL = 15_000;
const DRIVER_STALE_MS = 120_000;

const buildRouteMap = (routes: TruckRouteRow[], selectedByTruck: Record<string, string> = {}) => {
  const map = new Map<string, TruckRouteRow>();
  const priority: Record<string, number> = {
    ACTIVE: 0, PAUSED: 1, SCHEDULED: 2, COMPLETED: 3, PARTIAL: 4, CANCELLED: 5,
  };

  for (const route of routes) {
    if (String(route.route_status || "").toUpperCase() === "CANCELLED") continue;
    const current = map.get(route.truck_id);
    if (!current) {
      map.set(route.truck_id, route);
      continue;
    }
    if (selectedByTruck[route.truck_id] === route.route_id) {
      map.set(route.truck_id, route);
      continue;
    }
    if (selectedByTruck[route.truck_id] === current.route_id) continue;

    const candidateRank = priority[String(route.route_status || "").toUpperCase()] ?? 6;
    const currentRank = priority[String(current.route_status || "").toUpperCase()] ?? 6;
    if (candidateRank < currentRank ||
      (candidateRank === currentRank &&
        `${route.started_at ?? ""}:${route.route_id}` < `${current.started_at ?? ""}:${current.route_id}`)) {
      map.set(route.truck_id, route);
    }
  }

  return map;
};

//  Helpers

const normaliseStatus = (raw: string): TruckStatus => {
  const map: Record<string, TruckStatus> = {
    ON_THE_WAY: "on-the-way",
    PAUSED: "paused",
    OFFLINE: "offline",
    SCHEDULED: "scheduled",
    DONE: "offline",
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
    rawStatus === "paused" ||
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

const normalizeCoveragePath = (
  value: TruckRouteRow["stops"][number]["coverage_path"],
): [number, number][] | null => {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return null;
    const points = parsed.flatMap((point): [number, number][] => {
      if (!Array.isArray(point) || point.length < 2) return [];
      const latitude = Number(point[0]);
      const longitude = Number(point[1]);
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? [[latitude, longitude]]
        : [];
    });
    return points.length >= 2 ? points : null;
  } catch {
    return null;
  }
};

const resolveCurrentBarangay = (
  route: TruckRouteRow | undefined,
  fallback: string,
): string => {
  if (!route?.stops?.length) return fallback;

  const stops = route.stops.slice().sort((a, b) => a.order_index - b.order_index);

  const inProgress = stops.find((stop) => stop.status?.toUpperCase() === "IN_PROGRESS");
  if (inProgress) return inProgress.stop_name ?? inProgress.barangay_name;

  // Follow the collection route's ordered next stop rather than the nearest
  // barangay, which can be a different stop when roads curve or loop.
  const nextNotStarted = stops.find((stop) => stop.status?.toUpperCase() === "NOT_STARTED");
  if (nextNotStarted) return nextNotStarted.stop_name ?? nextNotStarted.barangay_name;

  const lastDone = [...stops].reverse().find((stop) => stop.status?.toUpperCase() === "DONE");
  if (lastDone) return lastDone.stop_name ?? lastDone.barangay_name;

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

  if (String(route?.route_status || "").toUpperCase() === "PAUSED") {
    return "paused";
  }

  if (route && (["COMPLETED", "PARTIAL"].includes(String(route.route_status || "").toUpperCase()) || isRouteFinished(route))) {
    return "offline";
  }
  if (String(route?.route_status || "").toUpperCase() === "SCHEDULED") {
    return "scheduled";
  }

  // A fresh GPS ping is the source of truth for a truck that has just resumed
  // tracking. This prevents a previously cached OFFLINE value from masking a
  // successful collector update in the admin view.
  if (liveStatus === "on-the-way" && hasFreshPing) {
    return "on-the-way";
  }

  // Explicit persisted overrides take precedence over route inference.
  if (persistedTruckStatus === "offline" || persistedTruckStatus === "done") return "offline";

  if (route) {
    if (String(route.route_status || "").toUpperCase() === "ACTIVE") {
      return "offline";
    }
    return "scheduled";
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
  senderName: pickDriverName(row.sender_name, fallbackDriverName, "MENRO Admin"),
  senderRole: row.sender_role,
  isRead: row.is_read,
});

const attachTruckMessages = (
  trucks: AdminTruck[],
  rows: DriverMessageRow[],
): AdminTruck[] => {
  const rowsByRoute = new Map<string, DriverMessageRow[]>();
  for (const row of rows) {
    if (!rowsByRoute.has(row.driver_id)) rowsByRoute.set(row.driver_id, []);
    rowsByRoute.get(row.driver_id)?.push(row);
  }
  for (const routeRows of rowsByRoute.values()) {
    routeRows.sort((a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    );
  }

  return trucks.map((truck) => ({
    ...truck,
    driverMessages: truck.driverId
      ? (rowsByRoute.get(truck.driverId) ?? []).map((row) =>
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
    route_status: truck.status === "done" ? "INACTIVE" : truck.status === "paused" ? "PAUSED" : "ACTIVE",
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
  operationalRouteMap: Map<string, TruckRouteRow>,
  allRoutes: TruckRouteRow[],
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
    const operationalRoute = operationalRouteMap.get(truck.id);
    const assignedDriver = driverByTruckId.get(truck.id);
    const routeDriver =
      route?.driver_id ? driverById.get(route.driver_id) : undefined;

    const stops =
      route?.stops.map((s) => {
        const coveragePath = normalizeCoveragePath(s.coverage_path);
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
          coveragePath?.[0] ??
          (stopLat !== null && stopLng !== null
            ? [stopLat, stopLng]
            : bLat !== null && bLng !== null
              ? [bLat, bLng]
              : undefined);

        return {
          name: s.stop_name ?? s.barangay_name,
          state: normaliseStopState(s.status),
          completedAt: s.completed_at ?? undefined,
          skippedReason: s.skipped_reason ?? undefined,
          coords,
          coveragePath,
        };
      }) ?? [];

    const resolvedStatus = resolveTrackedTruckStatus({
      truckStatus: truck.status,
      live,
      route: operationalRoute,
    });
    const isFinishedOrOffline =
      resolvedStatus === "offline" ||
      resolvedStatus === "done" ||
      (Number(operationalRoute?.total_stops) > 0 && Number(operationalRoute?.completed_stops) >= Number(operationalRoute?.total_stops));

    const finalStatus: TruckStatus = isFinishedOrOffline ? "offline" : resolvedStatus;
    const liveCoords = live && !isFinishedOrOffline ? ([live.latitude, live.longitude] as [number, number]) : null;

    return {
      id: truck.id,
      driverId:
        route ? (route.driver_id ?? null) : (assignedDriver?.id ?? null),
      routeId: route?.route_id ?? null,
      routeChoices: allRoutes
        .filter((candidate) => candidate.truck_id === truck.id && candidate.route_status !== "CANCELLED")
        .map((candidate) => ({
          id: candidate.route_id,
          name: candidate.route_name || `Route ${candidate.started_at || ""}`.trim(),
          status: String(candidate.route_status || "SCHEDULED"),
        })),
      driverUserId:
        route ? (route.driver_user_id ?? routeDriver?.user_id ?? null) : (assignedDriver?.user_id ?? null),
      name: truck.name,
      plateNumber: truck.plate_number,
      status: finalStatus,
      wasteType: route?.waste_type ?? truck.waste_type ?? "Not assigned",
      driver: pickDriverName(
        route ? route.driver_name : assignedDriver?.full_name,
        route ? routeDriver?.full_name : live?.driver_name,
      ),
      currentBarangay: resolveCurrentBarangay(route, "No route stop yet"),
      completedBarangays: route?.completed_stops ?? 0,
      totalBarangays: route?.total_stops ?? 0,
      coords: liveCoords,
      lastGpsUpdate: live && !isFinishedOrOffline ? elapsedLabel(live.last_ping) : "-",
      lastPingIso: live && !isFinishedOrOffline ? (live.last_ping ?? null) : null,
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
  operationalRouteMap: Map<string, TruckRouteRow>,
): AdminTruck[] => {
  const byId = new Map(liveRows.map((r) => [r.truck_id, r]));

  return prev.map((truck) => {
    const row = byId.get(truck.id);
    const routeSnapshot = operationalRouteMap.get(truck.id) ?? buildRouteSnapshotFromTruck(truck);

    if (!row) {
      const rawStatus = resolveTrackedTruckStatus({
        truckStatus: truck.status,
        route: routeSnapshot,
      });
      const isFinished =
        rawStatus === "offline" ||
        rawStatus === "done";
      const status: TruckStatus = isFinished ? "offline" : rawStatus;

      return {
        ...truck,
        status,
        coords: status === "on-the-way" || status === "paused" ? truck.coords : null,
        lastGpsUpdate: isFinished ? "-" : truck.lastGpsUpdate,
        lastPingIso: null,
      };
    }

    const rawStatus = resolveTrackedTruckStatus({
      truckStatus: row.truck_status,
      live: row,
      route: routeSnapshot,
    });
    const isFinished =
      rawStatus === "offline" ||
      rawStatus === "done";
    const status: TruckStatus = isFinished ? "offline" : rawStatus;

    return {
      ...truck,
      status,
      coords: status === "on-the-way" || status === "paused" ? [row.latitude, row.longitude] : null,
      lastGpsUpdate: isFinished ? "-" : elapsedLabel(row.last_ping),
      lastPingIso: isFinished ? null : row.last_ping,
      driver: truck.routeId ? truck.driver : pickDriverName(truck.driver, row.driver_name),
    };
  });
};

//  Component

type TrackingSidebarTab = "FLEET" | "REPLAY";
type TrackingStatusFilter = "ALL" | TruckStatus;
const pageTitle = "Live Fleet Tracking";
const pageDescription = "Real-time GPS telemetry, route execution, and dispatch controls for municipal trucks.";

const AdminTruckTracking = () => {
  const [trucks, setTrucks] = useState<AdminTruck[]>([]);
  const [todayRoutes, setTodayRoutes] = useState<TruckRouteRow[]>([]);
  const [focusedTruckId, setFocusedTruckId] = useState<string | null>(null);
  const [replayPath, setReplayPath] = useState<
    [number, number][] | undefined
  >();
  const [replayIndex, setReplayIndex] = useState<number | undefined>();
  const [replayTargetLocation, setReplayTargetLocation] = useState<ReplayTargetLocation | null>(null);
  const [replayCompletedTargets, setReplayCompletedTargets] = useState<ReplayTargetLocation[]>([]);
  const [replaySkippedTargets, setReplaySkippedTargets] = useState<ReplayTargetLocation[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSyncSuccess, setLastSyncSuccess] = useState(true);
  const [overviewFailed, setOverviewFailed] = useState(false);
  const [mobileView, setMobileView] = useState<"MAP" | "LIST">("MAP");
  const [sidebarTab, setSidebarTab] = useState<TrackingSidebarTab>("FLEET");
  const [isFleetPanelMinimized, setIsFleetPanelMinimized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mapTheme = useThemeMode();
  const adminId = useAuthStore((state) => state.user?.id);
  const [seenMessages, setSeenMessages] = useState(() => loadSeenMessages(adminId));
  useEffect(() => { setSeenMessages(loadSeenMessages(adminId)); }, [adminId]);
  const markConversationViewed = useCallback((driverId: string, message: { id: string; created_at: string }) => {
    if (!adminId) return;
    const position = messagePosition(message.id, message.created_at);
    if (!position) return;
    setSeenMessages((previous) => {
      if (!isNewerMessage(position, previous[driverId])) return previous;
      const next = { ...previous, [driverId]: position };
      saveSeenMessages(adminId, next);
      return next;
    });
  }, [adminId]);
  const { notifications, markAsRead: markNotificationAsRead } = useAdminNotifications();
  const unreadMessageNotifications = useMemo(() => {
    const byDriver = new Map<string, string[]>();
    for (const notification of notifications) {
      if (notification.is_read || notification.ref_module !== "driver-messages") continue;
      let driverId = notification.ref_id;
      if (!driverId) {
        try {
          const metadata = typeof notification.metadata === "string" ? JSON.parse(notification.metadata) : notification.metadata;
          if (metadata && typeof metadata.driver_id === "string") driverId = metadata.driver_id;
        } catch { /* Older notifications can have malformed metadata. */ }
      }
      if (!driverId) continue;
      const ids = byDriver.get(driverId) ?? [];
      ids.push(notification.id);
      byDriver.set(driverId, ids);
    }
    return byDriver;
  }, [notifications]);

  // The compact Fleet shortcut belongs only to the wide, side-by-side workspace.
  // Reset it when crossing into the single-view tablet/mobile layout so no
  // hidden panel state or duplicate control carries across breakpoints.
  useEffect(() => {
    const wideLayout = window.matchMedia("(min-width: 1280px)");
    const resetCompactFleet = () => {
      if (!wideLayout.matches) setIsFleetPanelMinimized(false);
    };

    resetCompactFleet();
    wideLayout.addEventListener("change", resetCompactFleet);
    return () => wideLayout.removeEventListener("change", resetCompactFleet);
  }, []);

  const trucksRef = useRef<AdminTruck[]>([]);
  const liveVersionRef = useRef(0);
  const latestLiveRowsRef = useRef<LiveRow[]>([]);
  const selectedRouteByTruckRef = useRef<Record<string, string>>({});
  const operationalRouteMapRef = useRef(new Map<string, TruckRouteRow>());
  const overviewSnapshotRef = useRef<{ overview: AdminTrackingOverview; barangays: BarangayLocationRow[] } | null>(null);
  trucksRef.current = trucks;

  const overviewQuery = useAdminQuery("tracking", ["overview"], async () => {
    const liveVersion = liveVersionRef.current;
    const [overview, barangays] = await Promise.all([fetchAdminTrackingOverview(), fetchBarangays()]);
    return { overview, barangays, liveVersion };
  }, { refetchInterval: socketConnected ? RECONCILE_INTERVAL : FALLBACK_SYNC_INTERVAL, staleTime: 0 });
  const { refetch: refetchOverview } = overviewQuery;
  const isPageLoading = overviewQuery.isLoading;
  const refreshTrackingData = useCallback(() => refetchOverview({ cancelRefetch: false, throwOnError: true }), [refetchOverview]);
  useEffect(() => {
    if (!overviewQuery.data) return;
    const { overview, barangays, liveVersion } = overviewQuery.data;
      const operationalRouteMap = buildRouteMap(overview.routes);
      const merged = buildTruckList(
        overview.trucks,
        buildRouteMap(overview.routes, selectedRouteByTruckRef.current),
        operationalRouteMap,
        overview.routes,
        overview.live,
        overview.drivers,
        barangays,
      );
      overviewSnapshotRef.current = { overview, barangays };
      operationalRouteMapRef.current = operationalRouteMap;
      if (liveVersion === liveVersionRef.current) latestLiveRowsRef.current = overview.live;
      const withLive = liveVersion === liveVersionRef.current
        ? merged : mergeLiveIntoTrucks(merged, latestLiveRowsRef.current, operationalRouteMap);
      setTodayRoutes(overview.routes);
      setTrucks(attachTruckMessages(withLive, overview.messages));
      setFocusedTruckId((prev) => {
        if (prev) return prev;
        const firstActive = withLive.find(
          (t) => t.status === "on-the-way" && Boolean(t.coords),
        );
        return firstActive ? firstActive.id : null;
      });
      setLastSyncSuccess(true);
      setOverviewFailed(false);
  }, [overviewQuery.data]);
  useEffect(() => {
    if (overviewQuery.error) { setLastSyncSuccess(false); setOverviewFailed(true); }
  }, [overviewQuery.error]);

  //  Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  //  Socket.IO with background throttling
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token: authService.getToken() },
      // In React development Strict Mode, the first effect is immediately
      // cleaned up. Delaying the connection prevents a websocket handshake
      // that would otherwise be opened and closed in the same render cycle.
      autoConnect: false,
      timeout: 10_000,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    const startFallbackSync = () => {
      if (!document.hidden) void refreshTrackingData().catch(() => {});
    };

    socket.on("connect", () => {
      setSocketConnected(true);
      setLastSyncSuccess(true);
      socket.emit("tracking:join");
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
      liveVersionRef.current += 1;
      latestLiveRowsRef.current = liveRows;
      setTrucks((prev) => mergeLiveIntoTrucks(prev, liveRows, operationalRouteMapRef.current));
      setLastSyncSuccess(true);
    });

    // Incremental update after each driver ping
    socket.on("live:update", (liveRows: LiveRow[]) => {
      liveVersionRef.current += 1;
      latestLiveRowsRef.current = liveRows;
      setTrucks((prev) => mergeLiveIntoTrucks(prev, liveRows, operationalRouteMapRef.current));
      setLastSyncSuccess(true);
    });

    // AdminLiveSync owns route-change HTTP refreshes for the admin layout.

    socket.on("live:error", (err: { code?: string; message: string }) => {
      console.error("[socket] live:error", err.message);
      if (err.code === "UNAUTHORIZED") {
        setSocketConnected(false);
        startFallbackSync();
      }
    });

    const connectTimer = window.setTimeout(() => socket.connect(), 0);

    return () => {
      window.clearTimeout(connectTimer);
      socket.emit("tracking:leave");
      socket.disconnect();
    };
  }, [refreshTrackingData]);

  //  Handlers

  const handleTruckClick = useCallback((truckId: string) => {
    setFocusedTruckId((prev) => (prev === truckId ? null : truckId));
  }, []);

  const handleMarkerClick = useCallback((truckId: string) => {
    setFocusedTruckId(truckId);
  }, []);

  const handleRouteChange = useCallback((truckId: string, routeId: string) => {
    selectedRouteByTruckRef.current = { ...selectedRouteByTruckRef.current, [truckId]: routeId };
    const snapshot = overviewSnapshotRef.current;
    if (!snapshot) return;
    const { overview, barangays } = snapshot;
    const rebuilt = buildTruckList(
      overview.trucks,
      buildRouteMap(overview.routes, selectedRouteByTruckRef.current),
      operationalRouteMapRef.current,
      overview.routes,
      latestLiveRowsRef.current,
      overview.drivers,
      barangays,
    );
    setTrucks(attachTruckMessages(rebuilt, overview.messages));
  }, []);

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

  // Keep the shared map neutral until an admin deliberately selects a truck.
  // A selected truck alone owns the displayed stop pins and route corridor.
  const activeTruck = useMemo(() => {
    if (focusedTruckId) {
      const match = displayTrucks.find((t) => t.id === focusedTruckId);
      if (match) return match;
    }
    return null;
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
        coveragePath: s.coveragePath ?? null,
        distanceKm: 0,
      }));
  }, [activeTruck?.id, activeTruck?.route]);

  const scheduledStops = useScheduledRouteOrder(rawStops);
  const activeStop = useMemo(
    () => scheduledStops.find((s) => s.status === "in-progress") ?? null,
    [scheduledStops]
  );
  const activeStopCoords = activeStop?.coords ?? null;

  //  KPI calculations
  const activeRouteTruckIds = new Set(todayRoutes
    .filter((route) => String(route.route_status || "").toUpperCase() === "ACTIVE")
    .map((route) => route.truck_id));
  const activeTrucks = displayTrucks.filter((truck) =>
    activeRouteTruckIds.has(truck.id) && truck.status === "on-the-way",
  ).length;
  const countedRoutes = todayRoutes.filter((route) => route.route_status !== "CANCELLED");
  const totalCompleted = countedRoutes.reduce((sum, route) => sum + Number(route.completed_stops || 0), 0);
  const totalStops = countedRoutes.reduce((sum, route) => sum + Number(route.total_stops || 0), 0);
  const completionPct =
    totalStops > 0 ? Math.round((totalCompleted / totalStops) * 100) : 0;
  const doneRoutes = countedRoutes.filter((route) =>
    ["COMPLETED", "PARTIAL"].includes(String(route.route_status || "").toUpperCase()),
  ).length;

  const animatedActive = useCountUp(activeTrucks);
  const animatedCompletion = useCountUp(completionPct);
  const animatedCompleted = useCountUp(totalCompleted);
  const animatedDone = useCountUp(doneRoutes);

  //  Render
  if (isPageLoading) {
    return <AdminTruckTrackingPageSkeleton title={pageTitle} description={pageDescription} />;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      <AdminMessenger drivers={overviewQuery.data?.overview.drivers ?? []} unreadMessageNotifications={unreadMessageNotifications} markNotificationAsRead={markNotificationAsRead} onConversationViewed={markConversationViewed} />
      {/* -- Page Header -- */}
      <div className="flex items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-title sm:text-ui-page-lg text-foreground tracking-tight">
              {pageTitle}
            </h1>
            <Badge variant="outline" className={"hidden sm:inline-flex text-ui-caption font-semibold " + badgeStyles.primary.className}>
              Candelaria
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {pageDescription}
          </p>
        </div>
      </div>

      {/* -- Executive Metric KPI Strip -- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        {[
          {
            title: "Trucks En Route",
            value: `${animatedActive}/${displayTrucks.length}`,
            description: `${activeTrucks} trucks reporting live GPS`,
            tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          },
          {
            title: "Stops Completed",
            value: `${animatedCompleted}/${totalStops}`,
            description: `${Math.max(0, totalStops - totalCompleted)} remaining stops`,
            tag: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
          },
          {
            title: "Fleet Progress",
            value: `${animatedCompletion}%`,
            description: "Today's scheduled stop progress",
            tag: "bg-muted/70 text-muted-foreground border-border/80",
          },
          {
            title: "Routes Closed",
            value: `${animatedDone}/${countedRoutes.length}`,
            description: `${doneRoutes} completed or partial runs`,
            tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          },
        ].map((kpi, idx) => (
          <div
            key={kpi.title}
            className={cn(
              "p-4 sm:p-5 flex flex-col justify-between space-y-2.5 transition-colors hover:bg-muted/15",
              idx % 2 === 0 ? "border-r border-border/70" : "",
              idx < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0",
              idx < 2 ? "border-b lg:border-b-0 border-border/70" : ""
            )}
          >
            <div className="flex items-center min-h-[22px]">
              <span
                className={cn(
                  "text-ui-overline font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                  kpi.tag
                )}
              >
                {kpi.title}
              </span>
            </div>

            <div className="gw-stat-value text-2xl sm:text-3xl text-foreground tracking-tight tabular-nums">
              {kpi.value}
            </div>

            <div className="text-ui-caption text-muted-foreground font-medium truncate">
              {kpi.description}
            </div>
          </div>
        ))}
      </div>

      {/* -- Single-view switcher for tablet and mobile -- */}
      <div className="flex xl:hidden justify-center pt-0.5 pb-1">
        <div className="bg-muted/70 p-1 rounded-xl border border-border/80 flex items-center gap-1 w-full max-w-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setMobileView("MAP")}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              mobileView === "MAP"
                ? "bg-card text-foreground shadow-2xs border border-border/60"
                : "gw-action-ghost "
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
                : "gw-action-ghost "
            )}
          >
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span>Fleet Controls</span>
          </button>
        </div>
      </div>

      {/* -- Main Workspace: Map + Control Sidebar -- */}
      <div className={cn(
        "relative grid gap-4 grid-cols-1 items-start",
        isFleetPanelMinimized ? "xl:grid-cols-1" : "xl:grid-cols-3",
      )}>
        {/* Left 2 Cols: Map View */}
        <div
          className={cn(
            "h-[430px] sm:h-[560px] xl:h-[700px]",
            isFleetPanelMinimized ? "xl:col-span-full" : "xl:col-span-2",
            mobileView === "LIST" ? "hidden xl:block" : "block",
          )}
        >
          <AdminTrackingMap
            trucks={displayTrucks}
            focusedTruckId={focusedTruckId}
            activeTruck={activeTruck}
            activeTruckCoords={activeTruckCoords}
            activeStop={activeStop}
            activeStopCoords={activeStopCoords}
            autoRoutedStops={scheduledStops}
            onMarkerClick={handleMarkerClick}
            onDeselectTruck={() => setFocusedTruckId(null)}
            replayPath={replayPath}
            replayIndex={replayIndex}
            replayTargetLocation={replayTargetLocation}
            replayCompletedTargets={replayCompletedTargets}
            replaySkippedTargets={replaySkippedTargets}
            fleetControlCollapsed={isFleetPanelMinimized}
            theme={mapTheme}
          />
        </div>

        {/* Right 1 Col: Tabbed Control Center */}
        <div
          className={cn(
            isFleetPanelMinimized
              ? "hidden xl:flex absolute top-3 right-3 z-20"
              : "rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-2xs h-auto max-h-[600px] sm:max-h-[680px] xl:max-h-[700px] xl:self-start flex flex-col overflow-hidden",
            mobileView === "MAP" ? "hidden xl:flex" : "flex",
          )}
        >
          {isFleetPanelMinimized ? (
            <button
              type="button"
              onClick={() => setIsFleetPanelMinimized(false)}
              className="gw-action-outline h-9 px-2.5 rounded-lg border backdrop-blur-md shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Fleet controls"
              aria-label="Open Fleet controls"
            >
              <Truck className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-ui-caption font-semibold">Fleet</span>
            </button>
          ) : (
            <>
          {/* Top Tab Switcher & Panel Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex-1 grid grid-cols-2 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/70 h-10 items-center">
              {[
                { id: "FLEET" as const, label: "Fleet", icon: Truck },
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
                        setReplayTargetLocation(null);
                        setReplayCompletedTargets([]);
                        setReplaySkippedTargets([]);
                      }
                      setSidebarTab(tab.id);
                    }}
                    className={cn(
                      "h-8 flex items-center justify-center gap-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer select-none",
                      isActive
                        ? "bg-card text-foreground font-semibold shadow-xs border border-border/80"
                        : "gw-action-ghost "
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsFleetPanelMinimized(true)}
              className="gw-action-outline hidden xl:flex h-10 w-10 rounded-lg border items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Minimize Fleet panel"
              aria-label="Minimize Fleet panel"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
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
                      {overviewFailed ? "Could not load fleet vehicles" : "No fleet vehicles found"}
                    </p>
                    <p className="text-ui-caption text-muted-foreground max-w-xs mx-auto">
                      {overviewFailed
                        ? "The tracking service did not return the fleet list. Try again."
                        : "There are currently no trucks configured for live tracking."}
                    </p>
                    {overviewFailed && (
                      <Button variant="outline" size="sm" disabled={isRefreshing} onClick={() => void handleManualRefresh()}>
                        {isRefreshing ? "Retrying..." : "Retry"}
                      </Button>
                    )}
                  </div>
                ) : (
                  displayTrucks.map((truck) => (
                    <AdminTruckCard
                      key={truck.id}
                      truck={truck}
                      unreadMessageCount={unreadDriverMessageCount(truck.driverMessages, truck.driverId ? seenMessages[truck.driverId] : undefined)}
                      isSelected={focusedTruckId === truck.id}
                      onClick={() => handleTruckClick(truck.id)}
                      onRouteChange={(routeId) => handleRouteChange(truck.id, routeId)}
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
                onReplayTargetLocation={setReplayTargetLocation}
                onReplayCompletedTargets={setReplayCompletedTargets}
                onReplaySkippedTargets={setReplaySkippedTargets}
              />
            )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-ui-caption text-muted-foreground text-center pt-1">
        All changes are immediately reflected on the resident-facing Truck
        Tracking page · GPS updates via authenticated Socket.IO with secure REST fallback
      </p>
    </div>
  );
};

export default AdminTruckTracking;

