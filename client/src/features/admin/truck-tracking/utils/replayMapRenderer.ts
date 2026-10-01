import L from "leaflet";
import { readThemeColor } from "@/lib/themeColors";
import type { ReplayTargetLocation } from "./replayTrip";

type TargetState = "current" | "done" | "skipped";
type Point = [number, number];
const targetKey = (target: ReplayTargetLocation) => JSON.stringify([target.name, ...target.coords]);
const targetLabel = (target: ReplayTargetLocation, state: TargetState) =>
  (state === "done" ? "Completed: " : state === "skipped" ? "Skipped: " : "Current target: ") + target.name;

export const createReplayTargetIcon = (state: TargetState) => {
  const active = state === "current";
  const width = active ? 38 : 34;
  const height = active ? 50 : 46;
  const color = state === "skipped" ? "hsl(var(--warning))" : "hsl(var(--primary))";
  const glyph = state === "done"
    ? '<path d="m12 18 4 4 8-9"/>'
    : state === "skipped"
      ? '<path d="M18 12v8"/><circle cx="18" cy="24" r="1.4" fill="currentColor" stroke="none"/>'
      : '<circle cx="18" cy="18" r="6"/><circle cx="18" cy="18" r="2.5" fill="currentColor" stroke="none"/>';
  const root = document.createElement("div");
  root.className = "relative drop-shadow-[0_3px_6px_rgba(0,0,0,0.32)]";
  root.style.width = width + "px";
  root.style.height = height + "px";
  // Match the live tracking teardrop silhouette. Markup contains only static
  // glyphs; street names and reasons are inserted as text nodes in popups.
  root.innerHTML = `<svg aria-hidden="true" width="${width}" height="${height}" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;color:${color}">
    <path d="M 18 1 C 8.6 1 1 8.6 1 18 C 1 29.5 18 47 18 47 C 18 47 35 29.5 35 18 C 35 8.6 27.4 1 18 1 Z" fill="${color}" stroke="hsl(var(--map-inset))" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="18" cy="18" r="11" fill="hsl(var(--map-inset))"/>
    <g fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
  </svg>`;
  if (active) {
    const halo = document.createElement("span");
    halo.className = "pointer-events-none absolute left-1/2 top-[18px] -z-10 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 ring-2 ring-primary/30";
    root.prepend(halo);
  }
  return L.divIcon({ html: root, className: "", iconSize: [width, height], iconAnchor: [width / 2, height], popupAnchor: [0, -height + 8] });
};

export const createReplayTargetPopupContent = (target: ReplayTargetLocation, state: TargetState) => {
  const content = document.createElement("div");
  content.className = "font-sans";
  content.style.width = "216px";
  content.style.maxWidth = "calc(100vw - 96px)";
  content.style.boxSizing = "border-box";
  content.style.paddingRight = "18px";

  const header = document.createElement("div");
  header.className = "flex items-start gap-2.5";
  const badge = document.createElement("div");
  badge.className = "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg " +
    (state === "skipped" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary");
  badge.innerHTML = state === "done"
    ? '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>'
    : state === "skipped"
      ? '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></svg>'
      : '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>';
  const details = document.createElement("div");
  details.className = "min-w-0 flex-1";
  const status = document.createElement("div");
  status.className = "text-[10px] font-bold uppercase tracking-wide " + (state === "skipped" ? "text-amber-600 dark:text-amber-400" : "text-primary");
  status.textContent = state === "done" ? "Completed street" : state === "skipped" ? "Skipped street" : "Current target";
  const title = document.createElement("strong");
  title.className = "mt-0.5 block text-sm font-semibold leading-snug text-foreground";
  title.style.overflowWrap = "anywhere";
  const match = target.name.match(/^(.*) \(([^()]*)\)$/);
  title.textContent = match ? match[1] : target.name;
  details.append(status, title);
  if (match) {
    const barangay = document.createElement("div");
    barangay.className = "mt-0.5 text-xs text-muted-foreground";
    barangay.textContent = match[2];
    details.append(barangay);
  }
  header.append(badge, details);
  content.append(header);
  if (state === "skipped" && target.skippedReason) {
    const reason = document.createElement("div");
    reason.className = "mt-2 border-t border-border/70 pt-2 text-xs leading-relaxed text-muted-foreground";
    reason.style.overflowWrap = "anywhere";
    reason.textContent = target.skippedReason;
    content.append(reason);
  }
  return content;
};

const bindTargetPopup = (marker: L.Marker, target: ReplayTargetLocation, state: TargetState) => {
  marker.unbindPopup().bindPopup(createReplayTargetPopupContent(target, state), {
    className: "tracking-popup replay-target-popup",
    minWidth: 216, maxWidth: 260, closeButton: true,
    autoPan: true, autoPanPadding: [24, 24],
  });
  marker.setZIndexOffset(state === "current" ? 1400 : state === "skipped" ? 1100 : 1000);
  const label = targetLabel(target, state);
  marker.options.title = label;
  marker.getElement()?.setAttribute("title", label);
};

// Replay owns these layers only. Static geometry and target pins survive ticks;
// just the truck and the short interpolated head of the trail move each frame.
export const createReplayMapRenderer = (map: L.Map, layer: L.LayerGroup, truckIcon: L.DivIcon) => {
  const canvas = L.canvas({ padding: 0.5 });
  let path: Point[] | null = null;
  let pathBounds: L.LatLngBounds | null = null;
  let fullTrail: L.Polyline | null = null;
  let traversedTrail: L.Polyline | null = null;
  let trailHead: L.Polyline | null = null;
  let truck: L.Marker | null = null;
  let anchors: L.CircleMarker[] = [];
  let trailIndex = 0;
  let lastPosition = -1;
  let currentTargetKey: string | null = null;
  const targets = new Map<string, { marker: L.Marker; state: TargetState }>();
  const readColors = () => {
    const styles = getComputedStyle(document.documentElement);
    return { primary: readThemeColor("primary", styles), muted: readThemeColor("muted-foreground", styles), card: readThemeColor("card", styles) };
  };
  let colors = readColors();

  const clear = () => {
    layer.clearLayers();
    path = null;
    pathBounds = null;
    fullTrail = traversedTrail = trailHead = null;
    truck = null;
    anchors = [];
    targets.clear();
    currentTargetKey = null;
    trailIndex = 0;
    lastPosition = -1;
  };

  const setTrip = (nextPath: Point[] | undefined, current: ReplayTargetLocation | null, completed: ReplayTargetLocation[], skipped: ReplayTargetLocation[] = []) => {
    if (!nextPath?.length) {
      if (path) clear();
      return;
    }
    const changedTrip = path !== nextPath;
    if (changedTrip) {
      clear();
      path = nextPath;
      pathBounds = L.latLngBounds(nextPath);
      if (path.length > 1) {
        const style: L.PolylineOptions = { renderer: canvas, interactive: false, lineCap: "round", lineJoin: "round" };
        fullTrail = L.polyline(path, { ...style, color: colors.muted, weight: 4, opacity: 0.6 }).addTo(layer);
        traversedTrail = L.polyline([path[0]], { ...style, color: colors.primary, weight: 5, opacity: 1 }).addTo(layer);
        trailHead = L.polyline([path[0], path[0]], { ...style, color: colors.primary, weight: 5, opacity: 1 }).addTo(layer);
        anchors = [path[0], path[path.length - 1]].map((point, index) =>
          L.circleMarker(point, { renderer: canvas, radius: 5, color: colors.primary, weight: 2, fillColor: colors.card, fillOpacity: 1 })
            .bindTooltip(index === 0 ? "Trip start" : "Trip end").addTo(layer));
      }
      truck = L.marker(path[0], { icon: truckIcon, zIndexOffset: 2000, title: "Recorded truck position" })
        .bindTooltip("Recorded truck position").addTo(layer);
    }

    const desired = new Map<string, { target: ReplayTargetLocation; state: TargetState }>();
    for (const target of skipped) desired.set(targetKey(target), { target, state: "skipped" });
    for (const target of completed) desired.set(targetKey(target), { target, state: "done" });
    // A street can be targeted again on a later run; its current state wins.
    if (current) desired.set(targetKey(current), { target: current, state: "current" });
    for (const [key, { marker }] of targets) {
      if (!desired.has(key)) { layer.removeLayer(marker); targets.delete(key); }
    }
    for (const [key, { target, state }] of desired) {
      const existing = targets.get(key);
      if (!existing) {
        const marker = L.marker(target.coords, { icon: createReplayTargetIcon(state), title: targetLabel(target, state) }).addTo(layer);
        bindTargetPopup(marker, target, state);
        targets.set(key, { marker, state });
      } else if (existing.state !== state) {
        existing.marker.setIcon(createReplayTargetIcon(state));
        bindTargetPopup(existing.marker, target, state);
        existing.state = state;
      }
    }

    const nextTargetKey = current ? targetKey(current) : null;
    const newTargetOutsideView = current && nextTargetKey !== currentTargetKey && !map.getBounds().contains(current.coords);
    currentTargetKey = nextTargetKey;
    if ((changedTrip || newTargetOutsideView) && pathBounds) {
      const bounds = L.latLngBounds(pathBounds.getSouthWest(), pathBounds.getNorthEast());
      for (const { target } of desired.values()) bounds.extend(target.coords);
      if (bounds.isValid()) map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 16, duration: 0.8 });
    }
  };

  const setPosition = (value = 0) => {
    if (!path || !truck) return;
    const position = Math.max(0, Math.min(Number.isFinite(value) ? value : 0, path.length - 1));
    if (position === lastPosition) return;
    const index = Math.floor(position);
    const next = Math.min(index + 1, path.length - 1);
    const fraction = position - index;
    const point: Point = [path[index][0] + (path[next][0] - path[index][0]) * fraction, path[index][1] + (path[next][1] - path[index][1]) * fraction];
    truck.setLatLng(point);
    if (traversedTrail && trailHead) {
      if (index < trailIndex || index - trailIndex > 32) {
        // A seek replaces the prefix once; normal playback only appends new GPS points.
        traversedTrail.setLatLngs(path.slice(0, index + 1));
      } else {
        for (let step = trailIndex + 1; step <= index; step++) traversedTrail.addLatLng(path[step]);
      }
      trailHead.setLatLngs([path[index], point]);
    }
    trailIndex = index;
    lastPosition = position;
  };

  const refreshColors = () => {
    colors = readColors();
    fullTrail?.setStyle({ color: colors.muted });
    traversedTrail?.setStyle({ color: colors.primary });
    trailHead?.setStyle({ color: colors.primary });
    for (const anchor of anchors) anchor.setStyle({ color: colors.primary, fillColor: colors.card });
  };

  return { setTrip, setPosition, refreshColors, clear };
};
