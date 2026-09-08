import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
// @ts-ignore
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Truck, CollectionDayStatus } from "./types";
import {
  CalendarOff,
  CalendarClock,
  CheckCircle2,
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
  AlertTriangle,
} from "lucide-react";
import { getRoadRoute, type RoadRouteResult } from "@/services/roadRoutingService";

interface TrackingMapProps {
  trucks: Truck[];
  focusedTruckId: string | null;
  residentBarangayCoords: [number, number];
  residentAreaName: string;
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
  isCompleted: boolean,
  completedAt?: string
) => {
  if (isCompleted) {
    return `<div style="font-family:Inter,sans-serif;font-size:12px;min-width:165px;line-height:1.4;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
        <strong style="color:#0f172a;font-size:13px;">${areaName}</strong>
        <span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-size:9px;font-weight:700;padding:1px 6px;border-radius:9999px;">Done</span>
      </div>
      <div style="color:#059669;font-size:11px;font-weight:600;">
        Collection Completed ${completedAt ? `• ${completedAt}` : ""}
      </div>
      <span style="color:#64748b;font-size:10px;display:block;margin-top:2px;">Your registered barangay</span>
    </div>`;
  }
  return `<div style="font-family:Inter,sans-serif;font-size:13px;min-width:140px">
    <strong>${areaName}</strong><br/>
    <span style="color:#666;font-size:11px">Your registered barangay</span>
  </div>`;
};

const createBarangayPinIcon = (isCompleted = false) => {
  const width = 36;
  const height = 48;
  const color = "hsl(145, 63%, 32%)";

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

const createTruckPinIcon = (isFocused = false) => {
  const width = isFocused ? 42 : 36;
  const height = isFocused ? 54 : 48;
  const color = "hsl(145, 63%, 32%)";
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
          isFocused
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
  lockedToBarangay,
  collectionDayStatus,
  nextCollectionInfo,
  onSelectTruck,
  onRouteCalculated,
}: TrackingMapProps) => {
  const navigate = useNavigate();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const residentLayerRef = useRef<L.Marker | null>(null);
  const trucksLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const lastViewModeRef = useRef<"bounds" | "focused" | "barangay" | null>(null);
  const lastFocusedTruckIdRef = useRef<string | null>(null);

  const [routeData, setRouteData] = useState<RoadRouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const residentTruck = useMemo(
    () => trucks.find((t) => t.isResidentTruck),
    [trucks]
  );

  const isResidentCompleted = useMemo(() => {
    if (collectionDayStatus === "completed") return true;
    if (!residentTruck) return false;
    return (
      residentTruck.residentStopStatus === "done" ||
      residentTruck.status === "done"
    );
  }, [collectionDayStatus, residentTruck]);

  const residentCompletedAt = residentTruck?.residentStopCompletedAt;

  const activeTrucks = useMemo(
    () => trucks.filter((truck) => truck.status === "on-the-way" && truck.coords),
    [trucks]
  );
  const hasActiveTrucks = activeTrucks.length > 0;

  // Selected or primary active truck heading towards resident
  const targetTruck = useMemo(() => {
    if (focusedTruckId) {
      const found = activeTrucks.find((t) => t.id === focusedTruckId);
      if (found) return found;
    }
    const residentActiveTruck = activeTrucks.find((t) => t.isResidentTruck);
    if (residentActiveTruck) return residentActiveTruck;
    return activeTrucks[0] ?? null;
  }, [activeTrucks, focusedTruckId]);

  const stopsBeforeResident = useMemo(() => {
    if (!targetTruck) return 0;
    const residentStopIndex = targetTruck.routeStops.findIndex(
      (stop) => stop.isResidentBarangay,
    );
    return targetTruck.routeStops
      .slice(0, residentStopIndex >= 0 ? residentStopIndex : 0)
      .filter((stop) => stop.status !== "done" && stop.status !== "skipped").length;
  }, [targetTruck]);

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

    map.fitBounds(BOUNDS, { padding: DEFAULT_PADDING });
    map.setMaxBounds(BOUNDS);

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer(OSM_URL, {
      maxZoom: MAX_ZOOM,
    }).addTo(map);

    const barangayIcon = createBarangayPinIcon(isResidentCompleted);

    residentLayerRef.current = L.marker(residentBarangayCoords, {
      icon: barangayIcon,
      zIndexOffset: 500,
    }) as any;

    residentLayerRef.current
      .bindPopup(
        getBarangayPopupContent(residentAreaName, isResidentCompleted, residentCompletedAt)
      )
      .addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    trucksLayerRef.current = L.layerGroup().addTo(map);
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapElementRef.current) {
      resizeObserver.observe(mapElementRef.current);
    }

    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(BOUNDS, { padding: DEFAULT_PADDING });
      map.setMaxBounds(BOUNDS);
    }, 0);

    return () => {
      resizeObserver.disconnect();
      residentLayerRef.current = null;
      trucksLayerRef.current = null;
      routeLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const residentMarker = residentLayerRef.current;
    if (!residentMarker) return;

    residentMarker.setIcon(createBarangayPinIcon(isResidentCompleted));
    residentMarker.setLatLng(residentBarangayCoords);
    residentMarker.setPopupContent(
      getBarangayPopupContent(residentAreaName, isResidentCompleted, residentCompletedAt)
    );
  }, [residentAreaName, residentBarangayCoords, isResidentCompleted, residentCompletedAt]);

  // Road snapping route calculation and polyline rendering
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;
    routeLayer.clearLayers();

    if (!targetTruck?.coords || !residentBarangayCoords) {
      setRouteData(null);
      return;
    }

    let isMounted = true;
    setIsCalculatingRoute(true);

    getRoadRoute(targetTruck.coords, residentBarangayCoords)
      .then((result) => {
        if (!isMounted) return;
        setRouteData(result);
        onRouteCalculated?.(targetTruck.id, result);

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
    targetTruck?.id,
    targetTruck?.coords?.[0],
    targetTruck?.coords?.[1],
    residentBarangayCoords[0],
    residentBarangayCoords[1],
    onRouteCalculated,
  ]);

  useEffect(() => {
    const trucksLayer = trucksLayerRef.current;
    if (!trucksLayer) return;
    trucksLayer.clearLayers();

    activeTrucks.forEach((truck) => {
      const isFocused = targetTruck?.id === truck.id;
      const size = isFocused ? 42 : 36;

      const truckIcon = createTruckPinIcon(isFocused);

      const marker = L.marker(truck.coords!, { icon: truckIcon, zIndexOffset: 1000 });

      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:13px">
          <strong>${truck.name}</strong> · ${truck.plateNumber}<br/>
          <span>${truck.driver || "Assigned Driver"}</span>
          ${truck.driverMessage ? `<br/><em style="font-size:11px">"${truck.driverMessage}"</em>` : ""}
        </div>`
      );

      if (onSelectTruck) {
        marker.on("click", () => onSelectTruck(truck.id));
      }

      marker.addTo(trucksLayer);
    });
  }, [activeTrucks, targetTruck?.id, onSelectTruck]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (lockedToBarangay) {
      lastFocusedTruckIdRef.current = null;
      if (lastViewModeRef.current !== "barangay") {
        map.flyTo(residentBarangayCoords, Math.max(map.getZoom(), 15), {
          duration: 0.8,
        });
        lastViewModeRef.current = "barangay";
      }
      return;
    }

    if (focusedTruckId) {
      const truck = trucks.find((item) => item.id === focusedTruckId);
      if (truck?.coords) {
        const focusChanged = lastFocusedTruckIdRef.current !== focusedTruckId;
        if (lastViewModeRef.current !== "focused" || focusChanged) {
          map.flyTo(truck.coords, Math.max(map.getZoom(), 15), {
            duration: 0.8,
          });
          lastViewModeRef.current = "focused";
          lastFocusedTruckIdRef.current = focusedTruckId;
        }
      }
      return;
    }

    lastFocusedTruckIdRef.current = null;
    if (lastViewModeRef.current !== "bounds") {
      map.flyToBounds(BOUNDS, { padding: DEFAULT_PADDING, duration: 0.8 });
      lastViewModeRef.current = "bounds";
    }
  }, [focusedTruckId, lockedToBarangay, residentBarangayCoords, trucks]);

  // Map Controls
  const handleRecenterBarangay = () => {
    if (mapRef.current && residentBarangayCoords) {
      mapRef.current.setView(residentBarangayCoords, 16, { animate: true });
    }
  };

  const handleRecenterTruck = () => {
    if (mapRef.current && targetTruck?.coords) {
      mapRef.current.setView(targetTruck.coords, 16, { animate: true });
    }
  };

  const handleFitRouteBounds = () => {
    if (!mapRef.current) return;
    if (routeData && routeData.coordinates.length > 1) {
      const latLngs = routeData.coordinates.map(([lat, lng]) => L.latLng(lat, lng));
      mapRef.current.fitBounds(L.latLngBounds(latLngs), {
        padding: [48, 48],
        maxZoom: 16,
      });
    } else if (targetTruck?.coords && residentBarangayCoords) {
      const bounds = L.latLngBounds([targetTruck.coords, residentBarangayCoords]);
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
          icon: <CalendarOff className="w-6 h-6 text-muted-foreground" />,
          title: "No collection today",
          desc: nextCollectionInfo || "Check back on your next scheduled collection day.",
        };
      case "scheduled-not-started":
        return {
          icon: <CalendarClock className="w-6 h-6 text-primary" />,
          title: "Collection scheduled for today",
          desc: "Trucks will appear on the map when the driver starts GPS tracking.",
        };
      case "completed":
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          title: "Collection for today is complete",
          desc: "All trucks have finished their routes. See you next collection day!",
        };
      default:
        return {
          icon: (
            <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0h2m0 0a1 1 0 011-1V9h3l3 3v5a1 1 0 01-1 1h-1" />
            </svg>
          ),
          title: "No trucks currently tracking",
          desc: "Markers will appear when the driver starts GPS tracking.",
        };
    }
  };

  const emptyState = emptyStateContent();

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-border/80 bg-card shadow-sm [&_.leaflet-control-attribution]:!hidden">
      <div ref={mapElementRef} className="h-full w-full z-0" />

      {/* Floating Status Card: Collection Completed OR Live Delivery */}
      {isResidentCompleted ? (
        <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-56px)] sm:top-3 sm:left-3 sm:max-w-xs z-[450] transition-all animate-in fade-in-50 duration-300">
          {isCardCollapsed ? (
            /* Collapsed Compact Status Pill */
            <button
              type="button"
              onClick={() => setIsCardCollapsed(false)}
              className="flex items-center gap-2 bg-card/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-500/30 shadow-lg text-xs font-bold text-foreground cursor-pointer hover:bg-muted/80 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate">{residentAreaName}</span>
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">• Completed</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            </button>
          ) : (
            /* Full Completed Card */
            <div className="bg-card/95 backdrop-blur-md rounded-2xl border border-emerald-500/30 shadow-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold font-display text-foreground truncate">
                      {residentAreaName}
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                      Collection Completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Completed
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCardCollapsed(true)}
                    className="w-6 h-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer"
                    title="Collapse card"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-emerald-500/5 rounded-xl p-2.5 border border-emerald-500/15 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">Collection Status:</span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    Done for today
                  </span>
                </div>
                {residentCompletedAt && (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-muted-foreground text-[11px]">Finished At:</span>
                    <span className="text-[11px] font-bold text-foreground tabular-nums">
                      {residentCompletedAt}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/resident/report", {
                      state: { type: "missed-collection", truckId: residentTruck?.id },
                    });
                  }}
                  className="text-destructive hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Report Missed Trash
                </button>
                <span className="text-[10px] text-muted-foreground">
                  See you next sched
                </span>
              </div>
            </div>
          )}
        </div>
      ) : targetTruck && routeData ? (
        <div className="absolute top-2.5 left-2.5 max-w-[calc(100%-56px)] sm:top-3 sm:left-3 sm:max-w-xs z-[450] transition-all animate-in fade-in-50 duration-300">
          {isCardCollapsed ? (
            /* Collapsed Compact Status Pill */
            <button
              type="button"
              onClick={() => setIsCardCollapsed(false)}
              className="flex items-center gap-2 bg-card/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/80 shadow-lg text-xs font-bold text-foreground cursor-pointer hover:bg-muted/80 transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate">{targetTruck.name}</span>
              <span className="text-primary">• {routeData.distanceKm} km (~{routeData.durationMinutes}m)</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            </button>
          ) : (
            /* Full Delivery Card */
            <div className="bg-card/95 backdrop-blur-md rounded-2xl border border-border/80 shadow-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <TruckIcon className="w-4 h-4" />
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold font-display text-foreground truncate">
                      {targetTruck.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {targetTruck.plateNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Live En Route
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCardCollapsed(true)}
                    className="w-6 h-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer"
                    title="Collapse card"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

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
                    Est. Duration
                  </span>
                  <span className="text-sm font-extrabold text-primary tracking-tight mt-0.5">
                    ~{routeData.durationMinutes} mins
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1 truncate">
                  <RouteIcon className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">
                    {stopsBeforeResident > 0
                      ? `${stopsBeforeResident} collection stop${stopsBeforeResident === 1 ? "" : "s"} before ${residentAreaName}`
                      : `Heading to ${residentAreaName}`}
                  </span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/80 font-medium text-foreground/80 shrink-0">
                  {routeData.source === "osrm" ? "Road route" : "Approx. route"}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!hasActiveTrucks && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none">
          <div className="text-center space-y-3 px-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center">
              {emptyState.icon}
            </div>
            <div>
              <p className="text-sm font-display font-semibold text-foreground">{emptyState.title}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto leading-relaxed">
                {emptyState.desc}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Map Action Controls (Bottom-Right) */}
      <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-[500] flex items-center gap-1 sm:gap-1.5 bg-card/95 backdrop-blur-sm p-1 rounded-xl border border-border/80 shadow-md pointer-events-auto">
        {targetTruck?.coords && (
          <button
            type="button"
            onClick={handleRecenterTruck}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
            title="Recenter on Truck"
          >
            <TruckIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="hidden sm:inline">Truck</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleRecenterBarangay}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
          title="Zoom to My Barangay"
        >
          <LocateFixed className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="hidden sm:inline">My Brgy</span>
        </button>

        <button
          type="button"
          onClick={handleFitRouteBounds}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
          title="Fit Whole Route"
        >
          <Maximize2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="hidden sm:inline">Fit Route</span>
        </button>
      </div>

      {/* Location Badge (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-[400] bg-card/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-border/80 shadow-xs flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span className="text-[11px] font-display font-semibold text-foreground">
          Candelaria, Quezon
        </span>
      </div>
    </div>
  );
};

export default TrackingMap;
