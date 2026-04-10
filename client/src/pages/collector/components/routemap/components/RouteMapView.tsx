import { useEffect, useRef } from "react";
// @ts-ignore
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteStop } from "../types";
import { Crosshair } from "lucide-react";

interface RouteMapViewProps {
  stops: RouteStop[];
  truckCoords: [number, number];
  isOffline: boolean;
}

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
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
      return "hsl(215, 14%, 72%)";
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

const statusIcon = (status: RouteStop["status"]) => {
  switch (status) {
    case "done": return "OK";
    case "in-progress": return "LIVE";
    case "skipped": return "!";
    default: return "-";
  }
};

const formatDistance = (distanceKm: number) =>
  distanceKm > 0 ? `${distanceKm.toFixed(1)} km away` : "At current location";

const RouteMapView = ({ stops, truckCoords, isOffline }: RouteMapViewProps) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const hasAutoFittedRef = useRef(false);
  const lastStopsKeyRef = useRef("");
  const userInteractedRef = useRef(false);

  // Init map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, {
      zoomControl: false,
      attributionControl: true,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: BOUNDS,
      maxBoundsViscosity: 0.6,
      worldCopyJump: false,
    }).setView(truckCoords, 14);

    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer(OSM_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: MAX_ZOOM,
    }).addTo(map);

    const markUserInteracted = () => {
      userInteractedRef.current = true;
    };

    map.on("dragstart", markUserInteracted);
    map.on("zoomstart", markUserInteracted);

    map.setMaxBounds(BOUNDS);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.off("dragstart", markUserInteracted);
      map.off("zoomstart", markUserInteracted);
      layerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

    // Stop markers — themed pin style
    stops.forEach((stop) => {
      const isActive = stop.status === "in-progress";
      const isDone = stop.status === "done";
      const isSkipped = stop.status === "skipped";
      const color = statusColor(stop.status);

      const size = isActive ? 32 : 26;
      const borderColor = isDone ? color : isSkipped ? "hsl(38, 92%, 50%)" : isActive ? "hsl(217, 91%, 60%)" : "hsl(215, 14%, 82%)";
      const bgColor = isDone ? color : isSkipped ? "hsl(38, 92%, 95%)" : isActive ? "hsl(217, 91%, 95%)" : "hsl(var(--card))";
      const textColor = isDone ? "white" : isSkipped ? "hsl(38, 70%, 35%)" : isActive ? "hsl(217, 91%, 50%)" : "hsl(var(--muted-foreground))";
      const shadow = isActive ? "0 0 0 4px hsla(217,91%,60%,0.2),0 2px 8px rgba(0,0,0,0.15)" : "0 2px 6px rgba(0,0,0,0.12)";

      const pinIcon = L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;border-radius:10px;background:${bgColor};border:2.5px solid ${borderColor};box-shadow:${shadow};display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);font-family:Inter,system-ui,sans-serif;font-size:${isActive ? 12 : 11}px;font-weight:700;color:${textColor};${isActive ? 'animation:pulse 2s infinite' : ''}">${stop.stopNumber}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(stop.coords, { icon: pinIcon, zIndexOffset: isActive ? 500 : 0 });

      const progressInfo = stop.status === "done" && stop.completedAt
        ? `<div style="display:flex;align-items:center;gap:4px;font-size:11px;opacity:0.7;margin-top:2px">Completed at ${stop.completedAt}</div>`
        : stop.status === "skipped" && stop.skippedReason
        ? `<div style="font-size:11px;color:hsl(38,92%,40%);margin-top:2px">${stop.skippedReason}</div>`
        : stop.status === "not-yet" && stop.distanceKm > 0
        ? `<div style="font-size:11px;opacity:0.6;margin-top:2px">${formatDistance(stop.distanceKm)}</div>`
        : "";

      const popupContent = `
        <div style="font-family:Inter,system-ui,sans-serif;min-width:180px;max-width:240px;padding:2px 0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:28px;height:28px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;font-size:13px;font-weight:700">
              ${stop.stopNumber}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px;color:inherit">${stop.barangay}</div>
              <div style="display:flex;align-items:center;gap:4px;margin-top:1px">
                <span style="font-size:10px">${statusIcon(stop.status)}</span>
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

    // Auto-open popup for active stop
    // (handled by Leaflet interaction)

    // Truck icon
    const truckIcon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;background:hsl(145,63%,32%);border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
          <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0h2m0 0a1 1 0 011-1V9h3l3 3v5a1 1 0 01-1 1h-1"/>
        </svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    L.marker(truckCoords, { icon: truckIcon, interactive: false, zIndexOffset: 1000 }).addTo(layer);

    // Auto-fit only on first load or when stop set changes, and only if user did not manually interact.
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

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border bg-card">
      <div ref={mapElRef} className="h-full w-full z-0" />

      {isOffline && (
        <div className="absolute top-3 left-3 right-3 z-[400] flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-yellow-500/90 text-white text-xs sm:text-sm font-medium shadow-lg backdrop-blur-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01" />
          </svg>
          <span className="truncate">Offline - progress will sync when reconnected.</span>
        </div>
      )}

      <button
        onClick={handleRecenter}
        className="absolute bottom-4 right-4 z-[400] w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-card border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors"
        title="Recenter on truck"
      >
        <Crosshair className="w-4 h-4 text-primary" />
      </button>

      <div className="absolute bottom-4 left-4 z-[400] bg-card/95 backdrop-blur-sm px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-border shadow-sm">
        <span className="text-[10px] sm:text-[11px] font-display font-semibold text-primary">
          Candelaria, Quezon
        </span>
      </div>
    </div>
  );
};

export default RouteMapView;








