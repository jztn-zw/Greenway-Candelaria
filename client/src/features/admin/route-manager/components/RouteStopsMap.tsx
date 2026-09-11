import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned, Minus, Plus } from "lucide-react";
import type { Barangay } from "../hooks/useBarangays";

interface RouteStopsMapProps {
  stops: Array<{ id: string; name: string }>;
  barangays: Barangay[];
  className?: string;
}

const DEFAULT_CENTER: L.LatLngExpression = [13.93, 121.42];

const createNumberedStopPin = (stopNumber: number) =>
  L.divIcon({
    className: "",
    html: `
      <div style="width:34px;height:46px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.32));">
        <svg width="34" height="46" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
          <path d="M 18 1 C 8.6 1 1 8.6 1 18 C 1 29.5 18 47 18 47 C 18 47 35 29.5 35 18 C 35 8.6 27.4 1 18 1 Z" fill="hsl(145, 63%, 32%)" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="18" cy="18" r="11" fill="#ffffff"/>
          <text x="18" y="18.5" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="800" fill="hsl(145, 63%, 32%)" text-anchor="middle" dominant-baseline="central" alignment-baseline="central">${stopNumber}</text>
        </svg>
      </div>`,
    iconSize: [34, 46],
    iconAnchor: [17, 46],
    popupAnchor: [0, -46],
  });

const RouteStopsMap = ({ stops, barangays, className = "h-52" }: RouteStopsMapProps) => {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const mappedStops = useMemo(
    () =>
      stops.flatMap((stop, index) => {
        const barangay = barangays.find((item) => item.id === stop.id);
        const latitude = Number(barangay?.latitude);
        const longitude = Number(barangay?.longitude);

        return Number.isFinite(latitude) && Number.isFinite(longitude)
          ? [{ ...stop, index, latitude, longitude }]
          : [];
      }),
    [barangays, stops],
  );

  useEffect(() => {
    if (!elementRef.current || mapRef.current || mappedStops.length === 0) return;

    const map = L.map(elementRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const points = mappedStops.map(
      (stop) => [stop.latitude, stop.longitude] as L.LatLngTuple,
    );

    mappedStops.forEach((stop) => {
      const marker = L.marker([stop.latitude, stop.longitude], {
        icon: createNumberedStopPin(stop.index + 1),
      }).addTo(map);

      const label = document.createElement("div");
      label.className = "flex items-center gap-1.5 text-xs";
      const order = document.createElement("strong");
      order.textContent = String(stop.index + 1);
      const name = document.createElement("span");
      name.textContent = stop.name;
      label.append(order, name);
      marker.bindTooltip(label, { direction: "top", offset: [0, -38] });
    });

    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15 });

    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mappedStops]);

  if (mappedStops.length === 0) {
    return (
      <div className={`${className} rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center px-6 text-center`}>
        <div className="space-y-2">
          <MapPinned className="w-5 h-5 text-muted-foreground mx-auto" />
          <p className="text-xs font-semibold text-foreground">Map preview unavailable</p>
          <p className="text-[11px] text-muted-foreground">
            Add stops with saved barangay coordinates to preview the route.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-muted/20">
      <div ref={elementRef} className={`${className} w-full z-0`} aria-label="Ordered route stop map" />
      <div className="absolute right-2.5 top-2.5 z-[500] flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card/75 p-0.5 shadow-2xs backdrop-blur-md pointer-events-auto">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground transition-all hover:bg-muted/80 hover:text-primary active:scale-95"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-px bg-border/60" />
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground transition-all hover:bg-muted/80 hover:text-primary active:scale-95"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>
      {mappedStops.length < stops.length && (
        <div className="absolute bottom-2 left-2 z-[400] rounded-lg border border-border/70 bg-card/95 px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
          {stops.length - mappedStops.length} stop{stops.length - mappedStops.length === 1 ? "" : "s"} missing coordinates
        </div>
      )}
    </div>
  );
};

export default RouteStopsMap;
