import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinned } from "lucide-react";
import type { Barangay } from "../hooks/useBarangays";

interface RouteStopsMapProps {
  stops: Array<{ id: string; name: string }>;
  barangays: Barangay[];
  className?: string;
}

const DEFAULT_CENTER: L.LatLngExpression = [13.93, 121.42];

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
      attributionControl: true,
      scrollWheelZoom: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const points = mappedStops.map(
      (stop) => [stop.latitude, stop.longitude] as L.LatLngTuple,
    );

    if (points.length > 1) {
      L.polyline(points, {
        color: "hsl(145, 63%, 32%)",
        weight: 3,
        opacity: 0.8,
        dashArray: "8 6",
      }).addTo(map);
    }

    mappedStops.forEach((stop) => {
      const marker = L.circleMarker([stop.latitude, stop.longitude], {
        radius: 12,
        color: "white",
        weight: 3,
        fillColor: "hsl(145, 63%, 32%)",
        fillOpacity: 1,
      }).addTo(map);

      const label = document.createElement("div");
      label.className = "flex items-center gap-1.5 text-xs";
      const order = document.createElement("strong");
      order.textContent = String(stop.index + 1);
      const name = document.createElement("span");
      name.textContent = stop.name;
      label.append(order, name);
      marker.bindTooltip(label, { direction: "top", offset: [0, -10] });

      const orderIcon = L.divIcon({
        className: "",
        html: `<span aria-hidden="true" style="display:flex;width:24px;height:24px;align-items:center;justify-content:center;color:white;font:700 11px Inter,sans-serif">${stop.index + 1}</span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([stop.latitude, stop.longitude], {
        icon: orderIcon,
        interactive: false,
        keyboard: false,
      }).addTo(map);
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
      {mappedStops.length < stops.length && (
        <div className="absolute bottom-2 left-2 z-[400] rounded-lg border border-border/70 bg-card/95 px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
          {stops.length - mappedStops.length} stop{stops.length - mappedStops.length === 1 ? "" : "s"} missing coordinates
        </div>
      )}
    </div>
  );
};

export default RouteStopsMap;
