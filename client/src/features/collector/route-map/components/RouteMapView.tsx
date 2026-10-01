import { useEffect, useRef, useState } from "react";
import { createTrackingLocationPin } from "@/components/maps/trackingLocationPin";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteStop } from "../types";
import { Crosshair, Maximize2, Plus, Minus } from "lucide-react";
import { getRoadRoute, type RoadRouteResult } from "@/services/roadRoutingService";

interface RouteMapViewProps {
  stops: RouteStop[];
  truckCoords: [number, number] | null;
  activeStopCoords?: [number, number] | null;
  onActiveRouteChange?: (route: RoadRouteResult | null) => void;
  preview?: boolean;
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
      return "hsl(var(--primary))";
    case "in-progress":
      return "hsl(var(--info))";
    case "skipped":
      return "hsl(var(--warning))";
    default:
      return "hsl(var(--muted-foreground))";
  }
};

const coverageColor = (status: RouteStop["status"]) => {
  switch (status) {
    case "in-progress":
      return "hsl(var(--highlight))";
    case "done":
      return "hsl(var(--success-700))";
    case "skipped":
      return "hsl(var(--warning))";
    default:
      return "hsl(var(--neutral-400))";
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

const escapeHtml = (value: string) => {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
};
const formatDistance = (distanceKm: number) =>
  distanceKm > 0 ? `${distanceKm.toFixed(1)} km away` : "At current location";

const createStopTeardropIcon = (stop: RouteStop) =>
  createTrackingLocationPin(statusColor(stop.status), stop.status, stop.stopNumber);

const createCoverageOrderIcon = (stop: RouteStop) =>
  createTrackingLocationPin(coverageColor(stop.status), stop.status, stop.stopNumber);

// Teardrop Pin Marker for Collector Truck
const createCollectorTruckPinIcon = () => {
  const width = 42;
  const height = 54;
  const color = "hsl(var(--primary))";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35));cursor:pointer;">
        <svg width="${width}" height="${height}" viewBox="0 0 42 54" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
          <path d="M 21 1.5 C 10.2 1.5 1.5 10.2 1.5 21 C 1.5 33.5 21 52.5 21 52.5 C 21 52.5 40.5 33.5 40.5 21 C 40.5 10.2 31.8 1.5 21 1.5 Z" fill="${color}" stroke="hsl(var(--map-inset))" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="21" cy="21" r="12" fill="hsl(var(--map-inset))"/>
          <g transform="translate(11.2, 11.5) scale(0.8)">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 18H9" fill="none" stroke="${color}" stroke-width="2.3"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-4v10" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="7" cy="18" r="2" fill="${color}"/>
            <circle cx="17" cy="18" r="2" fill="${color}"/>
          </g>
        </svg>
        <div style="position:absolute;top:-1px;right:-1px;display:flex;width:12px;height:12px;pointer-events:none;">
          <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:hsl(var(--highlight));opacity:0.75;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <span style="position:relative;width:100%;height:100%;border-radius:50%;background:hsl(var(--highlight));border:2px solid hsl(var(--map-inset));"></span>
        </div>
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [21, 54],
    popupAnchor: [0, -54],
  });
};

const RouteMapView = ({ stops, truckCoords, activeStopCoords, onActiveRouteChange, preview = false }: RouteMapViewProps) => {
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
    }).setView([14.0388, 121.4285], 14);

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
            color: "hsl(var(--info-600))",
            dashArray: result.source === "haversine" ? "8 8" : undefined,
            weight: 6,
            opacity: 0.7,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(routeLayer);

          // Inner vibrant road track
          L.polyline(result.coordinates, {
            color: "hsl(var(--info-400))",
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
  }, [truckCoords, activeStopCoords, onActiveRouteChange]);

  // Update markers
  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    const stopsKey = stops
      .map((stop) => `${stop.id}:${stop.coveragePath?.length ?? 0}`)
      .join("|");
    if (stopsKey !== lastStopsKeyRef.current) {
      lastStopsKeyRef.current = stopsKey;
      hasAutoFittedRef.current = false;
    }

    const allCoords = stops.filter((stop) => stop.hasCoordinates !== false).flatMap((stop) => stop.coveragePath ?? [stop.coords]);

    // Render full street coverage with location pins at each street's start.
    stops.forEach((stop) => {
      if (stop.hasCoordinates === false) return;
      const isActive = stop.status === "in-progress";
      const color = statusColor(stop.status);

      if (stop.coveragePath && stop.coveragePath.length >= 2) {
        L.polyline(stop.coveragePath, {
          color: "hsl(var(--map-inset))",
          weight: isActive ? 10 : 8,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
          interactive: false,
        }).addTo(layer);

        const coverageLine = L.polyline(stop.coveragePath, {
          color: coverageColor(stop.status),
          weight: isActive ? 7 : 5,
          opacity: stop.status === "done" ? 0.68 : 0.95,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layer);

        const tooltip = document.createElement("div");
        tooltip.className = "text-xs";
        const title = document.createElement("strong");
        title.textContent = `${stop.stopNumber}. ${stop.barangay}`;
        const status = document.createElement("div");
        status.textContent = statusLabel(stop.status);
        status.style.color = coverageColor(stop.status);
        status.style.fontSize = "11px";
        tooltip.append(title, status);
        coverageLine.bindTooltip(tooltip, { sticky: true, direction: "top" });

        L.marker(stop.coveragePath[0], {
          icon: createCoverageOrderIcon(stop),
          interactive: false,
          zIndexOffset: isActive ? 500 : 0,
        }).addTo(layer);
        return;
      }

      const pinIcon = createStopTeardropIcon(stop);

      const marker = L.marker(stop.coords, { icon: pinIcon, zIndexOffset: isActive ? 500 : 0 });

      const progressInfo = stop.status === "done" && stop.completedAt
        ? `<div style="display:flex;align-items:center;gap:4px;font-size:11px;opacity:0.7;margin-top:4px">Completed at ${escapeHtml(stop.completedAt)}</div>`
        : stop.status === "skipped" && stop.skippedReason
        ? `<div style="font-size:11px;color:hsl(var(--warning-foreground));margin-top:4px">${escapeHtml(stop.skippedReason)}</div>`
        : stop.status === "not-yet" && stop.distanceKm > 0
        ? `<div style="font-size:11px;opacity:0.6;margin-top:4px">${formatDistance(stop.distanceKm)}</div>`
        : "";

      const popupContent = `
        <div style="font-family:var(--font-ui);font-variant-numeric:tabular-nums;min-width:180px;max-width:240px;padding:2px 0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="width:28px;height:28px;border-radius:var(--radius);background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;font-size:12px;font-weight:700">
              ${stop.stopNumber}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px;color:inherit">${escapeHtml(stop.barangay)}</div>
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
    if (truckCoords) L.marker(truckCoords, { icon: truckIcon, interactive: false, zIndexOffset: 1000 }).addTo(layer);

    // On smaller screens, preserve the collector's map position instead of
    // automatically moving the viewport as route data refreshes. The manual
    // Recenter and Fit Route controls remain available at every screen size.
    const isSmallScreen = window.matchMedia("(max-width: 767px)").matches;

    // Auto-fit only on larger screens, on first load or when stop set changes,
    // and only if the collector has not manually interacted with the map.
    if ((!isSmallScreen || preview) && !hasAutoFittedRef.current && !userInteractedRef.current) {
      const bounds = L.latLngBounds([...allCoords, ...(truckCoords ? [truckCoords] : [])]);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [36, 36],
          maxZoom: 15,
        });
        hasAutoFittedRef.current = true;
      }
    }
  }, [stops, truckCoords, preview]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || !truckCoords) return;

    userInteractedRef.current = true;
    hasAutoFittedRef.current = true;
    map.stop();

    const center = map.getCenter();
    const isAlreadyFocused =
      center.distanceTo(L.latLng(truckCoords[0], truckCoords[1])) <=
        FOCUS_TOLERANCE_METERS && map.getZoom() >= TRUCK_FOCUS_ZOOM;

    if (isAlreadyFocused) {
      const bounds = L.latLngBounds([
        ...stops.filter((stop) => stop.hasCoordinates !== false).flatMap((stop) => stop.coveragePath ?? [stop.coords]),
        ...(truckCoords ? [truckCoords] : []),
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
      ...stops.filter((stop) => stop.hasCoordinates !== false).flatMap((stop) => stop.coveragePath ?? [stop.coords]),
      ...(truckCoords ? [truckCoords] : []),
    ]);

    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [36, 36],
        maxZoom: 15,
        duration: 0.8,
      });
    }
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  return (
    <div className={`relative h-full w-full overflow-hidden bg-card [&_.leaflet-control-attribution]:!hidden ${preview ? "" : "rounded-2xl border border-border shadow-xs"}`}>
      <div ref={mapElRef} className="h-full w-full z-0" />

      {/* Floating Zoom Controls (Top-Right) */}
      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-[400] flex flex-col bg-card/75 backdrop-blur-md rounded-xl border border-border/70 shadow-2xs overflow-hidden p-0.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleZoomIn}
          className="gw-action-ghost w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-all rounded-lg cursor-pointer select-none"
          title="Zoom In"
          aria-label="Zoom in"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
        <div className="h-px bg-border/60 mx-1" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="gw-action-ghost w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-all rounded-lg cursor-pointer select-none"
          title="Zoom Out"
          aria-label="Zoom out"
        >
          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <div className="absolute left-2.5 top-2.5 z-[400] flex items-center gap-2 rounded-lg border border-border/70 bg-card/90 px-2.5 py-1.5 text-ui-overline font-semibold text-muted-foreground shadow-2xs sm:left-3 sm:top-3">
        {preview ? (
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Planned stops</span>
        ) : (
          <>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-600" /> Current</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-900" /> Done</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Upcoming</span>
          </>
        )}
      </div>

      {/* Floating Map Action Controls (Bottom-Right) */}
      <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-[400] flex items-center gap-1 sm:gap-1.5 bg-card/75 backdrop-blur-md p-1 rounded-lg border border-border/70 shadow-2xs">
        {!preview && (
          <button
            type="button"
            onClick={handleRecenter}
            className="gw-action-ghost flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation select-none"
            title="Recenter on Truck"
          >
            <Crosshair className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Truck</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleFitRoute}
          className="gw-action-ghost flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation select-none"
          title="Fit All Stops"
        >
          <Maximize2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Fit Route</span>
        </button>
      </div>

      <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-[400] bg-card/75 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-border/70 shadow-2xs flex items-center max-w-[130px] sm:max-w-none">
        <span className="text-ui-overline sm:text-ui-caption font-body font-semibold text-foreground truncate">
          {preview ? "Route preview · GPS off" : activeRoute?.source === "haversine" ? "Estimated straight-line path" : "Candelaria, Quezon"}
        </span>
      </div>
    </div>
  );
};

export default RouteMapView;

