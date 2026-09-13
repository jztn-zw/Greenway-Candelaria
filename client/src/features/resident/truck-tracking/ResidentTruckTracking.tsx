import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { AlertTriangle, RefreshCw, Truck as TruckIcon } from "lucide-react";
import TrackingMap from "./TrackingMap";
import ProximityAlert from "./ProximityAlert";
import CountdownBanner from "./CountdownBanner";
import type { Truck, CollectionDayStatus, CollectionSchedule } from "./types";
import { PageHeaderSkeleton, MapPanelSkeleton } from "@/components/PageLoadingSkeletons";
import authService from "@/services/authService";
import { fetchBarangays } from "@/services/barangaysService";
import { fetchRoutes, type ApiRoute } from "@/services/routesService";
import api from "@/lib/api";
import {
  fetchAllTrucks,
  fetchLiveTrucks,
  fetchTodayRoutes,
  type LiveRow,
  type TruckRow,
  type TruckRouteRow,
} from "@/services/trackingService";
import {
  calculateDistanceInKilometers,
  formatCollectionTime,
  normaliseId,
  parseCoordinate,
} from "./truckTracking.utils";
import type { RoadRouteResult } from "@/services/roadRoutingService";

const REFRESH_MS = 4_000;
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  String(import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "") ||
  "http://localhost:3000";

const DAY_ORDER = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const STATUS_LABEL: Record<string, Truck["status"]> = {
  ON_THE_WAY: "on-the-way",
  SCHEDULED: "scheduled",
  PAUSED: "paused",
  DONE: "done",
  OFFLINE: "offline",
};

const normaliseTruckStatus = (raw?: string): Truck["status"] =>
  STATUS_LABEL[String(raw || "").toUpperCase()] ?? "offline";

const STALE_PING_MS = 120_000;

const parseBackendDate = (value?: string | null): number | null => {
  if (!value) return null;

  const match = String(value).match(
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
    const now = Date.now();
    return Math.abs(now - localMs) <= Math.abs(now - utcMs) ? localMs : utcMs;
  }

  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : parsed;
};

const isPingFresh = (value?: string | null, now = Date.now()) => {
  const parsed = parseBackendDate(value);
  return parsed !== null && now - parsed <= STALE_PING_MS;
};

const normaliseStopStatus = (
  raw?: string,
): "done" | "in-progress" | "not-started" | "skipped" => {
  const key = String(raw || "").toUpperCase();
  if (key === "DONE") return "done";
  if (key === "IN_PROGRESS") return "in-progress";
  if (key === "MISSED" || key === "SKIPPED") return "skipped";
  return "not-started";
};

const isTerminalStopStatus = (raw?: string) => {
  const key = String(raw || "").toUpperCase();
  return key === "DONE" || key === "MISSED" || key === "SKIPPED";
};

const isRouteFinished = (route?: TruckRouteRow) => {
  if (!route) return false;

  const stops = route.stops ?? [];
  if (stops.length === 0) return false;
  return stops.every((stop) => isTerminalStopStatus(stop.status));
};

const isRouteClosedForTheDay = (route?: TruckRouteRow) => {
  if (!route || String(route.route_status || "").toUpperCase() !== "INACTIVE") {
    return false;
  }

  const stops = route.stops ?? [];
  return stops.length > 0 && stops.every((stop) => isTerminalStopStatus(stop.status));
};

const resolveResidentTruckStatus = (
  truckStatus: string,
  live: LiveRow | undefined,
  route?: TruckRouteRow,
  now = Date.now(),
): Truck["status"] => {
  const liveStatus = live ? normaliseTruckStatus(live.truck_status) : null;
  const hasFreshPing = live ? isPingFresh(live.last_ping, now) : false;
  const persistedTruckStatus = normaliseTruckStatus(truckStatus);

  if (String(route?.route_status || "").toUpperCase() === "PAUSED") {
    return "paused";
  }

  if (route && isRouteClosedForTheDay(route)) {
    return persistedTruckStatus === "offline" ? "offline" : "done";
  }

  if (route) {
    return liveStatus === "on-the-way" && hasFreshPing ? "on-the-way" : "scheduled";
  }

  if (liveStatus === "on-the-way" && !hasFreshPing) {
    return "offline";
  }

  return liveStatus ?? persistedTruckStatus;
};

const getRoutePriority = (route?: TruckRouteRow) => {
  if (!route) return -1;

  const status = String(route.route_status || "").toUpperCase();
  if (status === "PAUSED") return 4;
  if (status === "ACTIVE") return 3;
  if (status === "IN_PROGRESS") return 2;
  if (status === "SCHEDULED") return 1;
  if (status === "INACTIVE") return 0;
  return route.stops?.some((stop) => !isTerminalStopStatus(stop.status)) ? 2 : 0;
};

const pickBestTodayRoute = (
  current: TruckRouteRow | undefined,
  candidate: TruckRouteRow,
) => {
  if (!current) return candidate;

  const currentPriority = getRoutePriority(current);
  const candidatePriority = getRoutePriority(candidate);

  if (candidatePriority !== currentPriority) {
    return candidatePriority > currentPriority ? candidate : current;
  }

  if (isRouteFinished(current) !== isRouteFinished(candidate)) {
    return isRouteFinished(candidate) ? current : candidate;
  }

  return candidate;
};

const computeBarangaysAway = (
  route: TruckRouteRow | undefined,
  residentBarangayId: string | null,
) => {
  if (!route || !residentBarangayId || route.stops.length === 0) return null;

  const sortedStops = [...route.stops].sort((a, b) => a.order_index - b.order_index);
  const residentIdx = sortedStops.findIndex(
    (s) => normaliseId(s.barangay_id) === normaliseId(residentBarangayId),
  );
  if (residentIdx === -1) return null;

  const nextIdx = sortedStops.findIndex((s) => {
    const key = String(s.status || "").toUpperCase();
    return key !== "DONE" && key !== "MISSED" && key !== "SKIPPED";
  });

  if (nextIdx === -1) return 0;
  return Math.max(0, residentIdx - nextIdx);
};

const getCurrentDayIndex = () => new Date().getDay();
const toRelativeDayLabel = (offset: number) => {
  if (offset === 0) return "today";
  if (offset === 1) return "tomorrow";
  return DAY_ORDER[(getCurrentDayIndex() + offset) % 7].toLowerCase();
};

const buildSchedule = (
  routes: ApiRoute[],
  residentBarangayId: string | null,
  residentCollectionFinishedToday = false,
): CollectionSchedule => {
  const residentRoutes = routes.filter((route) =>
    String(route.status || "").toUpperCase() !== "INACTIVE" &&
    route.stops.some(
      (stop) => normaliseId(stop.barangay_id) === normaliseId(residentBarangayId),
    ),
  );

  if (residentRoutes.length === 0) {
    return {
      nextCollectionDay: "soon",
      nextCollectionTime: "TBD",
      nextCollectionDate: new Date(),
    };
  }

  const routeByDay = new Map<string, ApiRoute>();
  for (const route of residentRoutes) {
    if (!routeByDay.has(route.day_of_week)) {
      routeByDay.set(route.day_of_week, route);
    }
  }

  const todayIndex = getCurrentDayIndex();
  // Once the collector has closed the resident's route, the schedule card
  // should point to the next collection instead of a collection that is over.
  const firstOffset = residentCollectionFinishedToday ? 1 : 0;
  for (let offset = firstOffset; offset <= 7; offset += 1) {
    const day = DAY_ORDER[(todayIndex + offset) % 7];
    const route = routeByDay.get(day);
    if (!route) continue;

    const date = new Date();
    date.setDate(date.getDate() + offset);

    return {
      nextCollectionDay: toRelativeDayLabel(offset),
      nextCollectionTime: formatCollectionTime(route.start_time),
      nextCollectionDate: date,
      wasteType: route.waste_type ?? undefined,
    };
  }

  return {
    nextCollectionDay: "soon",
    nextCollectionTime: "TBD",
    nextCollectionDate: new Date(),
  };
};

const ResidentTruckTracking = () => {
  const currentUser = authService.getCurrentUser();
  const [isLoading, setIsLoading] = useState(true);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [schedule, setSchedule] = useState<CollectionSchedule>({
    nextCollectionDay: "soon",
    nextCollectionTime: "TBD",
    nextCollectionDate: new Date(),
  });
  const [residentArea, setResidentArea] = useState(
    String((currentUser as { barangay_name?: string | null } | null)?.barangay_name || "My Barangay"),
  );
  const [residentCoords, setResidentCoords] = useState<[number, number] | null>(null);
  const [residentBarangayId, setResidentBarangayId] = useState<string | null>(
    normaliseId(currentUser?.barangay_id),
  );
  const [focusedTruckId, setFocusedTruckId] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const loadDynamicData = useCallback(async () => {
    const [barangaysResult, allTrucksResult, liveResult, todayRoutesResult, routesResult] =
      await Promise.allSettled([
        fetchBarangays(),
        fetchAllTrucks(),
        fetchLiveTrucks(),
        fetchTodayRoutes(),
        fetchRoutes(),
      ]);

    if (
      barangaysResult.status !== "fulfilled" ||
      allTrucksResult.status !== "fulfilled" ||
      liveResult.status !== "fulfilled" ||
      todayRoutesResult.status !== "fulfilled" ||
      routesResult.status !== "fulfilled"
    ) {
      setTrackingError("Live tracking data could not be refreshed. Showing the last available information.");
      return;
    }

    const barangays = barangaysResult.value;
    const allTrucks = allTrucksResult.value;
    const liveRows = liveResult.value;
    const todayRoutes = todayRoutesResult.value;
    const allRoutes = routesResult.value;
    setTrackingError(null);

    const residentBarangay = barangays.find(
      (b) => normaliseId(b.id) === normaliseId(residentBarangayId),
    );
    if (residentBarangay?.name) {
      setResidentArea(residentBarangay.name);
    }

    const residentLat = parseCoordinate(residentBarangay?.latitude);
    const residentLng = parseCoordinate(residentBarangay?.longitude);
    const hasResidentCoords = residentLat !== null && residentLng !== null;
    if (hasResidentCoords) {
      setResidentCoords((prev) =>
        prev?.[0] === residentLat && prev?.[1] === residentLng
          ? prev
          : [residentLat, residentLng],
      );
    }
    const effectiveResidentCoords: [number, number] | null = hasResidentCoords
      ? [residentLat, residentLng]
      : residentCoords;

    const liveByTruckId = new Map(liveRows.map((row) => [row.truck_id, row]));
    const barangayCoordsById = new Map(
      barangays.flatMap((barangay) => {
        const latitude = parseCoordinate(barangay.latitude);
        const longitude = parseCoordinate(barangay.longitude);
        const id = normaliseId(barangay.id);
        return id && latitude !== null && longitude !== null
          ? [[id, [latitude, longitude] as [number, number]] as const]
          : [];
      }),
    );
    const todayRouteByTruckId = new Map<string, TruckRouteRow>();
    for (const route of todayRoutes) {
      const current = todayRouteByTruckId.get(route.truck_id);
      todayRouteByTruckId.set(route.truck_id, pickBestTodayRoute(current, route));
    }

    const mappedTrucks: Truck[] = allTrucks.map((truck: TruckRow) => {
      const live = liveByTruckId.get(truck.id);
      const route = todayRouteByTruckId.get(truck.id);

      const liveLatitude = parseCoordinate(live?.latitude);
      const liveLongitude = parseCoordinate(live?.longitude);
      const coords =
        liveLatitude !== null && liveLongitude !== null
          ? ([liveLatitude, liveLongitude] as [number, number])
          : null;
      const distanceKm = coords && effectiveResidentCoords
        ? calculateDistanceInKilometers(coords, effectiveResidentCoords)
        : null;
      const eta = distanceKm !== null ? Math.max(1, Math.round((distanceKm / 20) * 60)) : null;

      const barangaysAway = computeBarangaysAway(route, residentBarangayId);
      const isResidentTruck = Boolean(
        route?.stops.some(
          (stop) => normaliseId(stop.barangay_id) === normaliseId(residentBarangayId),
        ),
      );

      const routeStops = (route?.stops ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((stop: TruckRouteRow["stops"][number]) => ({
          barangay: stop.barangay_name,
          status: normaliseStopStatus(stop.status),
          coords:
            (() => {
              const latitude = parseCoordinate(stop.latitude);
              const longitude = parseCoordinate(stop.longitude);
              return latitude !== null && longitude !== null
                ? [latitude, longitude] as [number, number]
                : barangayCoordsById.get(normaliseId(stop.barangay_id) ?? "") ?? null;
            })(),
          completedAt: stop.completed_at ? formatCollectionTime(stop.completed_at) : undefined,
          skippedReason: stop.skipped_reason ?? undefined,
          isResidentBarangay: normaliseId(stop.barangay_id) === normaliseId(residentBarangayId),
        }));

      const residentStop = routeStops.find((s) => s.isResidentBarangay);

      const status = resolveResidentTruckStatus(
        truck.status,
        live,
        route,
      );

      return {
        id: truck.id,
        name: truck.name,
        plateNumber: truck.plate_number,
        status,
        wasteType: route?.waste_type ?? truck.waste_type ?? "",
        driver: live?.driver_name ?? route?.driver_name ?? "",
        assignedArea: route?.route_name ?? residentBarangay?.name ?? "",
        completedBarangays: route?.completed_stops ?? 0,
        totalBarangays: route?.total_stops ?? 0,
        coords,
        eta,
        isResidentTruck,
        barangaysAway,
        arrivedAtResident: Boolean(distanceKm !== null && distanceKm <= 0.2),
        routeStops,
        routeClosedForTheDay: isRouteClosedForTheDay(route),
        residentStopStatus: residentStop ? residentStop.status : null,
        residentStopCompletedAt: residentStop?.completedAt,
      };
    });

    const residentCollectionFinished = todayRoutes.some(
      (route) =>
        route.stops.some(
          (stop) => normaliseId(stop.barangay_id) === normaliseId(residentBarangayId),
        ) && isRouteClosedForTheDay(route),
    );

    setTrucks(mappedTrucks);
    setSchedule(buildSchedule(allRoutes, residentBarangayId, residentCollectionFinished));
  }, [residentBarangayId, residentCoords]);

  // Keep socket event handlers current without recreating a connection when
  // location/profile data changes during the page's initial load.
  const loadDynamicDataRef = useRef(loadDynamicData);
  useEffect(() => {
    loadDynamicDataRef.current = loadDynamicData;
  }, [loadDynamicData]);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token: authService.getToken() },
      // React development Strict Mode immediately cleans up the first effect.
      // Delay the handshake so that cleanup can cancel it instead of closing an
      // in-progress WebSocket connection.
      autoConnect: false,
      timeout: 10_000,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    const syncResidentTracking = () => {
      void loadDynamicDataRef.current();
    };

    socket.on("connect", () => {
      socket.emit("tracking:join");
      syncResidentTracking();
    });

    socket.on("live:snapshot", syncResidentTracking);
    socket.on("live:update", syncResidentTracking);
    socket.on("routes:update", syncResidentTracking);

    const connectTimer = window.setTimeout(() => socket.connect(), 0);

    return () => {
      window.clearTimeout(connectTimer);
      socket.emit("tracking:leave");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfileBarangay = async () => {
      try {
        const [me, profileRes] = await Promise.all([
          authService.getMe(),
          api.get("/users/profile").catch(() => null),
        ]);
        if (cancelled) return;

        const profile = profileRes?.data?.data as
          | { barangay_id?: string | number | null; barangay_name?: string | null }
          | undefined;

        const latestBarangayId = normaliseId(profile?.barangay_id ?? me.barangay_id);
        const latestBarangayName = String(
          profile?.barangay_name ??
            (me as { barangay_name?: string | null }).barangay_name ??
            "",
        ).trim();

        setResidentBarangayId(latestBarangayId);
        if (latestBarangayName) {
          setResidentArea(latestBarangayName);
        }

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...currentUser,
            ...me,
            barangay_id: latestBarangayId,
            barangay_name: latestBarangayName || (currentUser as { barangay_name?: string | null } | null)?.barangay_name || null,
          }),
        );
      } catch {
        // Fallback to existing local session data.
      }
    };

    void loadProfileBarangay();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await loadDynamicData();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    const interval = setInterval(() => {
      void loadDynamicData();
    }, REFRESH_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadDynamicData]);

  const residentTrucks = useMemo(
    () => trucks.filter((truck) => truck.isResidentTruck),
    [trucks],
  );

  const hasActiveTrucks = residentTrucks.some((t) => t.status === "on-the-way");
  const residentCollectionFinalized = residentTrucks.some((truck) => truck.routeClosedForTheDay);
  const hasLiveTrackingForResident =
    hasActiveTrucks && !residentCollectionFinalized;

  const proximityTruck = residentTrucks.find(
    (t) =>
      t.status === "on-the-way" &&
      t.barangaysAway !== null &&
      t.barangaysAway <= 3,
  );

  const collectionDayStatus: CollectionDayStatus = useMemo(() => {
    // A completed stop is final for this resident, even if the collector pauses
    // before finishing the rest of the route for other barangays.
    if (residentCollectionFinalized) return "completed";
    if (hasActiveTrucks) return "active";
    if (residentTrucks.some((t) => t.status === "paused")) return "paused";
    if (residentTrucks.some((t) => t.status === "scheduled")) {
      return "scheduled-not-started";
    }
    return "not-collection-day";
  }, [hasActiveTrucks, residentCollectionFinalized, residentTrucks]);

  const nextCollectionInfo = `Your next collection day is ${schedule.nextCollectionDay}${
    schedule.wasteType ? ` - ${schedule.wasteType}` : ""
  }.`;

  const handleTruckClick = (truckId: string) => {
    setFocusedTruckId((prev) => (prev === truckId ? null : truckId));
  };

  const handleRoadRouteCalculated = useCallback(
    (truckId: string, roadRoute: RoadRouteResult) => {
      setTrucks((currentTrucks) =>
        currentTrucks.map((truck) =>
          truck.id === truckId &&
          (truck.eta !== roadRoute.durationMinutes ||
            truck.roadDistanceKm !== roadRoute.distanceKm)
            ? {
                ...truck,
                eta: roadRoute.durationMinutes,
                roadDistanceKm: roadRoute.distanceKm,
              }
            : truck,
        ),
      );
    },
    [],
  );

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-3.5 sm:space-y-4 px-2 sm:px-4">
        <PageHeaderSkeleton />
        <MapPanelSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-3.5 sm:space-y-4 px-2 sm:px-4">
      {/* ── Page Header ── */}
      <div className="pb-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
          Truck Tracking
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Track your scheduled waste collection in real time.
        </p>
      </div>

      {trackingError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{trackingError}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadDynamicData()}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-amber-500/10 sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {!residentCoords && !trackingError && (
        <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card p-3.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          Your barangay location is not configured yet, so distance and arrival estimates are unavailable.
        </div>
      )}

      {hasLiveTrackingForResident && proximityTruck && (
        <ProximityAlert truck={proximityTruck} />
      )}
      <CountdownBanner schedule={schedule} residentArea={residentArea} />

      <div className="h-[390px] sm:h-[480px] lg:h-[580px]">
        <TrackingMap
          trucks={residentTrucks}
          focusedTruckId={focusedTruckId}
          residentBarangayCoords={residentCoords}
          residentAreaName={residentArea}
          lockedToBarangay={false}
          collectionDayStatus={collectionDayStatus}
          nextCollectionInfo={nextCollectionInfo}
          onRouteCalculated={handleRoadRouteCalculated}
          onSelectTruck={handleTruckClick}
        />
      </div>
    </div>
  );
};

export default ResidentTruckTracking;
