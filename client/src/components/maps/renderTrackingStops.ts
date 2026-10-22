import L from 'leaflet';
import type { RouteStop } from '@/features/collector/route-map/types';
import { createTrackingLocationPin } from './trackingLocationPin';
import { groupTrackingStops, trackingStopPoint } from './trackingStopGroups';
import { trackingStopPresentation } from './trackingStopPresentation';
import { formatManilaDateTime } from '@/utils/date';

const presentation = (stop: RouteStop) => trackingStopPresentation[stop.status === 'not-yet' ? 'not-started' : stop.status];
const lastSelection = new WeakMap<L.LayerGroup, string | null>();
const completedBadge = '<span aria-hidden="true" style="position:absolute;top:-3px;right:-3px;display:flex;width:13px;height:13px;align-items:center;justify-content:center;border:1.5px solid hsl(var(--map-inset));border-radius:50%;background:hsl(var(--success-700));pointer-events:none;"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--map-inset))" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 5L20 6"/></svg></span>';
const formatCompletionTime = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(value)) return value;
  return formatManilaDateTime(value, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) || value;
};
export const focusTrackingStop = (map: L.Map, stop: RouteStop) => {
  const point = trackingStopPoint(stop);
  if (stop.hasCoordinates === false || !point?.every(Number.isFinite)) return;
  if ((stop.coveragePath?.length ?? 0) > 1) map.fitBounds(L.latLngBounds(stop.coveragePath!), { padding: [44, 44], maxZoom: 17 });
  else map.setView(point, Math.max(map.getZoom(), 16));
};

interface Options {
  map: L.Map;
  layer: L.LayerGroup;
  stops: RouteStop[];
  selectedId: string | null;
  showFullRoute: boolean;
  liveCoverage: boolean;
  onSelect: (id: string) => void;
}

export const renderTrackingStops = ({ map, layer, stops, selectedId, showFullRoute, liveCoverage, onSelect }: Options) => {
  // Preserve an open selected popup across GPS/zoom redraws, without reopening
  // one the user closed. Weak keys follow the map layer's lifetime.
  const popupWasOpen = layer.getLayers().some(item => 'isPopupOpen' in item && typeof item.isPopupOpen === 'function' && item.isPopupOpen());
  const openSelected = selectedId !== lastSelection.get(layer) || popupWasOpen;
  lastSelection.set(layer, selectedId);
  layer.clearLayers();
  const zoom = map.getZoom();
  for (const stop of stops) {
    const selected = stop.id === selectedId;
    if (stop.hasCoordinates === false || !stop.coveragePath || stop.coveragePath.length < 2 ||
      !(showFullRoute || selected || (liveCoverage && stop.status === 'in-progress'))) continue;
    const active = selected || stop.status === 'in-progress';
    L.polyline(stop.coveragePath, { color: 'hsl(var(--map-inset))', weight: active ? 7 : 4, opacity: 0.8, interactive: false }).addTo(layer);
    L.polyline(stop.coveragePath, { color: presentation(stop).color, weight: active ? 4 : 2,
      opacity: active ? 0.95 : 0.35, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(layer);
  }

  const groups = groupTrackingStops(stops, point => map.project(point, zoom), zoom, selectedId);
  for (const group of groups) {
    if (group.stops.length > 1) {
      const allCompleted = group.stops.every(stop => stop.status === 'done');
      const marker = L.marker(group.point, {
        title: `${group.stops.length} nearby stops. Zoom in or choose a street.`, opacity: 1,
        icon: L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 18],
          html: `<span style="position:relative;display:flex;width:36px;height:36px;align-items:center;justify-content:center;transform:scale(var(--map-pin-scale,1));transform-origin:center;border:2px solid hsl(var(--map-inset));border-radius:50%;background:${allCompleted ? presentation(group.stops[0]).color : 'hsl(var(--primary))'};color:hsl(var(--map-inset));box-shadow:0 2px 6px #0004;font:600 13px var(--font-ui)">${group.stops.length}${allCompleted ? completedBadge : ''}</span>` }),
      }).addTo(layer);
      const list = document.createElement('div');
      list.className = 'max-h-52 space-y-1 overflow-y-auto';
      for (const stop of group.stops) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'gw-action-ghost block w-full rounded-md px-2 py-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
        button.textContent = `${stop.stopNumber}. ${stop.barangay}`;
        button.addEventListener('click', () => onSelect(stop.id));
        list.append(button);
      }
      marker.bindPopup(list, { maxWidth: 260, className: 'tracking-popup' });
      marker.on('click', () => {
        map.fitBounds(L.latLngBounds(group.stops.map(trackingStopPoint)), {
          padding: [36, 36], maxZoom: zoom < 16 ? 16 : Math.min(zoom + 2, map.getMaxZoom()),
        });
      });
      continue;
    }

    const stop = group.stops[0], selected = stop.id === selectedId;
    const current = stop.status === 'in-progress';
    const important = selected || current;
    const number = Number.isInteger(stop.stopNumber) && stop.stopNumber > 0 ? String(stop.stopNumber) : '–';
    const color = presentation(stop).color;
    const marker = L.marker(group.point, {
      title: `${stop.stopNumber}. ${stop.barangay} — ${presentation(stop).label}`,
      zIndexOffset: important ? 600 : 100, opacity: 1,
      icon: current ? createTrackingLocationPin(color, stop.status, stop.stopNumber) : L.divIcon({
        className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16],
        html: `<span style="position:relative;display:flex;width:28px;height:28px;align-items:center;justify-content:center;transform:scale(var(--map-pin-scale,1));transform-origin:center;border:2px solid hsl(var(--map-inset));border-radius:50%;background:${color};color:hsl(var(--map-inset));box-shadow:${selected ? '0 0 0 3px hsl(var(--primary)), ' : ''}0 2px 5px #0003;font:600 11px var(--font-ui)">${zoom >= 14 || selected ? number : ''}${stop.status === 'done' ? completedBadge : ''}</span>`,
      }),
    }).addTo(layer);
    const popup = document.createElement('div');
    popup.className = 'space-y-1 text-xs';
    const heading = document.createElement('strong');
    heading.textContent = `${stop.stopNumber}. ${stop.barangay}`;
    const status = document.createElement('p');
    status.textContent = presentation(stop).label;
    const hasCompletionTime = stop.status === 'done' && Boolean(stop.completedAt);
    popup.append(heading);
    if (!hasCompletionTime) popup.append(status);
    if (stop.completedAt || stop.skippedReason) {
      const detail = document.createElement('p');
      detail.textContent = stop.skippedReason ?? `${hasCompletionTime ? 'Completed at ' : ''}${formatCompletionTime(stop.completedAt!)}`;
      popup.append(detail);
    } else if (stop.distanceKm > 0) {
      const distance = document.createElement('p');
      distance.textContent = `${stop.distanceKm.toFixed(1)} km away`;
      popup.append(distance);
    }
    marker.bindPopup(popup, { className: 'tracking-popup', maxWidth: 260 });
    marker.on('click', () => { if (!selected) onSelect(stop.id); });
    if (selected && openSelected) marker.openPopup();
  }
};
