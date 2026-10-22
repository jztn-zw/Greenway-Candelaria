import { updateMapPinScale } from "@/components/maps/mapPinScale";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { createResidentPinIcon } from "@/components/common/residentMapPin";
import "leaflet/dist/leaflet.css";
import "./residentSetupMap.css";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { mapControlStyles } from "@/components/common/mapControlStyles";
import MapAttribution from "@/components/common/MapAttribution";
import type { BarangayStreetRow } from "@/services/barangaysService";
import { locationPath, streetLocationPoints, validLocationPoint, type ResidentSetupLocation } from "./residentLocation";

interface Props {
  streets: BarangayStreetRow[];
  streetId: string;
  center: [number, number] | null;
  value: ResidentSetupLocation | null;
  method: ResidentSetupLocation["method"] | null;
  disabled: boolean;
  onPin: (point: [number, number]) => void;
  onStreetPoint: (index: number) => void;
  onAvailability: (ready: boolean) => void;
}

export default function ResidentSetupMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const ready = useRef(false);
  const framedStreet = useRef<string | null>(null);
  const focusedPoint = useRef<string | null>(null);

  useEffect(() => {
    if (!host.current) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let observer: ResizeObserver | undefined;
    const status = (next: typeof state) => {
      if (!active) return;
      ready.current = next === "ready";
      setState(next);
      latest.current.onAvailability(ready.current);
    };
    status("loading");
    try {
      const instance = L.map(host.current, { scrollWheelZoom: true, zoomControl: false, attributionControl: false });
      map.current = instance;
      const resizePoints = () => {
        if (!host.current) return;
        const zoom = instance.getZoom();
        updateMapPinScale(host.current, zoom);
        const size = Math.max(10, Math.min(30, 10 + (zoom - 14) * 4));
        host.current.style.setProperty("--street-point-size", `${size}px`);
        host.current.style.setProperty("--street-point-font", zoom >= 17 ? "11px" : "10px");
        host.current.style.setProperty("--street-point-number-opacity", zoom >= 15 ? "1" : "0");
      };
      instance.on("zoomend", resizePoints);
      const paths = latest.current.streets.flatMap(street => locationPath(street.coverage_path));
      if (paths.length) instance.fitBounds(L.latLngBounds(paths), { padding: [24, 24], maxZoom: 16 });
      else instance.setView(latest.current.center ?? [13.931, 121.424], 15);
      resizePoints();
      let errors = 0;
      let initialized = false;
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19,
      });
      tiles.on("loading", () => {
        errors = 0; clearTimeout(timer);
        // Zooming and panning fetch more tiles without restarting the map.
        if (!initialized) status("loading");
        timer = setTimeout(() => status("failed"), 12000);
      });
      tiles.on("tileerror", () => { errors++; status("failed"); });
      tiles.on("load", () => {
        clearTimeout(timer);
        if (!errors) initialized = true;
        status(errors ? "failed" : "ready");
      });
      timer = setTimeout(() => status("failed"), 12000);
      tiles.addTo(instance);
      layer.current = L.layerGroup().addTo(instance);
      instance.on("click", (event: L.LeafletMouseEvent) => {
        if (ready.current && !latest.current.disabled && latest.current.method === "MANUAL_PIN") {
          latest.current.onPin([event.latlng.lat, event.latlng.lng]);
        }
      });
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => instance.invalidateSize());
        observer.observe(host.current);
      }
    } catch { status("failed"); }
    return () => {
      active = false; ready.current = false;
      clearTimeout(timer); observer?.disconnect();
      map.current?.remove(); map.current = null; layer.current = null; framedStreet.current = null; focusedPoint.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    const instance = map.current, group = layer.current;
    if (!instance || !group) return;
    try {
      group.clearLayers();
      const street = props.streets.find(row => row.id === props.streetId);
      const path = locationPath(street?.coverage_path);
      if (framedStreet.current !== "" && !props.streetId) {
        const allPaths = props.streets.flatMap(row => locationPath(row.coverage_path));
        if (allPaths.length) { instance.fitBounds(L.latLngBounds(allPaths), { padding: [24, 24], maxZoom: 16 }); framedStreet.current = ""; }
      }
      if (props.streetId !== framedStreet.current && path.length) {
        instance.fitBounds(L.latLngBounds(path), { padding: [28, 28], maxZoom: 17 });
        framedStreet.current = props.streetId;
      }
      if (props.method === "STREET_POINT") streetLocationPoints(street).forEach((point, index) => {
        const selected = props.value?.method === "STREET_POINT" && props.value.pointIndex === index;
        const marker = L.marker(point, { title: `Street point ${index + 1}`, icon: selected ? createResidentPinIcon() : L.divIcon({
          className: "resident-setup-street-marker", html: `<span class="resident-setup-street-point${selected ? ' is-selected' : ''}"><span class="resident-setup-street-number">${index + 1}</span></span>`, iconSize: [36, 36], iconAnchor: [18, 18],
        }) }).addTo(group);
        marker.on("click", () => { if (ready.current && !latest.current.disabled) latest.current.onStreetPoint(index); });
      });
      if (props.value && validLocationPoint([props.value.latitude, props.value.longitude])) {
        const point: [number, number] = [props.value.latitude, props.value.longitude];
        if (props.method !== null && props.value.method === "CURRENT_LOCATION") {
          L.circle(point, { radius: Math.min(props.value.accuracyMeters, 1000), color: "hsl(var(--primary))", opacity: 0.55, fillColor: "hsl(var(--primary))", fillOpacity: 0.1, weight: 1.5, dashArray: "5 5", interactive: false }).addTo(group);
        }
        if (props.method === null || props.value.method !== "STREET_POINT") {
          L.marker(point, { interactive: false, keyboard: false,
            title: props.method === null ? "Your saved location" : "Your selected location",
            icon: createResidentPinIcon(),
          }).addTo(group);
        }
        const focusKey = props.method === null ? `saved:${point.join(',')}`
          : props.value.method === "CURRENT_LOCATION" ? `${props.value.capturedAt}:${point.join(',')}` : null;
        if (focusKey && focusedPoint.current !== focusKey) {
          instance.setView(point, 17); focusedPoint.current = focusKey;
        } else if (!instance.getBounds().contains(point)) instance.panTo(point);
      }
    } catch { ready.current = false; setState("failed"); latest.current.onAvailability(false); }
  }, [props.streets, props.streetId, props.method, props.value, attempt]);

  return <div className="space-y-2">
    <div className="relative isolate overflow-hidden rounded-xl border border-border/80 bg-muted">
      <div ref={host} role="region" aria-label="Resident location map" className="relative z-0 h-72 w-full sm:h-80" />
      <MapAttribution />
      <div className={mapControlStyles.zoom} role="group" aria-label="Map zoom">
        <button type="button" title="Zoom In" aria-label="Zoom in" disabled={props.disabled} className={mapControlStyles.zoomButton} onClick={() => map.current?.zoomIn()}><Plus className="size-3.5 lg:size-4" /></button>
        <div className="mx-1 h-px bg-border/60" />
        <button type="button" title="Zoom Out" aria-label="Zoom out" disabled={props.disabled} className={mapControlStyles.zoomButton} onClick={() => map.current?.zoomOut()}><Minus className="size-3.5 lg:size-4" /></button>
      </div>
    </div>
    {state === "loading" && <p role="status" className="text-xs text-muted-foreground">Loading map…</p>}
    {state === "failed" && <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>The map couldn't load. Retry to choose or update your location.</span><Button type="button" variant="outline" size="sm" disabled={props.disabled} onClick={() => setAttempt(value => value + 1)}>Retry Map</Button></div>}
    {props.method === "MANUAL_PIN" && <Button type="button" variant="outline" size="sm" disabled={props.disabled || state !== "ready"} onClick={() => {
      const point = map.current?.getCenter();
      if (point) props.onPin([point.lat, point.lng]);
    }}>Place Pin at Map Center</Button>}
  </div>;
}
