import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned, Minus, Plus } from "lucide-react";
import type { Barangay } from "../hooks/useBarangays";

interface RouteStopsMapProps {
  stops: Array<{
    id: string;
    name: string;
    barangayId?: string;
    latitude?: number | null;
    longitude?: number | null;
    coveragePath?: [number, number][] | null;
  }>;
  barangays: Barangay[];
  className?: string;
}

const DEFAULT_CENTER: L.LatLngExpression = [13.93, 121.42];

const createOrderBadge = (stopNumber: number) =>
  L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:var(--radius-full);border:2px solid hsl(var(--map-inset));background:hsl(var(--primary));color:hsl(var(--map-inset));display:flex;align-items:center;justify-content:center;font:600 12px var(--font-ui);font-variant-numeric:tabular-nums;box-shadow:0 2px 7px rgba(0,0,0,.32);">${stopNumber}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

const RouteStopsMap = ({ stops, className = "h-52" }: RouteStopsMapProps) => {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const mappedPaths = useMemo(
    () =>
      stops.flatMap((stop, index) => {
        const points = (stop.coveragePath ?? []).flatMap((point): L.LatLngTuple[] => {
          const latitude = Number(point?.[0]);
          const longitude = Number(point?.[1]);
          return Number.isFinite(latitude) && Number.isFinite(longitude)
            ? [[latitude, longitude]]
            : [];
        });

        return points.length >= 2 ? [{ ...stop, index, points }] : [];
      }),
    [stops],
  );

  useEffect(() => {
    if (!elementRef.current || mapRef.current || mappedPaths.length === 0) return;

    const map = L.map(elementRef.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const allPoints: L.LatLngTuple[] = [];

    mappedPaths.forEach((stop) => {
      allPoints.push(...stop.points);

      L.polyline(stop.points, {
        color: "hsl(var(--map-inset))",
        weight: 8,
        opacity: 0.92,
        interactive: false,
      }).addTo(map);

      const coverageLine = L.polyline(stop.points, {
        color: "hsl(var(--highlight))",
        weight: 5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      const label = document.createElement("div");
      label.className = "flex items-center gap-1.5 text-xs";
      const order = document.createElement("strong");
      order.textContent = `${stop.index + 1}.`;
      const name = document.createElement("span");
      name.textContent = stop.name;
      label.append(order, name);
      coverageLine.bindTooltip(label, { sticky: true, direction: "top" });

      L.marker(stop.points[0], {
        icon: createOrderBadge(stop.index + 1),
        interactive: false,
      }).addTo(map);
    });

    map.fitBounds(L.latLngBounds(allPoints), { padding: [28, 28], maxZoom: 17 });

    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mappedPaths]);

  if (mappedPaths.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center`}>
        <div className="space-y-2">
          <MapPinned className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">
            {stops.length === 0 ? "Add streets to preview the route" : "Street coverage paths are missing"}
          </p>
          <p className="text-ui-caption text-muted-foreground">
            {stops.length === 0
              ? "Selected streets will appear here as full coverage lines."
              : "Draw these street paths in Barangay Manager before scheduling the route."}
          </p>
        </div>
      </div>
    );
  }

  const missingCount = stops.length - mappedPaths.length;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-muted/20">
      <div ref={elementRef} className={`${className} z-0 w-full`} aria-label="Ordered street coverage route map" />
      <div className="pointer-events-auto absolute right-2.5 top-2.5 z-[500] flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card/80 p-0.5 shadow-2xs backdrop-blur-md">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="gw-action-ghost flex h-7 w-7 items-center justify-center rounded-lg transition-all"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-px bg-border/60" />
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="gw-action-ghost flex h-7 w-7 items-center justify-center rounded-lg transition-all"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="absolute bottom-2 left-2 z-[400] flex items-center gap-2 rounded-lg border border-border/70 bg-card/95 px-2 py-1 text-ui-overline text-muted-foreground shadow-sm">
        <span className="h-1 w-5 rounded-full bg-green-600" />
        Street coverage
      </div>
      {missingCount > 0 && (
        <div className="absolute bottom-2 right-2 z-[400] rounded-lg border border-amber-500/30 bg-amber-50/95 px-2 py-1 text-ui-overline font-medium text-amber-800 shadow-sm dark:bg-amber-950/90 dark:text-amber-300">
          {missingCount} path{missingCount === 1 ? "" : "s"} missing
        </div>
      )}
    </div>
  );
};

export default RouteStopsMap;
