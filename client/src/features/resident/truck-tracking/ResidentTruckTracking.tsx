import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { AlertTriangle, CheckCircle2, Truck as TruckIcon } from "lucide-react";
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
const FALLBACK_RESIDENT_COORDS: [number, number] = [14.0424, 121.4234];
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

  if (String(route.route_status || "").toUpperCase() === "INACTIVE") {
    return true;
  }

  const stops = route.stops ?? [];
  if (stops.length === 0) return false;
  return stops.every((stop) => isTerminalStopStatus(stop.status));
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

  if (route && isRouteFinished(route)) {
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
): CollectionSchedule => {
  const residentRoutes = routes.filter((route) =>
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
  for (let offset = 0; offset < 7; offset += 1) {
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

const hasRouteCollectionCompleted = (truck: Truck) =>
  truck.routeStops.length > 0 &&
  truck.routeStops.every(
    (stop) => stop.status === "done" || stop.status === "skipped",
  );

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
  const [residentCoords, setResidentCoords] = useState<[number, number]>(FALLBACK_RESIDENT_COORDS);
  const [residentBarangayId, setResidentBarangayId] = useState<string | null>(
    normaliseId(currentUser?.barangay_id),
  );
  const [focusedTruckId, setFocusedTruckId] = useState<string | null>(null);

  const loadDynamicData = useCallback(async () => {
    const [barangaysResult, allTrucksResult, liveResult, todayRoutesResult, routesResult] =
      await Promise.allSettled([
        fetchBarangays(),
        fetchAllTrucks(),
        fetchLiveTrucks(),
        fetchTodayRoutes(),
        fetchRoutes(),
      ]);

    const barangays = barangaysResult.status === "fulfilled" ? barangaysResult.value : [];
    const allTrucks = allTrucksResult.status === "fulfilled" ? allTrucksResult.value : [];
    const liveRows = liveResult.status === "fulfilled" ? liveResult.value : [];
    const todayRoutes = todayRoutesResult.status === "fulfilled" ? todayRoutesResult.value : [];
    const allRoutes = routesResult.status === "fulfilled" ? routesResult.value : [];

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
        prev[0] === residentLat && prev[1] === residentLng
          ? prev
          : [residentLat, residentLng],
      );
    }
    const effectiveResidentCoords: [number, number] =
      hasResidentCoords
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
      const distanceKm = coords ? calculateDistanceInKilometers(coords, effectiveResidentCoords) : null;
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
        driverMessage: null,
        isResidentTruck,
        barangaysAway,
        arrivedAtResident: Boolean(distanceKm !== null && distanceKm <= 0.2),
        routeStops,
        residentStopStatus: residentStop ? residentStop.status : null,
        residentStopCompletedAt: residentStop?.completedAt,
      };
    });

    setTrucks(mappedTrucks);
    setSchedule(buildSchedule(allRoutes, residentBarangayId));
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
  const allDone =
    residentTrucks.length > 0 &&
    residentTrucks.every((truck) => hasRouteCollectionCompleted(truck));
  const residentCollectionFinalized = residentTrucks.some(
    (truck) =>
      truck.residentStopStatus === "done" ||
      truck.residentStopStatus === "skipped",
  );
  const residentOutcomeTruck = residentTrucks.find(
    (truck) =>
      truck.residentStopStatus === "done" ||
      truck.residentStopStatus === "skipped",
  );
  const residentCollectionMissed =
    residentOutcomeTruck?.residentStopStatus === "skipped";
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
    if (allDone) return "completed";
    if (residentTrucks.some((t) => t.status === "paused")) return "paused";
    if (residentTrucks.some((t) => t.status === "scheduled")) {
      return "scheduled-not-started";
    }
    return "not-collection-day";
  }, [allDone, hasActiveTrucks, residentCollectionFinalized, residentTrucks]);

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
      <div className="flex items-center gap-3 pb-1">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
          <TruckIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
            Truck Tracking
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Your registered barangay:</span>
            <span className="font-semibold text-primary">{residentArea}</span>
          </p>
        </div>
      </div>

      {hasLiveTrackingForResident && proximityTruck && (
        <ProximityAlert truck={proximityTruck} />
      )}
      {residentOutcomeTruck ? (
        <div className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-2xs ${
          residentCollectionMissed
            ? "bg-destructive/5 border-destructive/25"
            : "bg-emerald-500/5 border-emerald-500/25"
        }`}>
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
            residentCollectionMissed
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          }`}>
            {residentCollectionMissed ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-xs sm:text-sm font-display font-bold text-foreground tracking-tight">
              {residentCollectionMissed ? "Collection missed today" : "Collection completed today"}
            </h3>
            <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              {residentCollectionMissed
                ? `Waste collection in ${residentArea} was not completed today.`
                : `Waste collection in ${residentArea} was completed${residentOutcomeTruck.residentStopCompletedAt ? ` at ${residentOutcomeTruck.residentStopCompletedAt}` : ""}.`}
            </p>
          </div>
        </div>
      ) : (
        <CountdownBanner
          schedule={schedule}
          hasActiveTrucks={hasLiveTrackingForResident}
        />
      )}

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

      {hasLiveTrackingForResident && (
        <p className="text-[11px] text-muted-foreground text-center pt-1 pb-2">
          GPS updates transmitted live
        </p>
      )}
    </div>
  );
};

export default ResidentTruckTracking;
