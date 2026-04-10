import { useState, useMemo, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { LocateFixed, Truck as TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import TrackingMap from "./TrackingMap";
import TruckCard from "./TruckCard";
import ProximityAlert from "./ProximityAlert";
import CountdownBanner from "./CountdownBanner";
import MissedCollectionButton from "./MissedCollectionButton";
import CollectionHistory from "./CollectionHistory";
import type { Truck, CollectionDayStatus, CollectionHistoryEntry, CollectionSchedule } from "./types";
import { PageHeaderSkeleton, MapPanelSkeleton, CollectionHistorySkeleton } from "@/components/PageLoadingSkeletons";
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

const REFRESH_MS = 4_000;
const FALLBACK_RESIDENT_COORDS: [number, number] = [14.0424, 121.4234];
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:2000";

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

const formatTime = (value?: string | null) => {
  if (!value) return "-";
  const match = String(value).match(/^(\d{2}):(\d{2})/);
  if (match) {
    const [, hh, mm] = match;
    const d = new Date();
    d.setHours(Number(hh), Number(mm), 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const parseDistanceKm = (a: [number, number], b: [number, number]) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sLat1 = toRad(lat1);
  const sLat2 = toRad(lat2);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(sLat1) * Math.cos(sLat2) * Math.sin(dLon / 2) ** 2;

  return 6371 * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
};

const computeBarangaysAway = (
  route: TruckRouteRow | undefined,
  residentBarangayId: string | null,
) => {
  if (!route || !residentBarangayId || route.stops.length === 0) return null;

  const sortedStops = [...route.stops].sort((a, b) => a.order_index - b.order_index);
  const residentIdx = sortedStops.findIndex(
    (s) => asId(s.barangay_id) === asId(residentBarangayId),
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
const asId = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

const parseCoordinate = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

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
      (stop) => asId(stop.barangay_id) === asId(residentBarangayId),
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
      nextCollectionTime: formatTime(route.start_time),
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

const buildHistory = (
  routes: ApiRoute[],
  residentBarangayId: string | null,
): CollectionHistoryEntry[] => {
  if (!residentBarangayId) return [];

  const entries = routes
    .map((route) => {
      const stop = route.stops.find(
        (s) => asId(s.barangay_id) === asId(residentBarangayId),
      );
      if (!stop) return null;

      const statusKey = String(stop.status || "").toUpperCase();
      if (statusKey !== "DONE" && statusKey !== "MISSED" && statusKey !== "SKIPPED") {
        return null;
      }

      return {
        sortDate: stop.completed_at || route.updated_at || route.created_at || null,
        entry: {
          date: formatDate(stop.completed_at || route.updated_at || route.created_at),
          wasteType: route.waste_type || "Collection",
          status: statusKey === "DONE" ? "completed" : "missed",
        } as CollectionHistoryEntry,
      };
    })
    .filter((row): row is { sortDate: string | null; entry: CollectionHistoryEntry } => Boolean(row))
    .sort((a, b) => {
      const aTime = a.sortDate ? new Date(a.sortDate).getTime() : 0;
      const bTime = b.sortDate ? new Date(b.sortDate).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5)
    .map((row) => row.entry);

  return entries;
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
  const [collectionHistory, setCollectionHistory] = useState<CollectionHistoryEntry[]>([]);
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
    asId(currentUser?.barangay_id),
  );
  const [focusedTruckId, setFocusedTruckId] = useState<string | null>(null);
  const [lockedToBarangay, setLockedToBarangay] = useState(false);

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
      (b) => asId(b.id) === asId(residentBarangayId),
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
    const todayRouteByTruckId = new Map<string, TruckRouteRow>();
    for (const route of todayRoutes) {
      const current = todayRouteByTruckId.get(route.truck_id);
      todayRouteByTruckId.set(route.truck_id, pickBestTodayRoute(current, route));
    }

    const mappedTrucks: Truck[] = allTrucks.map((truck: TruckRow) => {
      const live = liveByTruckId.get(truck.id);
      const route = todayRouteByTruckId.get(truck.id);

      const coords = live ? ([live.latitude, live.longitude] as [number, number]) : null;
      const distanceKm = coords ? parseDistanceKm(coords, effectiveResidentCoords) : null;
      const eta = distanceKm !== null ? Math.max(1, Math.round((distanceKm / 20) * 60)) : null;

      const barangaysAway = computeBarangaysAway(route, residentBarangayId);
      const isResidentTruck = Boolean(
        route?.stops.some(
          (stop) => asId(stop.barangay_id) === asId(residentBarangayId),
        ),
      );

      const routeStops = (route?.stops ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((stop: TruckRouteRow["stops"][number]) => ({
          barangay: stop.barangay_name,
          status: normaliseStopStatus(stop.status),
          completedAt: stop.completed_at ? formatTime(stop.completed_at) : undefined,
          skippedReason: stop.skipped_reason ?? undefined,
        }));

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
      };
    });

    setTrucks(mappedTrucks);
    setSchedule(buildSchedule(allRoutes, residentBarangayId));
    setCollectionHistory(buildHistory(allRoutes, residentBarangayId));
  }, [residentBarangayId, residentCoords]);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      timeout: 10_000,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    const syncResidentTracking = () => {
      void loadDynamicData();
    };

    socket.on("connect", () => {
      socket.emit("tracking:join");
      syncResidentTracking();
    });

    socket.on("live:snapshot", syncResidentTracking);
    socket.on("live:update", syncResidentTracking);
    socket.on("routes:update", syncResidentTracking);

    return () => {
      socket.emit("tracking:leave");
      socket.disconnect();
    };
  }, [loadDynamicData]);

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

        const latestBarangayId = asId(profile?.barangay_id ?? me.barangay_id);
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

  const proximityTruck = residentTrucks.find(
    (t) =>
      t.status === "on-the-way" &&
      t.barangaysAway !== null &&
      t.barangaysAway <= 3,
  );

  const collectionDayStatus: CollectionDayStatus = useMemo(() => {
    if (hasActiveTrucks) return "active";
    if (allDone) return "completed";
    if (residentTrucks.some((t) => t.status === "scheduled")) {
      return "scheduled-not-started";
    }
    return "not-collection-day";
  }, [allDone, hasActiveTrucks, residentTrucks]);

  const nextCollectionInfo = `Your next collection day is ${schedule.nextCollectionDay}${
    schedule.wasteType ? ` - ${schedule.wasteType}` : ""
  }.`;

  const handleTruckClick = (truckId: string) => {
    setLockedToBarangay(false);
    setFocusedTruckId((prev) => (prev === truckId ? null : truckId));
  };

  const handleLockToBarangay = () => {
    setFocusedTruckId(null);
    setLockedToBarangay(true);
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-4 px-1 sm:px-0">
        <PageHeaderSkeleton />
        <MapPanelSkeleton />
        <CollectionHistorySkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 px-1 sm:px-0">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Truck Tracking</h1>
              <p className="text-sm text-muted-foreground">
                Your area: <span className="font-semibold text-primary">{residentArea}</span>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLockToBarangay}
            className={`shrink-0 rounded-xl text-xs sm:text-sm transition-all ${
              lockedToBarangay
                ? "border-primary text-primary bg-primary/5 shadow-sm"
                : "hover:border-primary/30"
            }`}
          >
            <LocateFixed className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">My Barangay</span>
            <span className="sm:hidden">Brgy</span>
          </Button>
        </div>
      </div>

      {proximityTruck && <ProximityAlert truck={proximityTruck} />}
      <CountdownBanner schedule={schedule} hasActiveTrucks={hasActiveTrucks} />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 h-[300px] sm:h-[400px] lg:h-[520px]">
          <TrackingMap
            trucks={residentTrucks}
            focusedTruckId={focusedTruckId}
            residentBarangayCoords={residentCoords}
            residentAreaName={residentArea}
            lockedToBarangay={lockedToBarangay}
            collectionDayStatus={collectionDayStatus}
            nextCollectionInfo={nextCollectionInfo}
          />
        </div>

        <div className="space-y-3 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold text-foreground">Vehicles</h2>
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {residentTrucks.length} truck{residentTrucks.length !== 1 ? "s" : ""}
            </span>
          </div>
          {residentTrucks.map((truck) => (
            <div key={truck.id} className="space-y-2">
              <TruckCard
                truck={truck}
                isSelected={focusedTruckId === truck.id}
                onClick={() => handleTruckClick(truck.id)}
              />
              <MissedCollectionButton truck={truck} />
            </div>
          ))}
        </div>
      </div>

      <CollectionHistory history={collectionHistory} />

      <p className="text-[11px] text-muted-foreground text-center pb-2">
        Location updates every 4 seconds - Tap a card to focus the map
      </p>
    </div>
  );
};

export default ResidentTruckTracking;

