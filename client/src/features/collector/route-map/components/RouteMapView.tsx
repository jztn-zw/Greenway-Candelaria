import { useEffect, useRef, useState } from "react";
// @ts-ignore
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteStop } from "../types";
import { Crosshair, Maximize2 } from "lucide-react";
import { getRoadRoute, type RoadRouteResult } from "@/services/roadRoutingService";

interface RouteMapViewProps {
  stops: RouteStop[];
  truckCoords: [number, number];
  isOffline: boolean;
  activeStopCoords?: [number, number] | null;
  onActiveRouteChange?: (route: RoadRouteResult | null) => void;
}

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const BOUNDS: L.LatLngBoundsExpression = [
  [13.82, 121.20],
  [14.23, 121.66],
];
const MIN_ZOOM = 10;
const MAX_ZOOM = 17;
const TRUCK_FOCUS_ZOOM = 16;
const FOCUS_TOLERANCE_METERS = 20;

const statusColor = (status: RouteStop["status"]) => {
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

const statusLabel = (status: RouteStop["status"]) => {
  switch (status) {
    case "done": return "Completed";
    case "in-progress": return "In Progress";
    case "skipped": return "Skipped";
    default: return "Upcoming";
  }
};

const formatDistance = (distanceKm: number) =>
  distanceKm > 0 ? `${distanceKm.toFixed(1)} km away` : "At current location";

// Teardrop Pin Marker for Route Stops
const createStopTeardropIcon = (stop: RouteStop) => {
  const isActive = stop.status === "in-progress";
  const isDone = stop.status === "done";
  const isSkipped = stop.status === "skipped";

  const width = isActive ? 38 : 34;
  const height = isActive ? 50 : 46;
  const color = statusColor(stop.status);

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.32));cursor:pointer;">
        <svg width="${width}" height="${height}" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
          <path d="M 18 1 C 8.6 1 1 8.6 1 18 C 1 29.5 18 47 18 47 C 18 47 35 29.5 35 18 C 35 8.6 27.4 1 18 1 Z" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="18" cy="18" r="11" fill="#ffffff"/>
          <text x="18" y="18.5" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="800" fill="${color}" text-anchor="middle" dominant-baseline="central" alignment-baseline="central">
            ${stop.stopNumber}
          </text>
        </svg>
        ${
          isActive
            ? `<div style="position:absolute;top:-2px;right:-2px;width:13px;height:13px;pointer-events:none;">
                 <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:#3b82f6;opacity:0.75;animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></span>
                 <span style="position:relative;display:block;width:100%;height:100%;border-radius:50%;background:#2563eb;border:2px solid #ffffff;"></span>
               </div>`
            : isDone
            ? `<div style="position:absolute;top:-2px;right:-2px;width:15px;height:15px;border-radius:50%;background:#059669;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.35);">
                 <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                   <polyline points="20 6 9 17 4 12"></polyline>
                 </svg>
               </div>`
            : isSkipped
            ? `<div style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#d97706;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.35);color:white;font-size:9px;font-weight:900;">
                 !
               </div>`
            : ""
        }
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
};

// Teardrop Pin Marker for Collector Truck
const createCollectorTruckPinIcon = () => {
  const width = 42;
  const height = 54;
  const color = "hsl(145, 63%, 32%)";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35));cursor:pointer;">
        <svg width="${width}" height="${height}" viewBox="0 0 42 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
          <path d="M 21 1.5 C 10.2 1.5 1.5 10.2 1.5 21 C 1.5 33.5 21 52.5 21 52.5 C 21 52.5 40.5 33.5 40.5 21 C 40.5 10.2 31.8 1.5 21 1.5 Z" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="21" cy="21" r="12" fill="#ffffff"/>
          <g transform="translate(11.2, 11.5) scale(0.8)">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 18H9" fill="none" stroke="${color}" stroke-width="2.3"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-4v10" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="7" cy="18" r="2" fill="${color}"/>
            <circle cx="17" cy="18" r="2" fill="${color}"/>
          </g>
        </svg>
        <div style="position:absolute;top:-1px;right:-1px;display:flex;width:12px;height:12px;pointer-events:none;">
          <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:#10b981;opacity:0.75;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <span style="position:relative;width:100%;height:100%;border-radius:50%;background:#10b981;border:2px solid #ffffff;"></span>
        </div>
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [21, 54],
    popupAnchor: [0, -54],
  });
};

const RouteMapView = ({ stops, truckCoords, isOffline, activeStopCoords, onActiveRouteChange }: RouteMapViewProps) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const hasAutoFittedRef = useRef(false);
  const lastStopsKeyRef = useRef("");
  const userInteractedRef = useRef(false);
  const [activeRoute, setActiveRoute] = useState<RoadRouteResult | null>(null);

  // Init map
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
    }).setView(truckCoords, 14);

    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer(OSM_URL, {
      maxZoom: MAX_ZOOM,
    }).addTo(map);

    const markUserInteracted = () => {
      userInteractedRef.current = true;
    };

    map.on("dragstart", markUserInteracted);
    map.on("zoomstart", markUserInteracted);

    map.setMaxBounds(BOUNDS);
    routeLayerRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.off("dragstart", markUserInteracted);
      map.off("zoomstart", markUserInteracted);
      routeLayerRef.current = null;
      layerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Compute and render single-leg road route from truck to current active stop
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;
    routeLayer.clearLayers();

    if (!truckCoords || !activeStopCoords) {
      setActiveRoute(null);
      onActiveRouteChange?.(null);
      return;
    }

    let isCurrent = true;
    setActiveRoute(null);
    onActiveRouteChange?.(null);

    getRoadRoute(truckCoords, activeStopCoords)
      .then((result) => {
        if (!isCurrent) return;
        setActiveRoute(result);
        onActiveRouteChange?.(result);

        if (result.coordinates && result.coordinates.length > 1) {
          // Route glow outer casing
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
      .catch(() => {
        if (isCurrent) {
          setActiveRoute(null);
          onActiveRouteChange?.(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    truckCoords[0],
    truckCoords[1],
    activeStopCoords?.[0],
    activeStopCoords?.[1],
    onActiveRouteChange,
  ]);

  // Update markers
  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    const stopsKey = stops.map((s) => s.id).join("|");
    if (stopsKey !== lastStopsKeyRef.current) {
      lastStopsKeyRef.current = stopsKey;
      hasAutoFittedRef.current = false;
    }

    const allCoords = stops.map((s) => s.coords);

    // Stop markers with teardrop shape
    stops.forEach((stop) => {
      const isActive = stop.status === "in-progress";
      const color = statusColor(stop.status);
      const pinIcon = createStopTeardropIcon(stop);

      const marker = L.marker(stop.coords, { icon: pinIcon, zIndexOffset: isActive ? 500 : 0 });

      const progressInfo = stop.status === "done" && stop.completedAt
        ? `<div style="display:flex;align-items:center;gap:4px;font-size:11px;opacity:0.7;margin-top:4px">Completed at ${stop.completedAt}</div>`
        : stop.status === "skipped" && stop.skippedReason
        ? `<div style="font-size:11px;color:hsl(38,92%,40%);margin-top:4px">${stop.skippedReason}</div>`
        : stop.status === "not-yet" && stop.distanceKm > 0
        ? `<div style="font-size:11px;opacity:0.6;margin-top:4px">${formatDistance(stop.distanceKm)}</div>`
        : "";

      const popupContent = `
        <div style="font-family:Inter,system-ui,sans-serif;min-width:180px;max-width:240px;padding:2px 0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="width:28px;height:28px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;font-size:12px;font-weight:700">
              ${stop.stopNumber}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px;color:inherit">${stop.barangay}</div>
              <div style="display:flex;align-items:center;gap:4px;margin-top:1px">
                <span style="font-size:11px;font-weight:600;color:${color}">${statusLabel(stop.status)}</span>
              </div>
            </div>
          </div>
          ${progressInfo}
        </div>`;

      marker.bindPopup(popupContent, {
        autoClose: false,
        closeOnClick: false,
        closeButton: true,
        className: "tracking-popup",
        maxWidth: 260,
        minWidth: 180,
      });

      marker.addTo(layer);
    });

    // Truck marker with custom teardrop icon
    const truckIcon = createCollectorTruckPinIcon();
    L.marker(truckCoords, { icon: truckIcon, interactive: false, zIndexOffset: 1000 }).addTo(layer);

    // Auto-fit only on first load or when stop set changes, and only if user did not manually interact
    if (!hasAutoFittedRef.current && !userInteractedRef.current) {
      const bounds = L.latLngBounds([...allCoords, truckCoords]);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [36, 36],
          maxZoom: 15,
        });
        hasAutoFittedRef.current = true;
      }
    }
  }, [stops, truckCoords]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;

    userInteractedRef.current = true;
    hasAutoFittedRef.current = true;
    map.stop();

    const center = map.getCenter();
    const isAlreadyFocused =
      center.distanceTo(L.latLng(truckCoords[0], truckCoords[1])) <=
        FOCUS_TOLERANCE_METERS && map.getZoom() >= TRUCK_FOCUS_ZOOM;

    if (isAlreadyFocused) {
      const bounds = L.latLngBounds([
        ...stops.map((stop) => stop.coords),
        truckCoords,
      ]);

      if (bounds.isValid()) {
        map.flyToBounds(bounds, {
          padding: [36, 36],
          maxZoom: 15,
          duration: 0.8,
        });
        return;
      }
    }

    map.flyTo(truckCoords, TRUCK_FOCUS_ZOOM, {
      duration: 0.8,
    });
  };

  const handleFitRoute = () => {
    const map = mapRef.current;
    if (!map) return;

    userInteractedRef.current = true;
    hasAutoFittedRef.current = true;
    map.stop();

    const bounds = L.latLngBounds([
      ...stops.map((stop) => stop.coords),
      truckCoords,
    ]);

    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [36, 36],
        maxZoom: 15,
        duration: 0.8,
      });
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-border bg-card [&_.leaflet-control-attribution]:!hidden shadow-xs">
      <div ref={mapElRef} className="h-full w-full z-0" />

      {isOffline && (
        <div className="absolute top-3 left-3 right-3 z-[400] flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-amber-500/90 text-white text-xs sm:text-sm font-medium shadow-lg backdrop-blur-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
          </svg>
          <span className="truncate">Offline - progress will sync when reconnected.</span>
        </div>
      )}

      {/* Floating Map Action Controls (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 z-[400] flex items-center gap-1 sm:gap-1.5 bg-card/95 backdrop-blur-sm p-1 rounded-xl border border-border/80 shadow-md">
        <button
          type="button"
          onClick={handleRecenter}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
          title="Recenter on Truck"
        >
          <Crosshair className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="hidden sm:inline">Truck</span>
        </button>

        <button
          type="button"
          onClick={handleFitRoute}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
          title="Fit All Stops"
        >
          <Maximize2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="hidden sm:inline">Fit Route</span>
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-[400] bg-card/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-border/80 shadow-xs flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span className="text-[11px] font-display font-semibold text-foreground">
          Candelaria, Quezon
        </span>
      </div>
    </div>
  );
};

export default RouteMapView;


