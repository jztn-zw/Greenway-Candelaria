import { useEffect, useMemo, useRef } from "react";
// @ts-ignore
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Truck, CollectionDayStatus } from "./types";
import { CalendarOff, CalendarClock, CheckCircle2 } from "lucide-react";


interface TrackingMapProps {
  trucks: Truck[];
  focusedTruckId: string | null;
  residentBarangayCoords: [number, number];
  residentAreaName: string;
  lockedToBarangay: boolean;
  collectionDayStatus: CollectionDayStatus;
  nextCollectionInfo?: string;
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

const TrackingMap = ({
  trucks,
  focusedTruckId,
  residentBarangayCoords,
  residentAreaName,
  lockedToBarangay,
  collectionDayStatus,
  nextCollectionInfo,
}: TrackingMapProps) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const residentLayerRef = useRef<L.Marker | null>(null);
  const trucksLayerRef = useRef<L.LayerGroup | null>(null);
  const lastViewModeRef = useRef<"bounds" | "focused" | "barangay" | null>(null);
  const lastFocusedTruckIdRef = useRef<string | null>(null);

  const activeTrucks = useMemo(
    () => trucks.filter((truck) => truck.status === "on-the-way" && truck.coords),
    [trucks]
  );
  const hasActiveTrucks = activeTrucks.length > 0;

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: true,
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
      attribution: OSM_ATTRIBUTION,
      maxZoom: MAX_ZOOM,
    }).addTo(map);

    const barangayIcon = L.divIcon({
      className: "",
      html: `<div style="width:32px;height:32px;border-radius:50%;background:hsl(145,63%,32%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3" fill="hsl(145,63%,32%)" stroke="hsl(145,63%,32%)"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    residentLayerRef.current = L.marker(residentBarangayCoords, { icon: barangayIcon, zIndexOffset: 500 }) as any;
    residentLayerRef.current
      .bindPopup(`<div style="font-family:Inter,sans-serif;font-size:13px;min-width:140px"><strong>${residentAreaName}</strong><br/><span style="color:#666;font-size:11px">📍 Your registered barangay</span></div>`)
      .addTo(map);

    trucksLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(BOUNDS, { padding: DEFAULT_PADDING });
      map.setMaxBounds(BOUNDS);
    }, 0);

    return () => {
      residentLayerRef.current = null;
      trucksLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const residentMarker = residentLayerRef.current;
    if (!residentMarker) return;

    residentMarker.setLatLng(residentBarangayCoords);
    residentMarker.setPopupContent(
      `<div style="font-family:Inter,sans-serif;font-size:13px;min-width:140px"><strong>${residentAreaName}</strong><br/><span style="color:#666;font-size:11px">Your registered barangay</span></div>`,
    );
  }, [residentAreaName, residentBarangayCoords]);

  useEffect(() => {
    const trucksLayer = trucksLayerRef.current;
    if (!trucksLayer) return;
    trucksLayer.clearLayers();

    activeTrucks.forEach((truck) => {
      const isFocused = focusedTruckId === truck.id;
      const size = isFocused ? 40 : 36;

      const truckIcon = L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;background:hsl(145,63%,32%);border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%)${isFocused ? ';outline:3px solid hsl(145,63%,32%);outline-offset:2px' : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
            <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0h2m0 0a1 1 0 011-1V9h3l3 3v5a1 1 0 01-1 1h-1"/>
          </svg>
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(truck.coords!, { icon: truckIcon, zIndexOffset: 1000 });

      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:13px">
          <strong>${truck.name}</strong> · ${truck.plateNumber}<br/>
          <span>${truck.driver}</span>
          ${truck.driverMessage ? `<br/><em style="font-size:11px">"${truck.driverMessage}"</em>` : ""}
        </div>`
      );

      marker.addTo(trucksLayer);
    });
  }, [activeTrucks, focusedTruckId]);

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
          icon: <CheckCircle2 className="w-6 h-6 text-leaf" />,
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
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border bg-card shadow-sm">
      <div ref={mapElementRef} className="h-full w-full z-0" />

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

      <div className="absolute bottom-3 left-3 z-[400] bg-card/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border shadow-sm">
        <span className="text-[11px] font-display font-semibold text-primary">
          Candelaria, Quezon
        </span>
      </div>
    </div>
  );
};

export default TrackingMap;



