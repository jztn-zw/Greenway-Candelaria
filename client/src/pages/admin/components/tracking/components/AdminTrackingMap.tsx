import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AdminTruck } from "../types";

interface AdminTrackingMapProps {
  trucks: AdminTruck[];
  focusedTruckId: string | null;
  onMarkerClick: (truckId: string) => void;
  replayPath?: [number, number][];
  replayIndex?: number;
  theme?: "light" | "dark";
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

const AdminTrackingMap = ({
  trucks,
  focusedTruckId,
  onMarkerClick,
  replayPath,
  replayIndex,
}: Omit<AdminTrackingMapProps, 'theme'> & { theme?: string }) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trucksLayerRef = useRef<L.LayerGroup | null>(null);
  const replayLayerRef = useRef<L.LayerGroup | null>(null);
  const lastViewModeRef = useRef<"bounds" | "focused" | null>(null);
  const lastFocusedTruckIdRef = useRef<string | null>(null);

  const visibleTrucks = useMemo(
    () =>
      trucks.filter(
        (t) => Boolean(t.coords) && t.status === "on-the-way",
      ),
    [trucks],
  );

  // ── Init map ──────────────────────────────────────────────
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
    });

    map.fitBounds(BOUNDS, { padding: DEFAULT_PADDING });
    map.setMaxBounds(BOUNDS);

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer(OSM_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: MAX_ZOOM,
    }).addTo(map);

    trucksLayerRef.current = L.layerGroup().addTo(map);
    replayLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(BOUNDS, { padding: DEFAULT_PADDING });
    map.setMaxBounds(BOUNDS);
    }, 0);

    return () => {
      trucksLayerRef.current = null;
      replayLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Update truck markers ──────────────────────────────────
  useEffect(() => {
    const layer = trucksLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    visibleTrucks.forEach((truck) => {
      const isNear = truck.barangaysAway !== null && truck.barangaysAway <= 3;
      const isFocused = focusedTruckId === truck.id;
      const isLive = truck.status === "on-the-way";
      const size = isFocused ? 42 : 36;
      const markerBg = isLive ? "hsl(145,63%,32%)" : "hsl(215, 14%, 45%)";

      // Clean truck marker — circle with truck icon, no label underneath
      const truckIcon = L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;background:${markerBg};border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%)${isFocused ? `;outline:3px solid ${markerBg};outline-offset:2px` : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
            <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0h2m0 0a1 1 0 011-1V9h3l3 3v5a1 1 0 01-1 1h-1"/>
          </svg>
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(truck.coords!, { icon: truckIcon, zIndexOffset: 1000 });

      // Enhanced themed popup with close button (autoClose: false, closeOnClick: false)
      const progressPct = truck.totalBarangays > 0
        ? Math.round((truck.completedBarangays / truck.totalBarangays) * 100)
        : 0;

      const popupContent = `
        <div style="font-family:Inter,system-ui,sans-serif;font-size:13px;min-width:220px;max-width:280px;padding:4px 0">
          <div style="display:flex;align-items:center;justify-content:between;gap:8px;margin-bottom:10px">
            <div style="width:32px;height:32px;background:${markerBg};border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0h2m0 0a1 1 0 011-1V9h3l3 3v5a1 1 0 01-1 1h-1"/>
              </svg>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px;color:inherit">${truck.name}</div>
              <div style="font-size:11px;opacity:0.6">${truck.plateNumber}</div>
            </div>
            <div style="font-size:10px;padding:2px 6px;border-radius:999px;background:${isLive ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.2)"};color:${isLive ? "hsl(145,63%,32%)" : "hsl(215,14%,45%)"};font-weight:600">
              ${isLive ? "LIVE" : "OFFLINE"}
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="opacity:0.5">👤</span>
              <span>${truck.driver}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="opacity:0.5">📍</span>
              <span>${truck.currentBarangay}</span>
            </div>
            ${truck.wasteType ? `
            <div style="display:flex;align-items:center;gap:6px">
              <span style="opacity:0.5">♻️</span>
              <span>${truck.wasteType}</span>
            </div>` : ''}
          </div>

          ${truck.totalBarangays > 0 ? `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(128,128,128,0.15)">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
              <span style="opacity:0.6">Route Progress</span>
              <span style="font-weight:600">${truck.completedBarangays}/${truck.totalBarangays}</span>
            </div>
            <div style="height:6px;border-radius:3px;background:rgba(128,128,128,0.15);overflow:hidden">
              <div style="height:100%;width:${progressPct}%;border-radius:3px;background:hsl(145,63%,32%);transition:width 0.3s ease"></div>
            </div>
          </div>` : ''}

          ${truck.driverMessages.length > 0 ? `
          <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:rgba(128,128,128,0.08);border:1px solid rgba(128,128,128,0.1);font-size:11px;font-style:italic;line-height:1.4">
            💬 "${truck.driverMessages[truck.driverMessages.length - 1].text}"
          </div>` : ''}

          ${isNear ? `
          <div style="margin-top:8px;padding:6px 10px;border-radius:8px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.15);font-size:11px;font-weight:600;color:hsl(145,63%,32%)">
            ⚡ ${truck.barangaysAway} barangay${truck.barangaysAway! > 1 ? 's' : ''} away from next stop
          </div>` : ''}
        </div>`;

      marker.bindPopup(popupContent, {
        autoClose: false,
        closeOnClick: false,
        closeButton: true,
        className: "tracking-popup",
        maxWidth: 300,
        minWidth: 240,
      });

      marker.on("click", () => onMarkerClick(truck.id));
      marker.addTo(layer);
    });
  }, [visibleTrucks, focusedTruckId, onMarkerClick]);

  // Focus behavior (guarded to avoid repeated zoom/fly on live updates)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!focusedTruckId) {
      lastFocusedTruckIdRef.current = null;
      if (lastViewModeRef.current !== "bounds") {
        map.flyToBounds(BOUNDS, { padding: DEFAULT_PADDING, duration: 0.8 });
        lastViewModeRef.current = "bounds";
      }
      return;
    }

    const truck = visibleTrucks.find((t) => t.id === focusedTruckId);
    if (!truck?.coords) {
      lastFocusedTruckIdRef.current = null;
      if (lastViewModeRef.current !== "bounds") {
        map.flyToBounds(BOUNDS, { padding: DEFAULT_PADDING, duration: 0.8 });
        lastViewModeRef.current = "bounds";
      }
      return;
    }

    const focusChanged = lastFocusedTruckIdRef.current !== focusedTruckId;
    if (lastViewModeRef.current !== "focused" || focusChanged) {
      map.flyTo(truck.coords, Math.max(map.getZoom(), 15), { duration: 0.8 });
      lastViewModeRef.current = "focused";
      lastFocusedTruckIdRef.current = focusedTruckId;
    }
  }, [focusedTruckId, visibleTrucks]);

  // ── Replay path ───────────────────────────────────────────
  useEffect(() => {
    const layer = replayLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    if (!replayPath || replayPath.length === 0) return;

    const displayIndex = replayIndex ?? replayPath.length - 1;
    const visiblePath = replayPath.slice(0, displayIndex + 1);

    L.polyline(visiblePath, {
      color: "hsl(145, 63%, 32%)",
      weight: 3,
      opacity: 0.7,
      dashArray: "8 4",
    }).addTo(layer);

    visiblePath.forEach((point, i) => {
      L.circleMarker(point, {
        radius: i === displayIndex ? 8 : 5,
        color: "hsl(145, 63%, 32%)",
        weight: 2,
        fillColor:
          i === displayIndex ? "hsl(145, 63%, 32%)" : "hsl(40, 20%, 97%)",
        fillOpacity: 1,
      }).addTo(layer);
    });

    map.fitBounds(L.latLngBounds(visiblePath), { padding: [40, 40] });
  }, [replayPath, replayIndex]);

  const hasAnyVisibleTruck = visibleTrucks.length > 0;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border bg-card">
      <div ref={mapElRef} className="h-full w-full z-0" />

      {!hasAnyVisibleTruck && !replayPath && (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none">
          <div className="text-center space-y-3 px-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-muted flex items-center justify-center">
              <svg
                className="w-7 h-7 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0h2m0 0a1 1 0 011-1V9h3l3 3v5a1 1 0 01-1 1h-1"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-display font-semibold text-foreground">
                No trucks currently tracking
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto">
                Markers will appear when drivers start GPS tracking on their
                devices.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location label */}
      <div className="absolute bottom-3 left-3 z-[400] bg-card/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border shadow-sm">
        <span className="text-[11px] font-display font-semibold text-primary">
          Candelaria, Quezon
        </span>
      </div>
    </div>
  );
};

export default AdminTrackingMap;











