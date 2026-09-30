import type { RouteStop } from "@/features/collector/route-map/types";
import { createTrackingLocationPin } from "@/components/maps/trackingLocationPin";
import { useAdminFetch } from "@/lib/adminQuery";
import { cn } from "@/lib/utils";
import {
getRoadRoute,
type RoadRouteResult,
} from "@/services/roadRoutingService";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
CheckCircle2,
ChevronDown,
ChevronUp,
Clock,
MapPin,
Maximize2,
Minus,
Plus,
Route as RouteIcon,
SignalHigh,
SignalLow,
SignalMedium,
SignalZero,
Truck as TruckIcon,
X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminTruck } from "../types";
import type { ReplayTargetLocation } from "../utils/replayTrip";
import { createReplayMapRenderer } from "../utils/replayMapRenderer";

const parsePingTimestamp = (timestamp: string | null): Date | null => {
  const raw = String(timestamp || "").trim();
  if (!raw) return null;

  const mysqlMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (mysqlMatch) {
    const [, year, month, day, hour, minute, second, milliseconds = "0"] = mysqlMatch;
    const local = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(milliseconds));
    const utc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(milliseconds)));
    return Math.abs(Date.now() - local.getTime()) <= Math.abs(Date.now() - utc.getTime()) ? local : utc;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getGpsSignal = (lastPingIso: string | null, status: AdminTruck["status"]) => {
  const ping = parsePingTimestamp(lastPingIso);
  if (!ping || ["offline", "scheduled", "done"].includes(status)) {
    return { Icon: SignalZero, className: "text-muted-foreground", label: "Offline", age: null };
  }

  const ageSeconds = Math.max(0, Math.floor((Date.now() - ping.getTime()) / 1000));
  const age = ageSeconds < 60 ? `${ageSeconds}s ago` : ageSeconds < 3600 ? `${Math.floor(ageSeconds / 60)}m ago` : `${Math.floor(ageSeconds / 3600)}h ago`;
  if (status === "paused") {
    return { Icon: SignalZero, className: "text-muted-foreground", label: "GPS paused", age };
  }
  if (ageSeconds <= 30) {
    return { Icon: SignalHigh, className: "text-emerald-600 dark:text-emerald-400", label: "Strong GPS", age };
  }
  if (ageSeconds <= 90) {
    return { Icon: SignalMedium, className: "text-amber-600 dark:text-amber-400", label: "GPS delayed", age };
  }
  return { Icon: SignalLow, className: "text-red-600 dark:text-red-400", label: "GPS needs attention", age };
};

interface AdminTrackingMapProps {
  trucks: AdminTruck[];
  focusedTruckId: string | null;
  activeTruck?: AdminTruck | null;
  activeTruckCoords?: [number, number] | null;
  activeStop?: RouteStop | null;
  activeStopCoords?: [number, number] | null;
  autoRoutedStops?: RouteStop[];
  onMarkerClick: (truckId: string) => void;
  onDeselectTruck?: () => void;
  replayPath?: [number, number][];
  replayIndex?: number;
  replayTargetLocation?: ReplayTargetLocation | null;
  replayCompletedTargets?: ReplayTargetLocation[];
  replaySkippedTargets?: ReplayTargetLocation[];
  fleetControlCollapsed?: boolean;
  theme?: "light" | "dark";
}

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const EMPTY_REPLAY_TARGETS: ReplayTargetLocation[] = [];
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const BOUNDS: L.LatLngBoundsExpression = [
  [13.82, 121.20],
  [14.23, 121.66],
];
const DEFAULT_PADDING: [number, number] = [24, 24];
const MIN_ZOOM = 10;
const MAX_ZOOM = 17;

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });

const statusColor = (status: "done" | "in-progress" | "not-started" | "skipped") => {
  switch (status) {
    case "done":
      return "hsl(145, 63%, 32%)";
    case "in-progress":
      return "hsl(217, 91%, 60%)";
    case "skipped":
      return "hsl(38, 92%, 50%)";
    default:
      return "hsl(215, 14%, 60%)";
  }
};

const statusLabel = (status: "done" | "in-progress" | "not-started" | "skipped") => {
  switch (status) {
    case "done": return "Completed";
    case "in-progress": return "In Progress";
    case "skipped": return "Skipped";
    default: return "Upcoming";
  }
};

const coverageColor = (status: "done" | "in-progress" | "not-started" | "skipped") => {
  switch (status) {
    case "in-progress": return "#16a34a";
    case "done": return "#166534";
    case "skipped": return "#f59e0b";
    default: return "#94a3b8";
  }
};

const createCoverageOrderIcon = (
  stopNumber: number,
  state: "done" | "in-progress" | "not-started" | "skipped",
) => createTrackingLocationPin(coverageColor(state), state, stopNumber);

const createAdminStopTeardropIcon = (
  stopNumber: number,
  state: "done" | "in-progress" | "not-started" | "skipped",
) => createTrackingLocationPin(statusColor(state), state, stopNumber);

const createAdminTruckPinIcon = (
  isFocused = false,
  state: "live" | "delayed" | "idle" = "live",
) => {
  const width = isFocused ? 42 : 36;
  const height = isFocused ? 54 : 48;
  const color =
    state === "live"
      ? "hsl(145, 63%, 32%)"
      : state === "delayed"
        ? "hsl(38, 92%, 42%)"
        : "hsl(215, 14%, 45%)";
  const scale = isFocused ? 1.16 : 1;
  const cx = width / 2;
  const cy = isFocused ? 21 : 18;
  const r = isFocused ? 12 : 11;
  const translateOffset = isFocused ? "translate(11.2, 11.5) scale(0.8)" : "translate(9.5, 9.5) scale(0.7)";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.35));cursor:pointer;">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
          <path d="M ${cx} 1.5 C ${cx * 0.48} 1.5 1.5 ${cy * 0.48} 1.5 ${cy} C 1.5 ${cy * 1.6} ${cx} ${height - 1.5} ${cx} ${height - 1.5} C ${cx} ${height - 1.5} ${width - 1.5} ${cy * 1.6} ${width - 1.5} ${cy} C ${width - 1.5} ${cy * 0.48} ${cx * 1.52} 1.5 ${cx} 1.5 Z" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff"/>
          <g transform="${translateOffset}">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 18H9" fill="none" stroke="${color}" stroke-width="2.3"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-4v10" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="7" cy="18" r="2" fill="${color}"/>
            <circle cx="17" cy="18" r="2" fill="${color}"/>
          </g>
        </svg>
        ${
           isFocused && state === "live"
            ? `<div style="position:absolute;top:-1px;right:-1px;display:flex;width:12px;height:12px;pointer-events:none;">
                 <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:#10b981;opacity:0.75;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></span>
                 <span style="position:relative;width:100%;height:100%;border-radius:50%;background:#10b981;border:2px solid white;"></span>
               </div>`
            : ""
        }
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [cx, height],
    popupAnchor: [0, -height],
  });
};

// Haversine distance in km between two [lat, lng] points
const haversineKm = (
  [lat1, lng1]: [number, number],
  [lat2, lng2]: [number, number],
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const AdminTrackingMap = ({
  trucks,
  focusedTruckId,
  activeTruck: passedActiveTruck,
  activeTruckCoords: passedActiveTruckCoords,
  activeStop: passedActiveStop,
  activeStopCoords: passedActiveStopCoords,
  autoRoutedStops: passedAutoRoutedStops,
  onMarkerClick,
  onDeselectTruck,
  replayPath,
  replayIndex,
  replayTargetLocation,
  replayCompletedTargets = EMPTY_REPLAY_TARGETS,
  replaySkippedTargets = EMPTY_REPLAY_TARGETS,
  theme,
  fleetControlCollapsed = false,
}: Omit<AdminTrackingMapProps, "theme"> & { theme?: string }) => {
  const fetchAdmin = useAdminFetch();
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trucksLayerRef = useRef<L.LayerGroup | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const replayLayerRef = useRef<L.LayerGroup | null>(null);
  const lastViewModeRef = useRef<"bounds" | "focused" | null>(null);
  const lastFocusedTruckIdRef = useRef<string | null>(null);
  const lastTargetViewKeyRef = useRef<string | null>(null);
  const replayRendererRef = useRef<ReturnType<typeof createReplayMapRenderer> | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [routeData, setRouteData] = useState<RoadRouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const hasAutoFittedRef = useRef(false);

  const visibleTrucks = useMemo(
    () =>
      trucks.filter(
        (truck) =>
          Boolean(truck.coords) &&
          truck.status !== "offline" &&
          truck.status !== "done" &&
          (truck.totalBarangays === 0 || truck.completedBarangays < truck.totalBarangays) &&
          (truck.status === "on-the-way" || truck.status === "paused"),
      ),
    [trucks],
  );

  const activeTruck = useMemo(() => {
    if (passedActiveTruck !== undefined) return passedActiveTruck;
    if (focusedTruckId) {
      const match = trucks.find((t) => t.id === focusedTruckId);
      if (match) return match;
    }
    return null;
  }, [passedActiveTruck, trucks, focusedTruckId]);

  const isAllCompleted = useMemo(
    () => {
      const trucksWithRoutes = trucks.filter((truck) => truck.totalBarangays > 0);
      return (
        trucksWithRoutes.length > 0 &&
        trucksWithRoutes.every(
          (truck) => truck.completedBarangays >= truck.totalBarangays,
        )
      );
    },
    [trucks],
  );

  const activeTruckCoords = passedActiveTruckCoords !== undefined
    ? passedActiveTruckCoords
    : (activeTruck?.coords ?? null);
  const isRoutePaused = activeTruck?.status === "paused";
  const gpsSignal = activeTruck ? getGpsSignal(activeTruck.lastPingIso, activeTruck.status) : null;
  const GpsSignalIcon = gpsSignal?.Icon;

  const rawStops: RouteStop[] = useMemo(() => {
    if (passedAutoRoutedStops) return passedAutoRoutedStops;
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
  }, [passedAutoRoutedStops, activeTruck?.id, activeTruck?.route]);

  // The parent supplies the selected truck's scheduled stop order. This map
  // only renders that target; it never changes the collector's queue.
  const scheduledStops = passedAutoRoutedStops ?? rawStops;
  const activeStop = passedActiveStop !== undefined
    ? passedActiveStop
    : (scheduledStops.find((s) => s.status === "in-progress") ?? null);

  const activeStopCoords = passedActiveStopCoords !== undefined
    ? passedActiveStopCoords
    : (activeStop?.coords ?? null);
  // Only draw a live road corridor while the selected truck is actively
  // reporting GPS. Scheduled/offline trucks may still show their stop pins.
  const isLiveTruckOnline = activeTruck?.status === "on-the-way";

  // Initialize map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: BOUNDS,
      maxBoundsViscosity: 0.6,
      worldCopyJump: false,
    });

    map.fitBounds(BOUNDS, { padding: DEFAULT_PADDING });
    map.setMaxBounds(BOUNDS);

    L.tileLayer(OSM_URL, {
      maxZoom: MAX_ZOOM,
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    stopsLayerRef.current = L.layerGroup().addTo(map);
    replayLayerRef.current = L.layerGroup().addTo(map);
    replayRendererRef.current = createReplayMapRenderer(map, replayLayerRef.current, createAdminTruckPinIcon(false, "live"));
    trucksLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setIsMapReady(true);

    // The Fleet panel can collapse without a window resize. Keep Leaflet's
    // internal canvas aligned with its responsive container in that case.
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    resizeObserver.observe(mapElRef.current);

    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(BOUNDS, { padding: DEFAULT_PADDING });
      map.setMaxBounds(BOUNDS);
    }, 0);

    return () => {
      resizeObserver.disconnect();
      replayRendererRef.current?.clear();
      replayRendererRef.current = null;
      setIsMapReady(false);
      trucksLayerRef.current = null;
      stopsLayerRef.current = null;
      replayLayerRef.current = null;
      routeLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const isReplayMode = Boolean(replayPath?.length);
  // Compute and render single-leg road route from truck to current active stop
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!isMapReady || !routeLayer) return;

    if (
      isReplayMode ||
      !isLiveTruckOnline ||
      isRoutePaused ||
      !activeTruckCoords ||
      !activeStopCoords
    ) {
      routeLayer.clearLayers();
      setRouteData(null);
      setIsCalculatingRoute(false);
      return;
    }

    let cancelled = false;
    const currentTruck = activeTruckCoords;
    const currentStop = activeStopCoords;
    setIsCalculatingRoute(true);

    fetchAdmin("tracking", ["road-route", currentTruck, currentStop], () => getRoadRoute(currentTruck, currentStop))
      .then((result) => {
        if (cancelled || !routeLayerRef.current) return;
        setRouteData(result);

        if (result.coordinates && result.coordinates.length > 1) {
          routeLayer.clearLayers();

          // Outer blue glow casing
          L.polyline(result.coordinates, {
            color: "#2563eb",
            weight: 6,
            opacity: 0.7,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(routeLayer);

          // Inner vibrant road track
          L.polyline(result.coordinates, {
            color: "#60a5fa",
            weight: 3.5,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(routeLayer);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[AdminTrackingMap] Route fetch error:", err);
      })
      .finally(() => {
        if (!cancelled) setIsCalculatingRoute(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    fetchAdmin,
    isMapReady,
    activeTruck?.id,
    isLiveTruckOnline,
    activeTruckCoords,
    activeStopCoords,
    isReplayMode,
    isRoutePaused,
  ]);

  // Render saved stop pins for the selected route. Draw street coverage paths
  // only for an online truck, so a scheduled/offline truck doesn't look live.
  useEffect(() => {
    const layer = stopsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (isReplayMode) return;

    scheduledStops.forEach((stop) => {
      const isTarget = stop.status === "in-progress";
      const mappedState = stop.status === "not-yet" ? "not-started" : stop.status;

      if (stop.coveragePath && stop.coveragePath.length >= 2) {
        if (isLiveTruckOnline) {
          L.polyline(stop.coveragePath, {
            color: "#ffffff",
            weight: isTarget ? 10 : 8,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
            interactive: false,
          }).addTo(layer);

          const coverageLine = L.polyline(stop.coveragePath, {
            color: coverageColor(mappedState),
            weight: isTarget ? 7 : 5,
            opacity: mappedState === "done" ? 0.68 : 0.95,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(layer);

          const tooltip = document.createElement("div");
          tooltip.className = "text-xs";
          const title = document.createElement("strong");
          title.textContent = `${stop.stopNumber}. ${stop.barangay}`;
          const status = document.createElement("div");
          status.textContent = statusLabel(mappedState);
          status.style.color = coverageColor(mappedState);
          status.style.fontSize = "11px";
          tooltip.append(title, status);
          coverageLine.bindTooltip(tooltip, { sticky: true, direction: "top" });
        }

        L.marker(stop.coveragePath[0], {
          icon: createCoverageOrderIcon(stop.stopNumber, mappedState),
          interactive: false,
          zIndexOffset: isTarget ? 500 : 100,
        }).addTo(layer);
        return;
      }

      const stopIcon = createAdminStopTeardropIcon(stop.stopNumber, mappedState);
      const marker = L.marker(stop.coords, {
        icon: stopIcon,
        zIndexOffset: isTarget ? 500 : 100,
      });

      const color = statusColor(mappedState);
      const popupContent = `
        <div style="font-family:Inter,system-ui,sans-serif;min-width:180px;max-width:240px;padding:2px 0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="width:28px;height:28px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;font-size:12px;font-weight:700">
              ${stop.stopNumber}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px;color:inherit">${escapeHtml(stop.barangay)}</div>
              <div style="display:flex;align-items:center;gap:4px;margin-top:1px">
                <span style="font-size:11px;font-weight:600;color:${color}">${statusLabel(mappedState)}</span>
              </div>
            </div>
          </div>
          ${stop.completedAt ? `<div style="font-size:11px;opacity:0.7;margin-top:4px">Completed at ${escapeHtml(stop.completedAt)}</div>` : ""}
          ${stop.skippedReason ? `<div style="font-size:11px;color:hsl(38,92%,40%);margin-top:4px">${escapeHtml(stop.skippedReason)}</div>` : ""}
        </div>`;

      marker.bindPopup(popupContent, {
        autoClose: true,
        closeOnClick: true,
        closeButton: true,
        className: "tracking-popup",
        maxWidth: 260,
        minWidth: 180,
      });

      marker.addTo(layer);
    });
  }, [scheduledStops, isReplayMode, isLiveTruckOnline]);

  // Update truck markers
  useEffect(() => {
    const layer = trucksLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (isReplayMode) return;

    visibleTrucks.forEach((truck) => {
      const isNear = truck.barangaysAway !== null && truck.barangaysAway <= 3;
      const isFocused = (focusedTruckId ?? activeTruck?.id) === truck.id;
      const isLive = truck.status === "on-the-way";
      const isPaused = truck.status === "paused";
      const isDelayed = truck.status === "offline" && Boolean(truck.lastPingIso);
      const isDone = truck.status === "done";
      const markerBg = isLive
        ? "hsl(145,63%,32%)"
        : isDone
          ? "hsl(145,63%,32%)"
          : isPaused || isDelayed
            ? "hsl(38, 92%, 42%)"
            : "hsl(215, 14%, 45%)";

      const truckIcon = createAdminTruckPinIcon(
        isFocused,
        isLive ? "live" : isDone ? "live" : isPaused || isDelayed ? "delayed" : "idle",
      );

      const marker = L.marker(truck.coords!, { icon: truckIcon, zIndexOffset: 1000 });

      const safeTruckName = escapeHtml(truck.name);
      const safePlateNumber = escapeHtml(truck.plateNumber);
      const safeDriver = escapeHtml(truck.driver || "No driver assigned");
      const safeBarangay = escapeHtml(truck.currentBarangay || "No route assigned");
      const safeWasteType = escapeHtml(truck.wasteType);
      const safeLatestMessage = escapeHtml(
        truck.driverMessages[truck.driverMessages.length - 1]?.text,
      );

      const popupContent = `
        <div style="font-family:Inter,system-ui,sans-serif;font-size:13px;min-width:220px;max-width:280px;padding:4px 0">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
            <div style="width:32px;height:32px;background:${markerBg};border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0h2m0 0a1 1 0 011-1V9h3l3 3v5a1 1 0 01-1 1h-1"/>
              </svg>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px;color:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${safeTruckName}
              </div>
              <div style="font-size:11px;opacity:0.6;font-family:monospace">${safePlateNumber}</div>
            </div>
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;background:${markerBg};color:white;text-transform:uppercase;letter-spacing:0.04em">
              ${isLive ? "EN ROUTE" : isDone ? "COMPLETED" : isPaused ? "PAUSED" : isDelayed ? "GPS DELAYED" : truck.status.toUpperCase()}
            </span>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
            <div style="display:flex;align-items:center;gap:6px">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>${safeDriver}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${safeBarangay}</span>
            </div>
            ${truck.wasteType ? `
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:10px;height:10px;border-radius:50%;background:hsl(145,63%,32%);opacity:0.8"></div>
              <span>${safeWasteType}</span>
            </div>` : ''}
          </div>

          ${truck.totalBarangays > 0 ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(128,128,128,0.15)">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
              <span style="opacity:0.6">Route Progress</span>
              <span style="font-weight:600">${truck.completedBarangays}/${truck.totalBarangays}</span>
            </div>
            <div style="height:6px;border-radius:3px;background:rgba(128,128,128,0.15);overflow:hidden">
              <div style="height:100%;width:${truck.totalBarangays > 0 ? Math.min(100, Math.max(0, Math.round((truck.completedBarangays / truck.totalBarangays) * 100))) : 0}%;border-radius:3px;background:hsl(145,63%,32%);transition:width 0.3s ease"></div>
            </div>
          </div>` : ''}

          ${truck.driverMessages.length > 0 ? `
          <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:rgba(128,128,128,0.08);border:1px solid rgba(128,128,128,0.1);font-size:11px;font-style:italic;line-height:1.4">
            "${safeLatestMessage}"
          </div>` : ''}

          ${isNear ? `
          <div style="margin-top:8px;padding:6px 10px;border-radius:8px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.15);font-size:11px;font-weight:600;color:hsl(145,63%,32%)">
            ${truck.barangaysAway} barangay${truck.barangaysAway! > 1 ? 's' : ''} away from next stop
          </div>` : ''}
        </div>`;

      marker.bindPopup(popupContent, {
        autoClose: true,
        closeOnClick: true,
        closeButton: true,
        className: "tracking-popup",
        maxWidth: 300,
        minWidth: 240,
      });

      marker.on("click", () => onMarkerClick(truck.id));
      marker.addTo(layer);
    });
  }, [visibleTrucks, focusedTruckId, activeTruck?.id, onMarkerClick, replayPath, isReplayMode]);

  // Focus and Route Corridor Auto-Fit
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (isReplayMode) return;

    // When focused truck or active target changes, frame the corridor comfortably
    if (focusedTruckId) {
      const truck = trucks.find((t) => t.id === focusedTruckId);
      if (truck) {
        const focusChanged = lastFocusedTruckIdRef.current !== focusedTruckId;
        if (focusChanged || lastViewModeRef.current !== "focused") {
          lastFocusedTruckIdRef.current = focusedTruckId;
          lastViewModeRef.current = "focused";

          const stopCoords = scheduledStops.flatMap((stop) => stop.coveragePath ?? [stop.coords]);
          const isDoneOrOffline =
            truck.status === "offline" ||
            truck.status === "done" ||
            (truck.totalBarangays > 0 && truck.completedBarangays >= truck.totalBarangays);

          if (isDoneOrOffline && stopCoords.length > 0) {
            const bounds = L.latLngBounds(stopCoords);
            if (bounds.isValid()) {
              map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 0.8 });
              return;
            }
          }

          if (truck.coords && activeStopCoords) {
            const bounds = L.latLngBounds([truck.coords, activeStopCoords]);
            if (bounds.isValid()) {
              map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 16, duration: 0.8 });
              return;
            }
          }
          if (truck.coords && stopCoords.length > 0) {
            const bounds = L.latLngBounds([truck.coords, ...stopCoords]);
            if (bounds.isValid()) {
              map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 0.8 });
              return;
            }
          }
          if (truck.coords) {
            map.flyTo(truck.coords, Math.max(map.getZoom(), 15), { duration: 0.8 });
          } else if (stopCoords.length > 0) {
            const bounds = L.latLngBounds(stopCoords);
            if (bounds.isValid()) {
              map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 0.8 });
            }
          }
        }
        return;
      }
    }

    if (!focusedTruckId && lastViewModeRef.current !== "bounds") {
      lastFocusedTruckIdRef.current = null;
      map.flyToBounds(BOUNDS, { padding: DEFAULT_PADDING, duration: 0.8 });
      lastViewModeRef.current = "bounds";
    }
  }, [focusedTruckId, activeTruck?.id, trucks, activeTruckCoords, activeStopCoords, scheduledStops, isReplayMode]);


  // Replay geometry changes only for a new trip or target outcome. Playback
  // moves the existing truck and trail head without rebuilding the map layers.
  useEffect(() => {
    if (!isMapReady) return;
    replayRendererRef.current?.setTrip(replayPath, replayTargetLocation ?? null, replayCompletedTargets, replaySkippedTargets);
  }, [replayPath, replayTargetLocation, replayCompletedTargets, replaySkippedTargets, isMapReady]);

  useEffect(() => {
    if (!isMapReady) return;
    replayRendererRef.current?.setPosition(replayIndex);
  }, [replayPath, replayIndex, isMapReady]);

  useEffect(() => {
    if (isMapReady) replayRendererRef.current?.refreshColors();
  }, [theme, isMapReady]);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const handleRecenterFocusedTruck = () => {
    if (mapRef.current && activeTruck?.coords) {
      mapRef.current.setView(activeTruck.coords, 16, { animate: true });
    }
  };

  const handleFitFocusedRoute = () => {
    const map = mapRef.current;
    if (!map || !activeTruck) return;

    const stopCoords = (activeTruck.route || [])
      .flatMap((stop) => stop.coveragePath ?? (stop.coords ? [stop.coords] : []));

    const allPoints = activeTruck.coords ? [...stopCoords, activeTruck.coords] : stopCoords;
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      if (bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 16, duration: 0.8 });
        return;
      }
    }

    if (activeTruck.coords) {
      map.setView(activeTruck.coords, 16, { animate: true });
    }
  };

  const handleResetBounds = () => {
    if (mapRef.current) {
      mapRef.current.flyToBounds(BOUNDS, { padding: DEFAULT_PADDING, duration: 0.8 });
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-border bg-card shadow-sm [&_.leaflet-control-attribution]:!hidden">
      {/* Map container */}
      <div
        ref={mapElRef}
        className="w-full h-full z-0"
        role="application"
        aria-label="Live municipal truck tracking map"
      />

      {/* Floating Zoom Controls (Top-Right) */}
      <div className={cn(
        "absolute right-2.5 sm:right-3 z-[500] flex flex-col bg-card/75 backdrop-blur-md rounded-xl border border-border/70 shadow-2xs overflow-hidden p-0.5 pointer-events-auto",
        fleetControlCollapsed ? "top-[3.75rem]" : "top-2.5 sm:top-3",
      )}>
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-foreground hover:bg-muted/80 hover:text-primary active:scale-95 transition-all rounded-lg cursor-pointer select-none"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <div className="h-px bg-border/60 mx-1" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-foreground hover:bg-muted/80 hover:text-primary active:scale-95 transition-all rounded-lg cursor-pointer select-none"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Floating Status / Info Card in Top-Left */}
      {(!replayPath || replayPath.length === 0) && (
        activeTruck ? (
          <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-56px)] sm:top-3 sm:left-3 sm:max-w-xs z-[450] transition-all animate-in fade-in-50 duration-300">
            {isCardCollapsed ? (
              /* Collapsed Compact Status Pill */
              <button
                type="button"
                onClick={() => setIsCardCollapsed(false)}
                className="flex items-center gap-2 bg-card/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/70 shadow-2xs text-xs font-bold text-foreground cursor-pointer hover:bg-muted/80 transition-all pointer-events-auto"
              >
                <TruckIcon className={cn(
                  "w-3.5 h-3.5 shrink-0",
                  activeTruck.status === "offline" || activeTruck.status === "done"
                    ? "text-muted-foreground"
                    : isRoutePaused
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-primary"
                )} />
                <span className="truncate">{activeTruck.name}</span>
                {activeTruck.status === "offline" || activeTruck.status === "done" ? (
                  <span className="text-muted-foreground font-medium">• Offline</span>
                ) : isRoutePaused ? (
                  <span className="text-amber-700 dark:text-amber-300 font-medium">• Paused</span>
                ) : routeData ? (
                  <span className="text-primary font-medium">• {routeData.distanceKm} km (~{routeData.durationMinutes}m)</span>
                ) : null}
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1 shrink-0" />
              </button>
            ) : (
              /* Full Route Metric Card */
              <div className="bg-card/85 backdrop-blur-md rounded-2xl border border-border/70 shadow-md p-3.5 space-y-2.5 pointer-events-auto">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                      activeTruck.status === "offline" || activeTruck.status === "done"
                        ? "bg-muted text-muted-foreground border-border/80"
                        : isRoutePaused
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-primary/15 text-primary border-primary/20",
                    )}>
                      {activeTruck.status === "offline" || activeTruck.status === "done" ? (
                        <TruckIcon className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <TruckIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold font-display text-foreground truncate">
                        {activeTruck.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] leading-none">
                        <span className="text-muted-foreground truncate">{activeTruck.plateNumber}</span>
                        {activeTruck.status === "offline" || activeTruck.status === "done" ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                            • Offline
                          </span>
                        ) : GpsSignalIcon && gpsSignal ? (
                          <span
                            className={cn("inline-flex items-center gap-0.5 shrink-0 font-semibold", gpsSignal.className)}
                            title={`${gpsSignal.label}${gpsSignal.age ? ` · Last GPS ping ${gpsSignal.age}` : ""}`}
                          >
                            <GpsSignalIcon className="w-3 h-3" aria-hidden="true" />
                            <span>{gpsSignal.age ?? gpsSignal.label}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCardCollapsed(true)}
                      className="w-6 h-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title="Collapse card"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    {(onDeselectTruck || onMarkerClick) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onDeselectTruck) {
                            onDeselectTruck();
                          } else {
                            onMarkerClick(activeTruck.id);
                          }
                        }}
                        className="w-6 h-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        title="Deselect truck"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {activeTruck.status === "offline" || activeTruck.status === "done" ? (
                  <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2.5 flex items-center justify-between">
                    <span>
                      {scheduledStops.length > 0 && scheduledStops.every((s) => s.status === "done")
                        ? "Collection completed"
                        : "Vehicle offline"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {scheduledStops.length} Pins Shown
                    </span>
                  </div>
                ) : isRoutePaused ? (
                  <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-2.5">
                    Collection is temporarily paused. The amber pin shows the truck's last known location.
                  </p>
                ) : (
                  <>
                    {routeData && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                        <div className="bg-muted/40 rounded-xl p-2 flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            Road Distance
                          </span>
                          <span className="text-sm font-extrabold text-foreground tracking-tight mt-0.5">
                            {routeData.distanceKm} km
                          </span>
                        </div>

                        <div className="bg-muted/40 rounded-xl p-2 flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary" />
                            Est. Arrival
                          </span>
                          <span className="text-sm font-extrabold text-primary tracking-tight mt-0.5">
                            ~{routeData.durationMinutes} mins
                          </span>
                        </div>
                      </div>
                    )}

                    {activeStop && (
                      <div className="flex items-center text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <RouteIcon className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate">Target: {activeStop.barangay}</span>
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Sleek Top-Left Status Pill when No Truck is Selected */
          <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-56px)] sm:top-3 sm:left-3 z-[450] pointer-events-auto animate-in fade-in-50 duration-300">
            {isAllCompleted ? (
              <div className="bg-card/85 backdrop-blur-md rounded-2xl border border-border/70 shadow-xs px-3.5 py-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-muted/80 text-muted-foreground border border-border/80 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-foreground leading-tight truncate">
                    Collection Completed · Offline
                  </span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight truncate">
                    Click a truck card to view barangay pins
                  </span>
                </div>
              </div>
            ) : visibleTrucks.length === 0 ? (
              <div className="bg-card/85 backdrop-blur-md rounded-2xl border border-border/70 shadow-xs px-3.5 py-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-muted/80 text-muted-foreground border border-border/80 flex items-center justify-center shrink-0">
                  <TruckIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-foreground leading-tight truncate">
                    Fleet Standby · Offline
                  </span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight truncate">
                    Click a truck card to view route pins
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-card/85 backdrop-blur-md rounded-xl border border-border/70 shadow-xs px-3 py-1.5 flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-medium text-foreground truncate">
                  {visibleTrucks.length} truck{visibleTrucks.length > 1 ? "s" : ""} active
                  <span className="text-muted-foreground font-normal"> · Select card for pins</span>
                </span>
              </div>
            )}
          </div>
        )
      )}

      <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-[500] flex items-center gap-1 sm:gap-1.5 bg-card/75 backdrop-blur-md p-1 rounded-xl border border-border/70 shadow-2xs pointer-events-auto">
        {activeTruck?.coords && activeTruck.status !== "offline" && activeTruck.status !== "done" && (
          <button
            type="button"
            onClick={handleRecenterFocusedTruck}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
            title="Recenter on Focused Truck"
          >
            <TruckIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Truck</span>
          </button>
        )}

        {activeTruck && (
          <button
            type="button"
            onClick={handleFitFocusedRoute}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
            title="Fit Focused Truck Route"
          >
            <RouteIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Fit Route</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleResetBounds}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
          title="Fit Whole Municipal Fleet"
        >
          <Maximize2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Fit Fleet</span>
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-[400] flex items-center gap-2 rounded-xl border border-border/70 bg-card/75 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-2xs backdrop-blur-md">
        {isLiveTruckOnline && activeTruck && scheduledStops.some((stop) => (stop.coveragePath?.length ?? 0) >= 2) ? (
          <>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-600" /> Current
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-900" /> Done
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-400" /> Upcoming
            </span>
          </>
        ) : (
          <span>Candelaria, Quezon</span>
        )}
      </div>
    </div>
  );
};

export default AdminTrackingMap;
