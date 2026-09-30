import { useResidentFetch } from "@/lib/residentQuery";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Truck, CollectionDayStatus } from "./types";
import {
  CalendarOff,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Truck as TruckIcon,
  Navigation,
  Route as RouteIcon,
  MapPin,
  Clock,
  LocateFixed,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Info,
  Plus,
  Minus,
  WifiOff,
} from "lucide-react";
import { formatManilaDateTime, formatRelativeTime } from "@/utils/date";
import {
  getMultiStopRoadRoute,
  getRoadRoute,
  type RoadRouteResult,
} from "@/services/roadRoutingService";

interface TrackingMapProps {
  trucks: Truck[];
  focusedTruckId: string | null;
  residentBarangayCoords: [number, number] | null;
  residentAreaName: string;
  residentBarangayName?: string | null;
  lockedToBarangay: boolean;
  collectionDayStatus: CollectionDayStatus;
  nextCollectionInfo?: string;
  onSelectTruck?: (truckId: string) => void;
  onRouteCalculated?: (truckId: string, route: RoadRouteResult) => void;
}

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const BOUNDS: L.LatLngBoundsExpression = [
  [13.82, 121.20],
  [14.23, 121.66],
];
const DEFAULT_PADDING: [number, number] = [24, 24];
const MIN_ZOOM = 10;
const MAX_ZOOM = 17;

const getBarangayPopupContent = (
  areaName: string,
  barangayName: string | null | undefined,
  isCompleted: boolean,
  completedAt?: string
) => {
  const formattedBarangay = barangayName
    ? /^brgy\.?\s/i.test(barangayName)
      ? barangayName
      : `Brgy. ${barangayName}`
    : "Registered collection area";

  const root = document.createElement("div");
  root.style.cssText = `font-family:Inter,sans-serif;font-size:${isCompleted ? "12px" : "13px"};min-width:${isCompleted ? "165px" : "140px"};line-height:1.4;`;
  const heading = document.createElement("div");
  heading.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;";
  const title = document.createElement("strong");
  title.style.cssText = `color:${isCompleted ? "#0f172a" : "inherit"};font-size:13px;`;
  title.textContent = areaName;
  heading.append(title);
  if (isCompleted) {
    const badge = document.createElement("span");
    badge.style.cssText = "background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-size:9px;font-weight:700;padding:1px 6px;border-radius:9999px;";
    badge.textContent = "Done";
    heading.append(badge);
  }
  root.append(heading);

  if (isCompleted) {
    const completion = document.createElement("div");
    completion.style.cssText = "color:#059669;font-size:11px;font-weight:600;";
    completion.textContent = `Collection Completed${completedAt ? ` • ${completedAt}` : ""}`;
    root.append(completion);
  }
  const area = document.createElement("span");
  area.style.cssText = `color:${isCompleted ? "#64748b" : "#666"};font-size:${isCompleted ? "10px" : "11px"};display:block;margin-top:2px;`;
  area.textContent = formattedBarangay;
  root.append(area);
  return root;
};

const createBarangayPinIcon = (isCompleted = false, isMissed = false) => {
  const width = 36;
  const height = 48;
  const color = isMissed ? "#dc2626" : "hsl(145, 63%, 32%)";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.32));cursor:pointer;">
        <svg width="${width}" height="${height}" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
          <path d="M 18 1.5 C 8.8 1.5 1.5 8.8 1.5 18 C 1.5 29.5 18 46.5 18 46.5 C 18 46.5 34.5 29.5 34.5 18 C 34.5 8.8 27.2 1.5 18 1.5 Z" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="18" cy="18" r="11" fill="#ffffff"/>
          <g transform="translate(10, 10) scale(0.667)">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
        </svg>
        ${
          isCompleted
            ? `<div style="position:absolute;top:-1px;right:-1px;width:15px;height:15px;border-radius:50%;background:#059669;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.35);pointer-events:none;">
                 <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                   <polyline points="20 6 9 17 4 12"></polyline>
                 </svg>
               </div>`
            : ""
        }
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [18, 48],
    popupAnchor: [0, -48],
  });
};

const createTruckPinIcon = (isFocused = false, status: Truck["status"] = "on-the-way") => {
  const width = isFocused ? 42 : 36;
  const height = isFocused ? 54 : 48;
  const color = status === "paused" ? "#d97706" : status === "offline" ? "#64748b" : "hsl(145, 63%, 32%)";
  const cx = width / 2;

  // ViewBox matching width and height with 1.5px safe margin
  const r = isFocused ? 12 : 11;
  const cy = isFocused ? 21 : 18;
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
          isFocused && status === "on-the-way"
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

const TrackingMap = ({
  trucks,
  focusedTruckId,
  residentBarangayCoords,
  residentAreaName,
  residentBarangayName,
  lockedToBarangay,
  collectionDayStatus,
  nextCollectionInfo,
  onSelectTruck,
  onRouteCalculated,
}: TrackingMapProps) => {
  const fetchResident = useResidentFetch();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const residentLayerRef = useRef<L.Marker | null>(null);
  const trucksLayerRef = useRef<L.LayerGroup | null>(null);
  const coverageLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const lastViewModeRef = useRef<"bounds" | "focused" | "barangay" | "route" | null>(null);
  const lastFocusedTruckIdRef = useRef<string | null>(null);
  const lastResidentPositionRef = useRef<string | null>(null);

  const [routeData, setRouteData] = useState<RoadRouteResult | null>(null);
  const [arrivalRouteData, setArrivalRouteData] = useState<RoadRouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const residentTruck = useMemo(
    () => trucks.find((t) => t.isResidentTruck),
    [trucks]
  );

  const residentStopStatus = residentTruck?.residentStopStatus;
  const isResidentMissed = residentStopStatus === "skipped";
  const isResidentCompleted =
    residentStopStatus === "done" ||
    (!residentStopStatus && collectionDayStatus === "completed");
  // The resident truck remains visible while the street is awaiting service;
  // once this street is done, its truck and road path are cleared from the map.
  const hasResidentCollectionOutcome = collectionDayStatus === "completed";
  const isResidentTrackingComplete = isResidentCompleted;

  const residentCompletedAt = residentTruck?.residentStopCompletedAt;

  const activeTrucks = useMemo(
    () =>
      trucks.filter(
        (truck) =>
          truck.status === "on-the-way" &&
          truck.coords &&
          !hasResidentCollectionOutcome &&
          !(isResidentTrackingComplete && truck.isResidentTruck),
      ),
    [trucks, hasResidentCollectionOutcome, isResidentTrackingComplete]
  );
  // A paused route has no live ETA or blue route line, but residents still
  // waiting for collection can see the truck's last known location.
  const pausedTrucks = useMemo(
    () =>
      trucks.filter(
        (truck) =>
          truck.status === "paused" &&
          truck.coords &&
          !hasResidentCollectionOutcome &&
          !(isResidentTrackingComplete && truck.isResidentTruck),
      ),
    [trucks, hasResidentCollectionOutcome, isResidentTrackingComplete],
  );
  const unavailableTrucks = useMemo(
    () => trucks.filter((truck) => truck.status === "offline" && truck.collectionStarted &&
      truck.coords && !hasResidentCollectionOutcome),
    [trucks, hasResidentCollectionOutcome],
  );
  const visibleTrucks = useMemo(
    () => [...activeTrucks, ...pausedTrucks, ...unavailableTrucks],
    [activeTrucks, pausedTrucks, unavailableTrucks],
  );
  const pausedResidentTruck = useMemo(
    () => trucks.find((truck) => truck.isResidentTruck && truck.status === "paused") ?? null,
    [trucks],
  );
  const unavailableResidentTruck = useMemo(
    () => trucks.find((truck) => truck.isResidentTruck && truck.status === "offline" && truck.collectionStarted) ?? null,
    [trucks],
  );
  const coverageTruck = hasResidentCollectionOutcome ? null : residentTruck;

  // Selected or primary active truck heading towards resident
  const targetTruck = useMemo(() => {
    if (isResidentTrackingComplete) return null;
    if (focusedTruckId) {
      const found = activeTrucks.find((t) => t.id === focusedTruckId);
      if (found) return found;
    }
    const residentActiveTruck = activeTrucks.find((t) => t.isResidentTruck);
    if (residentActiveTruck) return residentActiveTruck;
    return activeTrucks[0] ?? null;
  }, [activeTrucks, focusedTruckId, isResidentTrackingComplete]);

  const mapTruck = hasResidentCollectionOutcome ? null : targetTruck ?? pausedResidentTruck ?? unavailableResidentTruck;

  const stopsBeforeResident = targetTruck?.barangaysAway ?? 0;
  // Other areas' coordinates are private. This estimates direct travel only.
  const arrivalWaypoints = useMemo((): [number, number][] =>
    targetTruck?.coords && residentBarangayCoords ? [targetTruck.coords, residentBarangayCoords] : [],
    [targetTruck, residentBarangayCoords]);

  const targetTruckLatitude = targetTruck?.coords?.[0] ?? null;
  const targetTruckLongitude = targetTruck?.coords?.[1] ?? null;
  const targetTruckId = targetTruck?.id ?? null;
  const residentLatitude = residentBarangayCoords?.[0] ?? null;
  const residentLongitude = residentBarangayCoords?.[1] ?? null;

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: BOUNDS,
      maxBoundsViscosity: 0.6,
      worldCopyJump: false,
    });
    mapRef.current = map;

    map.fitBounds(BOUNDS, { padding: DEFAULT_PADDING });
    map.setMaxBounds(BOUNDS);

    L.tileLayer(OSM_URL, {
      maxZoom: MAX_ZOOM,
    }).addTo(map);

    coverageLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    trucksLayerRef.current = L.layerGroup().addTo(map);
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapElementRef.current) {
      resizeObserver.observe(mapElementRef.current);
    }

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimer);
      lastViewModeRef.current = null;
      lastFocusedTruckIdRef.current = null;
      lastResidentPositionRef.current = null;
      residentLayerRef.current = null;
      trucksLayerRef.current = null;
      coverageLayerRef.current = null;
      routeLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !residentBarangayCoords) return;

    const popup = getBarangayPopupContent(
      residentAreaName,
      residentBarangayName,
      isResidentCompleted,
      residentCompletedAt,
    );
    const icon = createBarangayPinIcon(isResidentCompleted, isResidentMissed);
    const residentMarker = residentLayerRef.current;

    if (!residentMarker) {
      const marker = L.marker(residentBarangayCoords, {
        icon,
        zIndexOffset: 500,
      });
      marker.bindPopup(popup).addTo(map);
      residentLayerRef.current = marker;
      return;
    }

    residentMarker.setIcon(icon);
    residentMarker.setLatLng(residentBarangayCoords);
    residentMarker.setPopupContent(popup);
  }, [residentAreaName, residentBarangayName, residentBarangayCoords, isResidentCompleted, isResidentMissed, residentCompletedAt]);

  // Street paths are snapshotted with the route run. They show what has been
  // served already without changing when an admin later edits a street path.
  useEffect(() => {
    const layer = coverageLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    coverageTruck?.routeStops
      .filter((stop) => stop.isResidentBarangay)
      .forEach((stop) => {
        if (!stop.coveragePath || stop.coveragePath.length < 2) return;

        const color = stop.status === "in-progress"
          ? "#f59e0b"
          : stop.status === "done"
            ? "#166534"
            : stop.status === "skipped"
              ? "#dc2626"
              : "#94a3b8";

        L.polyline(stop.coveragePath, {
          color: "#ffffff",
          weight: stop.status === "in-progress" ? 9 : 7,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
          interactive: false,
        }).addTo(layer);

        L.polyline(stop.coveragePath, {
          color,
          weight: stop.status === "in-progress" ? 6 : 4.5,
          opacity: stop.status === "done" ? 0.68 : 0.95,
          lineCap: "round",
          lineJoin: "round",
          interactive: false,
        }).addTo(layer);
      });
  }, [coverageTruck?.id, coverageTruck?.routeStops]);

  // Road snapping route calculation and polyline rendering
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;
    routeLayer.clearLayers();

    if (
      !targetTruckId ||
      targetTruckLatitude === null ||
      targetTruckLongitude === null ||
      residentLatitude === null ||
      residentLongitude === null
    ) {
      setRouteData(null);
      setIsCalculatingRoute(false);
      return;
    }

    const truckCoordinates: [number, number] = [targetTruckLatitude, targetTruckLongitude];
    const residentCoordinates: [number, number] = [residentLatitude, residentLongitude];

    let isMounted = true;
    setRouteData(null);
    setIsCalculatingRoute(true);

    fetchResident("road-routing", [truckCoordinates, residentCoordinates], () => getRoadRoute(truckCoordinates, residentCoordinates))
      .then((result) => {
        if (!isMounted) return;
        setRouteData(result);
        onRouteCalculated?.(targetTruckId, result);

        if (result.coordinates && result.coordinates.length > 1) {
          // Outer glow road line
          L.polyline(result.coordinates, {
            color: "#059669",
            weight: 6,
            opacity: 0.75,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(routeLayer);

          // Inner vibrant street path
          L.polyline(result.coordinates, {
            color: "#34d399",
            weight: 3,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(routeLayer);
        }
      })
      .catch(() => {
        if (isMounted) setRouteData(null);
      })
      .finally(() => {
        if (isMounted) setIsCalculatingRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    fetchResident,
    targetTruckId,
    targetTruckLatitude,
    targetTruckLongitude,
    residentLatitude,
    residentLongitude,
    onRouteCalculated,
  ]);

  useEffect(() => {
    // Two points means the truck is heading straight to the resident. In that
    // case routeData already contains the correct road ETA.
    if (arrivalWaypoints.length <= 2) {
      setArrivalRouteData(null);
      return;
    }

    let isMounted = true;
    setArrivalRouteData(null);
    fetchResident("road-routing", ["multi", arrivalWaypoints], () => getMultiStopRoadRoute(arrivalWaypoints))
      .then((result) => {
        if (isMounted) setArrivalRouteData(result);
      })
      .catch(() => {
        if (isMounted) setArrivalRouteData(null);
      });

    return () => {
      isMounted = false;
    };
  }, [arrivalWaypoints, fetchResident]);

  const estimatedArrivalMinutes =
    arrivalRouteData?.durationMinutes ?? routeData?.durationMinutes ?? null;

  useEffect(() => {
    const trucksLayer = trucksLayerRef.current;
    if (!trucksLayer) return;
    trucksLayer.clearLayers();

    visibleTrucks.forEach((truck) => {
      const isFocused = targetTruck?.id === truck.id;
      const truckIcon = createTruckPinIcon(isFocused, truck.status);

      const marker = L.marker(truck.coords!, { icon: truckIcon, zIndexOffset: 1000 });

      const popup = document.createElement("div");
      popup.style.cssText = "font-family:Inter,sans-serif;font-size:13px;";
      const truckTitle = document.createElement("strong");
      truckTitle.textContent = truck.plateNumber ? `${truck.name} · ${truck.plateNumber}` : truck.name;
      const details = document.createElement("span");
      details.textContent = truck.status === "offline"
        ? "Last known location — live GPS unavailable"
        : truck.status === "paused" ? "Paused — last known location" : "Live truck location";
      popup.append(truckTitle, document.createElement("br"), details);
      if (truck.status !== "on-the-way" && truck.lastPing) {
        const updated = document.createElement("div");
        updated.style.cssText = "font-size:11px;margin-top:4px;";
        updated.textContent = `Last GPS update: ${formatManilaDateTime(truck.lastPing, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
        popup.append(updated);
      }
      marker.bindPopup(popup);

      if (onSelectTruck) {
        marker.on("click", () => onSelectTruck(truck.id));
      }

      marker.addTo(trucksLayer);
    });
  }, [visibleTrucks, targetTruck?.id, onSelectTruck]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const residentPosition = residentBarangayCoords?.join(",") ?? null;
    const areaChanged = lastResidentPositionRef.current !== residentPosition;
    lastResidentPositionRef.current = residentPosition;

    if (lockedToBarangay && residentBarangayCoords) {
      lastFocusedTruckIdRef.current = null;
      if (lastViewModeRef.current !== "barangay" || areaChanged) {
        map.flyTo(residentBarangayCoords, Math.max(map.getZoom(), 15), {
          duration: 0.8,
        });
        lastViewModeRef.current = "barangay";
      }
      return;
    }

    if (focusedTruckId) {
      const truck = visibleTrucks.find((item) => item.id === focusedTruckId);
      if (truck?.coords) {
        const focusChanged = lastFocusedTruckIdRef.current !== focusedTruckId;
        if (lastViewModeRef.current !== "focused" || focusChanged) {
          map.flyTo(truck.coords, Math.max(map.getZoom(), 15), {
            duration: 0.8,
          });
          lastViewModeRef.current = "focused";
          lastFocusedTruckIdRef.current = focusedTruckId;
        }
        return;
      }
    }

    if (residentBarangayCoords) {
      if (mapTruck?.coords) {
        if (lastViewModeRef.current !== "route" || lastFocusedTruckIdRef.current !== mapTruck.id || areaChanged) {
          map.fitBounds(L.latLngBounds([mapTruck.coords, residentBarangayCoords]), {
            padding: [48, 48], maxZoom: 15,
          });
          lastViewModeRef.current = "route";
          lastFocusedTruckIdRef.current = mapTruck.id;
        }
      } else {
        if (lastViewModeRef.current !== "barangay" || areaChanged) {
          map.setView(residentBarangayCoords, 15);
          lastViewModeRef.current = "barangay";
        }
        lastFocusedTruckIdRef.current = null;
      }
      return;
    }

    if (mapTruck?.coords) {
      if (lastViewModeRef.current !== "focused" || lastFocusedTruckIdRef.current !== mapTruck.id) {
        map.setView(mapTruck.coords, 15);
        lastViewModeRef.current = "focused";
        lastFocusedTruckIdRef.current = mapTruck.id;
      }
      return;
    }
    lastFocusedTruckIdRef.current = null;
    if (lastViewModeRef.current !== "bounds") {
      map.flyToBounds(BOUNDS, { padding: DEFAULT_PADDING, duration: 0.8 });
      lastViewModeRef.current = "bounds";
    }
  }, [focusedTruckId, lockedToBarangay, residentBarangayCoords, visibleTrucks, mapTruck]);

  // Map Controls
  const handleRecenterBarangay = () => {
    if (mapRef.current && residentBarangayCoords) {
      mapRef.current.setView(residentBarangayCoords, 16, { animate: true });
    }
  };

  const handleRecenterTruck = () => {
    if (mapRef.current && mapTruck?.coords) {
      mapRef.current.setView(mapTruck.coords, 16, { animate: true });
    }
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleFitRouteBounds = () => {
    if (!mapRef.current) return;
    const coveragePoints = coverageTruck?.routeStops
      .filter((stop) => stop.isResidentBarangay)
      .flatMap(
      (stop) => stop.coveragePath ?? [],
    ) ?? [];
    if (coveragePoints.length > 1) {
      mapRef.current.fitBounds(L.latLngBounds(coveragePoints), {
        padding: [48, 48],
        maxZoom: 16,
      });
    } else if (routeData && routeData.coordinates.length > 1) {
      const latLngs = routeData.coordinates.map(([lat, lng]) => L.latLng(lat, lng));
      mapRef.current.fitBounds(L.latLngBounds(latLngs), {
        padding: [48, 48],
        maxZoom: 16,
      });
    } else if (mapTruck?.coords && residentBarangayCoords) {
      const bounds = L.latLngBounds([mapTruck.coords, residentBarangayCoords]);
      mapRef.current.fitBounds(bounds, {
        padding: [48, 48],
        maxZoom: 16,
      });
    } else if (residentBarangayCoords) {
      mapRef.current.setView(residentBarangayCoords, 15, { animate: true });
    } else {
      mapRef.current.fitBounds(BOUNDS, { padding: DEFAULT_PADDING });
    }
  };

  const emptyStateContent = () => {
    switch (collectionDayStatus) {
      case "not-collection-day":
        return {
          badge: "No Pickup Today",
          badgeClass: "bg-muted text-muted-foreground border-border/80",
          icon: <CalendarOff className="w-6 h-6 text-muted-foreground" />,
          iconBg: "bg-muted/80 border-border/80",
          title: "No Collection Scheduled Today",
          desc: nextCollectionInfo || "Check back on your next scheduled collection day.",
          hint: "Check announcements for schedule updates",
          isLiveWaiting: false,
        };
      case "scheduled-not-started":
        return {
          badge: "Scheduled Today",
          badgeClass: "bg-primary/10 text-primary border-primary/25",
          icon: <CalendarClock className="w-6 h-6 text-primary" />,
          iconBg: "bg-primary/10 border-primary/25",
          title: "Collection Scheduled Today",
          desc: "Live tracking will appear when the assigned truck starts sending GPS updates.",
          hint: "Map updates automatically when live",
          isLiveWaiting: true,
        };
      case "gps-unavailable":
        return {
          badge: unavailableResidentTruck?.name || "Collection started",
          icon: <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          iconBg: "bg-amber-500/10 border-amber-500/25",
          title: unavailableResidentTruck?.lastPing ? "GPS updates delayed" : "Waiting for truck location",
          desc: unavailableResidentTruck?.coords
            ? "Showing the last known location until GPS updates resume."
            : "Collection started. Waiting for GPS updates.",
        };
      case "active":
        return {
          badge: targetTruck?.name || "Collection started",
          icon: <TruckIcon className="w-4 h-4 text-primary" />,
          iconBg: "bg-primary/10 border-primary/25",
          title: "Collection in progress",
          desc: isCalculatingRoute ? "Live location is available. Calculating the travel estimate…" : "Live location is available, but a travel estimate is unavailable.",
        };
      case "paused":
        return {
          icon: <CalendarClock className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
          iconBg: "bg-amber-500/10 border-amber-500/25",
          title: "Collection temporarily paused",
          desc: "The truck is paused at its last known location. Live arrival estimates will continue when collection resumes.",
        };
      case "completed":
        return {
          badge: "Completed Today",
          badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
          iconBg: "bg-emerald-500/10 border-emerald-500/25",
          title: "Today's Collection is Complete",
          desc: "Collection for your street has ended. Check your next scheduled collection day.",
          hint: "Thank you for keeping your waste segregated",
          isLiveWaiting: false,
        };
      default:
        return {
          badge: "Standby",
          badgeClass: "bg-muted text-muted-foreground border-border/80",
          icon: <TruckIcon className="w-6 h-6 text-muted-foreground" />,
          iconBg: "bg-muted/80 border-border/80",
          title: "No Trucks Currently Active",
          desc: "Live tracking is on standby and will appear as soon as a truck starts its route.",
          hint: "Map updates automatically when live",
          isLiveWaiting: true,
        };
    }
  };

  const emptyState = emptyStateContent();

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-border/80 bg-card shadow-sm [&_.leaflet-control-attribution]:!hidden">
      <div ref={mapElementRef} className="h-full w-full z-0" />

      {/* Floating Zoom Controls (Top-Right) */}
      <div className="absolute top-2.5 right-2.5 lg:top-3 lg:right-3 z-[500] flex flex-col bg-card/90 backdrop-blur-md rounded-xl border border-border/80 shadow-sm overflow-hidden p-0.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center text-foreground hover:bg-muted/80 hover:text-primary active:scale-95 transition-all rounded-lg cursor-pointer select-none"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
        </button>
        <div className="h-px bg-border/60 mx-1" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center text-foreground hover:bg-muted/80 hover:text-primary active:scale-95 transition-all rounded-lg cursor-pointer select-none"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <Minus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
        </button>
      </div>

      {/* Compact map context; the full collection outcome is shown above the map. */}
      {hasResidentCollectionOutcome ? (
        <div className="absolute left-2.5 top-2.5 z-[450] max-w-[calc(100%-56px)] animate-in fade-in-50 duration-300 lg:left-3 lg:top-3">
          <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border/80 bg-card/90 px-2.5 py-2 shadow-md backdrop-blur-md">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
              isResidentMissed
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}>
              {isResidentMissed ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            </div>
            <span className="truncate text-xs font-semibold text-foreground">{residentAreaName}</span>
            <span className="shrink-0 text-muted-foreground">·</span>
            <span className={`shrink-0 text-[11px] font-semibold ${isResidentMissed ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {isResidentMissed ? "Street skipped" : "Street collection done"}
            </span>
          </div>
        </div>
      ) : pausedResidentTruck ? (
        <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-56px)] lg:top-3 lg:left-3 lg:max-w-xs z-[450] animate-in fade-in-50 slide-in-from-top-1 duration-300">
          <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-md p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <TruckIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold font-display text-foreground truncate">
                    {pausedResidentTruck.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {pausedResidentTruck.plateNumber}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Paused
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-2.5">
              Collection is temporarily paused. {pausedResidentTruck.coords ? "The pin shows the last known location." : "No GPS location is available yet."}
            </p>
          </div>
        </div>
      ) : targetTruck && routeData ? (
        <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-56px)] lg:top-3 lg:left-3 lg:max-w-xs z-[450] transition-all animate-in fade-in-50 duration-300">
          {isCardCollapsed ? (
            /* Collapsed Compact Status Pill */
            <button
              type="button"
              onClick={() => setIsCardCollapsed(false)}
              className="flex items-center gap-2 bg-card/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/80 shadow-2xs text-xs font-bold text-foreground cursor-pointer hover:bg-muted/80 transition-all"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="truncate">{targetTruck.name}</span>
              <span className="text-primary font-medium">
                • {routeData.distanceKm} km (~{estimatedArrivalMinutes ?? routeData.durationMinutes}m)
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5 shrink-0" />
            </button>
          ) : (
            /* Full Delivery Card */
            <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-border/80 shadow-md p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <TruckIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold font-display text-foreground tracking-tight truncate">
                      {targetTruck.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {targetTruck.plateNumber}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCardCollapsed(true)}
                  className="w-6 h-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer shrink-0 transition-colors"
                  title="Collapse card"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                <div className="bg-muted/30 rounded-xl p-2.5 flex flex-col border border-border/40">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    {routeData.source === "haversine" ? "Straight-line distance" : "Road distance"}
                  </span>
                  <span className="text-sm font-extrabold font-display text-foreground tracking-tight mt-0.5">
                    {routeData.distanceKm} km
                  </span>
                </div>

                <div className="bg-muted/30 rounded-xl p-2.5 flex flex-col border border-border/40">
                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    Travel estimate
                  </span>
                  <span className="text-sm font-extrabold font-display text-primary tracking-tight mt-0.5">
                    ~{estimatedArrivalMinutes ?? routeData.durationMinutes} mins driving
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">Excludes collection time at other stops; arrival is not guaranteed.</p>
              <div className="flex items-center text-[11px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1.5 truncate">
                  <RouteIcon className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">
                    {stopsBeforeResident > 0
                      ? `${stopsBeforeResident} stop${stopsBeforeResident === 1 ? "" : "s"} before your area`
                      : "Your area is next"}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      ) : collectionDayStatus !== "paused" ? (
        <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-56px)] lg:top-3 lg:left-3 lg:max-w-xs z-[450] animate-in fade-in-50 duration-300">
          <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-border/80 shadow-md p-3.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${emptyState.iconBg}`}
              >
                {emptyState.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold font-display text-foreground tracking-tight leading-tight">
                  {emptyState.title}
                </h4>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {emptyState.badge}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-2">
              {emptyState.desc}
            </p>
            {collectionDayStatus === "gps-unavailable" && unavailableResidentTruck?.lastPing && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3 shrink-0" />
                Last GPS update: {formatManilaDateTime(unavailableResidentTruck.lastPing, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {formatRelativeTime(unavailableResidentTruck.lastPing)}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {coverageTruck?.routeStops.some((stop) => stop.isResidentBarangay && (stop.coveragePath?.length ?? 0) >= 2) && (
        <div className="absolute bottom-2.5 left-2.5 z-[450] flex items-center gap-2 rounded-xl border border-border/80 bg-card/90 px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur-md lg:bottom-3 lg:left-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Current
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-800" /> Done
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> Upcoming
          </span>
        </div>
      )}

      {/* Floating Map Action Controls (Bottom-Right) */}
      <div className="absolute bottom-2.5 right-2.5 lg:bottom-3 lg:right-3 z-[500] flex items-center gap-1 lg:gap-1.5 bg-card/90 backdrop-blur-md p-1 rounded-xl border border-border/80 shadow-sm pointer-events-auto">
        {mapTruck?.coords && (
          <button
            type="button"
            onClick={handleRecenterTruck}
            className="flex items-center gap-1 px-2.5 py-1.5 lg:py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
            title={mapTruck.status === "on-the-way" ? "Recenter on Truck" : "Recenter on Last Known Truck Location"}
          >
            <TruckIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">Truck</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleRecenterBarangay}
          className="flex items-center gap-1 px-2.5 py-1.5 lg:py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
          title="Zoom to My Collection Area"
        >
          <LocateFixed className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">My Area</span>
        </button>

        <button
          type="button"
          onClick={handleFitRouteBounds}
          className="flex items-center gap-1 px-2.5 py-1.5 lg:py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
          title="Fit Whole Route"
        >
          <Maximize2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">Fit Route</span>
        </button>
      </div>
    </div>
  );
};

export default TrackingMap;

