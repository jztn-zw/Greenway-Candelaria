import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { AlertTriangle, RefreshCw, Truck as TruckIcon } from "lucide-react";
import TrackingMap from "./TrackingMap";
import ProximityAlert from "./ProximityAlert";
import CountdownBanner from "./CountdownBanner";
import type { Truck, CollectionDayStatus, CollectionSchedule } from "./types";
import { ResidentTrackingSkeleton } from "@/components/PageLoadingSkeletons";
import { fetchBarangays } from "@/services/barangaysService";
import { fetchRoutes, type ApiRoute } from "@/services/routesService";
import useAuthStore from "@/store/authStore";
import { residentKey, useResidentQuery, useResidentResource } from "@/lib/residentQuery";
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
import { getManilaNow, parseApiTimestamp } from "@/utils/date";

const REFRESH_MS = 30_000;
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
  return parseApiTimestamp(value)?.getTime() ?? null;
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

const matchesResidentStop = (
  stop: TruckRouteRow["stops"][number],
  residentStreetId: string | null,
  residentBarangayId: string | null,
) => normaliseId(stop.barangay_id) === residentBarangayId &&
  (!stop.street_id || normaliseId(stop.street_id) === residentStreetId);

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
  if (!route || !["INACTIVE", "COMPLETED", "PARTIAL", "CANCELLED"].includes(String(route.route_status || "").toUpperCase())) {
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
  const hasFreshPing = Boolean(live && isPingFresh(live.last_ping, now) &&
    parseCoordinate(live.latitude) !== null && parseCoordinate(live.longitude) !== null);
  const persistedTruckStatus = normaliseTruckStatus(truckStatus);

  if (String(route?.route_status || "").toUpperCase() === "PAUSED") {
    return "paused";
  }

  if (route && isRouteClosedForTheDay(route)) {
    return persistedTruckStatus === "offline" ? "offline" : "done";
  }

  if (route) {
    return liveStatus === "on-the-way" && hasFreshPing ? "on-the-way" : route.collection_started_at ? "offline" : "scheduled";
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

const computeStopsAway = (
  route: TruckRouteRow | undefined,
  residentStreetId: string | null,
  residentBarangayId: string | null,
) => {
  if (!route || (!residentStreetId && !residentBarangayId) || route.stops.length === 0) return null;

  const sortedStops = [...route.stops].sort((a, b) => a.order_index - b.order_index);
  const residentIdx = sortedStops.findIndex(
    (stop) => matchesResidentStop(stop, residentStreetId, residentBarangayId),
  );
  if (residentIdx === -1) return null;

  const nextIdx = sortedStops.findIndex((s) => {
    const key = String(s.status || "").toUpperCase();
    return key !== "DONE" && key !== "MISSED" && key !== "SKIPPED";
  });

  if (sortedStops[residentIdx].stops_before !== undefined) return sortedStops[residentIdx].stops_before!;
  if (nextIdx === -1) return 0;
  return Math.max(0, residentIdx - nextIdx);
};

const getCurrentDayIndex = () => getManilaNow().weekdayIndex;
const toRelativeDayLabel = (offset: number) => {
  if (offset === 0) return "today";
  if (offset === 1) return "tomorrow";
  return DAY_ORDER[(getCurrentDayIndex() + offset) % 7].toLowerCase();
};

const buildSchedule = (
  routes: ApiRoute[],
  residentStreetId: string | null,
  residentBarangayId: string | null,
  residentCollectionFinishedToday = false,
): CollectionSchedule => {
  const residentRoutes = routes.filter((route) =>
    String(route.status || "").toUpperCase() !== "INACTIVE" &&
    route.stops.some(
      (stop) => normaliseId(stop.barangay_id) === residentBarangayId && (!stop.street_id || normaliseId(stop.street_id) === residentStreetId),
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
  // After today's street collection ends, this card answers one question only:
  // is the same resident street scheduled again tomorrow?
  const offsetsToCheck = residentCollectionFinishedToday
    ? [1]
    : Array.from({ length: 8 }, (_, offset) => offset);

  for (const offset of offsetsToCheck) {
    const day = DAY_ORDER[(todayIndex + offset) % 7];
    const route = routeByDay.get(day);
    if (!route) continue;

    const manilaToday = getManilaNow();
    const date = new Date(Date.UTC(
      manilaToday.year,
      manilaToday.month - 1,
      manilaToday.day + offset,
    ));

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
  const client = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const residentStreetLabel = currentUser?.street_name
    ? `${currentUser.street_name}${currentUser.street_area ? ` (${currentUser.street_area})` : ""}`
    : null;
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [routeTemplates, setRouteTemplates] = useState<ApiRoute[]>([]);
  const [residentArea, setResidentArea] = useState(
    residentStreetLabel || String(currentUser?.barangay_name || "My Barangay"),
  );
  const [residentBarangayName, setResidentBarangayName] = useState(
    String(currentUser?.barangay_name || ""),
  );
  const [residentCoords, setResidentCoords] = useState<[number, number] | null>(null);
  const residentBarangayId = normaliseId(currentUser?.barangay_id);
  const residentStreetId = normaliseId(currentUser?.street_id);
  const [focusedTruckId, setFocusedTruckId] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [hasInitialSnapshot, setHasInitialSnapshot] = useState(false);

  const lastLive = useRef<LiveRow[] | null>(null);
  const liveVersion = useRef(0);
  const planQuery = useResidentQuery("tracking", ["plan"],
    () => Promise.all([fetchBarangays(), fetchAllTrucks(), fetchTodayRoutes(), fetchRoutes()]), { refetchInterval: REFRESH_MS });
  const liveQuery = useResidentResource<LiveRow[]>("tracking", ["live"], async () => {
    const version = liveVersion.current;
    const rows = await fetchLiveTrucks();
    return version === liveVersion.current ? rows : lastLive.current ?? rows;
  }, [], { refetchInterval: REFRESH_MS });
  const setLive = liveQuery.setData;
  const refetchPlan = planQuery.refetch;
  const refetchLive = liveQuery.refetch;
  const isLoading = planQuery.isLoading || liveQuery.isLoading;
  const queryError = planQuery.isError || liveQuery.isError;
  useEffect(() => {
    if (queryError) setTrackingError("Tracking could not be refreshed. Last known information may be outdated.");
  }, [queryError]);
  const loadDynamicData = useCallback(async (incoming?: LiveRow[]) => {
    if (!planQuery.data) return;
    const [barangays, allTrucks, todayRoutes, allRoutes] = planQuery.data;
    const liveRows = incoming ?? liveQuery.data;
    lastLive.current = liveRows;
    if (!queryError) setTrackingError(null);

    const residentBarangay = barangays.find(
      (b) => normaliseId(b.id) === normaliseId(residentBarangayId),
    );
    if (residentStreetLabel) {
      setResidentArea(residentStreetLabel);
    } else if (residentBarangay?.name) {
      setResidentArea(residentBarangay.name);
    }
    if (residentBarangay?.name) {
      setResidentBarangayName(residentBarangay.name);
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
      const status = resolveResidentTruckStatus(truck.status, live, route);
      // Stale coordinates are a last known location, never a live arrival estimate.
      const distanceKm = status === "on-the-way" && coords && effectiveResidentCoords
        ? calculateDistanceInKilometers(coords, effectiveResidentCoords)
        : null;
      const eta = distanceKm !== null ? Math.max(1, Math.round((distanceKm / 20) * 60)) : null;

      const barangaysAway = computeStopsAway(route, residentStreetId, residentBarangayId);
      const isResidentTruck = Boolean(
        route?.stops.some(
          (stop) => matchesResidentStop(stop, residentStreetId, residentBarangayId),
        ),
      );

      const routeStops = (route?.stops ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((stop: TruckRouteRow["stops"][number]) => {
          const coveragePath = normalizeCoveragePath(stop.coverage_path);
          return {
            barangay: stop.stop_name ?? stop.barangay_name,
            status: normaliseStopStatus(stop.status),
            coords:
              coveragePath?.[0] ?? (() => {
              const latitude = parseCoordinate(stop.latitude);
              const longitude = parseCoordinate(stop.longitude);
              return latitude !== null && longitude !== null
                ? [latitude, longitude] as [number, number]
                : barangayCoordsById.get(normaliseId(stop.barangay_id) ?? "") ?? null;
              })(),
            coveragePath,
            completedAt: stop.completed_at ? formatCollectionTime(stop.completed_at) : undefined,
            skippedReason: stop.skipped_reason ?? undefined,
            isResidentBarangay: matchesResidentStop(stop, residentStreetId, residentBarangayId),
          };
        });

      const residentStop = routeStops.find((s) => s.isResidentBarangay);

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
        lastPing: parseBackendDate(live?.last_ping) !== null ? live?.last_ping : undefined,
        collectionStarted: Boolean(route?.collection_started_at),
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

    setTrucks(mappedTrucks);
    setRouteTemplates(allRoutes);
    if (!isLoading) setHasInitialSnapshot(true);
  }, [residentBarangayId, residentStreetId, residentStreetLabel, residentCoords, planQuery.data, liveQuery.data, queryError, isLoading]);

  // Keep socket event handlers current without recreating a connection when
  // location/profile data changes during the page's initial load.
  const loadDynamicDataRef = useRef(loadDynamicData);
  useEffect(() => {
    loadDynamicDataRef.current = loadDynamicData;
  }, [loadDynamicData]);

  const userId = currentUser?.id;
  const token = useAuthStore((state) => state.token);
  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token },
      // React development Strict Mode immediately cleans up the first effect.
      // Delay the handshake so that cleanup can cancel it instead of closing an
      // in-progress WebSocket connection.
      autoConnect: false,
      timeout: 10_000,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    let disposed = false;
    const syncResidentTracking = (rows?: LiveRow[]) => {
      if (Array.isArray(rows)) {
        const version = ++liveVersion.current;
        lastLive.current = rows;
        // A request started on the dashboard may still be using its query function.
        // Cancel it before storing a newer socket sample, so it cannot move GPS back.
        void client.cancelQueries({ queryKey: residentKey(userId, "tracking", `${residentBarangayId ?? ""}:${residentStreetId ?? ""}`, "live"), exact: true }, { revert: false })
          .then(() => { if (!disposed && version === liveVersion.current) setLive(rows); });
      } else { void refetchPlan(); void refetchLive(); }
    };

    socket.on("connect", () => {
      socket.emit("tracking:join");
      syncResidentTracking();
    });

    socket.on("live:snapshot", syncResidentTracking);
    socket.on("live:update", syncResidentTracking);
    socket.on("live:error", () => setTrackingError("Live connection unavailable. Reconnecting or polling for updates."));

    const connectTimer = window.setTimeout(() => socket.connect(), 0);

    return () => {
      disposed = true;
      window.clearTimeout(connectTimer);
      socket.emit("tracking:leave");
      socket.disconnect();
    };
  }, [client, userId, residentBarangayId, residentStreetId, token, setLive, refetchPlan, refetchLive]);

  useEffect(() => { void loadDynamicData(); }, [loadDynamicData]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (lastLive.current) void loadDynamicDataRef.current(lastLive.current);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const residentTrucks = useMemo(
    () => trucks.filter((truck) => truck.isResidentTruck),
    [trucks],
  );
  const residentTrackingCoords = useMemo<[number, number] | null>(() => {
    const residentCoverage = residentTrucks
      .flatMap((truck) => truck.routeStops)
      .find((stop) => stop.isResidentBarangay && (stop.coveragePath?.length ?? 0) >= 2)
      ?.coveragePath;
    if (residentCoverage && residentCoverage.length > 0) {
      return residentCoverage[Math.floor(residentCoverage.length / 2)] ?? residentCoords;
    }
    return residentCoords;
  }, [residentCoords, residentTrucks]);

  const hasActiveTrucks = residentTrucks.some((t) => t.status === "on-the-way");
  const residentCollectionFinalized = residentTrucks.some(
    (truck) =>
      truck.routeClosedForTheDay ||
      truck.routeStops.some(
        (stop) => stop.isResidentBarangay && (stop.status === "done" || stop.status === "skipped"),
      ),
  );
  const schedule = useMemo(
    () =>
      buildSchedule(
        routeTemplates,
        residentStreetId,
        residentBarangayId,
        residentCollectionFinalized,
      ),
    [routeTemplates, residentStreetId, residentBarangayId, residentCollectionFinalized],
  );
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
    if (residentTrucks.some((t) => t.status === "offline" && t.collectionStarted)) {
      return "gps-unavailable";
    }
    if (residentTrucks.some((t) => t.status === "scheduled") || schedule.nextCollectionDay === "today") {
      return "scheduled-not-started";
    }
    return "not-collection-day";
  }, [hasActiveTrucks, residentCollectionFinalized, residentTrucks, schedule.nextCollectionDay]);

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
          truck.id === truckId && truck.status === "on-the-way" &&
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

  const displayedTrackingError = trackingError || (queryError
    ? "Tracking could not be refreshed. Last known information may be outdated."
    : null);

  if (isLoading || (planQuery.data && !hasInitialSnapshot)) return <ResidentTrackingSkeleton />;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-2 md:px-4">
      {/* ── Page Header ── */}
      <div className="hidden pb-1 md:mb-4 md:block">
        <h1 className="text-2xl lg:text-3xl font-extrabold font-display text-foreground tracking-tight">
          Truck Tracking
        </h1>
        <p className="text-xs lg:text-sm text-muted-foreground mt-1">
          Track your scheduled waste collection in real time.
        </p>
      </div>

      <div className="space-y-3.5 md:space-y-4">

      {displayedTrackingError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3.5 text-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{displayedTrackingError}</span>
          </div>
          <button
            type="button"
            onClick={() => { void refetchPlan(); void refetchLive(); }}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-amber-500/10 md:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {!residentCoords && !displayedTrackingError && (
        <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card p-3.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          Your barangay location is not configured yet, so distance and arrival estimates are unavailable.
        </div>
      )}

      {hasLiveTrackingForResident && proximityTruck && (
        <ProximityAlert truck={proximityTruck} />
      )}
      <CountdownBanner
        schedule={schedule}
        residentArea={residentArea}
        collectionFinishedToday={residentCollectionFinalized}
      />

       <div className="h-[clamp(360px,calc(100dvh-12rem),520px)] md:h-[500px] lg:h-[580px]">
        <TrackingMap
          trucks={residentTrucks}
          focusedTruckId={focusedTruckId}
          residentBarangayCoords={residentTrackingCoords}
          residentAreaName={residentArea}
          residentBarangayName={residentBarangayName}
          lockedToBarangay={false}
          collectionDayStatus={collectionDayStatus}
          nextCollectionInfo={nextCollectionInfo}
          onRouteCalculated={handleRoadRouteCalculated}
          onSelectTruck={handleTruckClick}
        />
      </div>
      </div>
    </div>
  );
};

export default ResidentTruckTracking;

