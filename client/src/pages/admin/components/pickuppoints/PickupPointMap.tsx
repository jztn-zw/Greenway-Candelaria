import { useEffect, useRef } from "react";
// @ts-ignore
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PickupPoint } from "./types";

interface PickupPointMapProps {
  points: PickupPoint[];
  selectedId: string | null;
  onPinClick: (id: string) => void;
}

const PIN_COLORS: Record<string, string> = {
  verified: "hsl(145, 63%, 32%)",
  pending: "hsl(38, 92%, 50%)",
  rejected: "hsl(0, 72%, 51%)",
  deactivated: "hsl(0, 0%, 60%)",
};

const PIN_LABELS: Record<string, string> = {
  verified: "Verified",
  pending: "Pending",
  rejected: "Rejected",
  deactivated: "Inactive",
};

const MAP_CENTER: [number, number] = [14.0440, 121.4210];

const PickupPointMap = ({ points, selectedId, onPinClick }: PickupPointMapProps) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Init map
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(MAP_CENTER, 14);

    L.control.zoom({ position: "topright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      layerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    points.forEach((point) => {
      const color = point.flagged ? "hsl(0, 72%, 51%)" : PIN_COLORS[point.status] || PIN_COLORS.pending;
      const isSelected = selectedId === point.id;
      const sourceEmoji = point.source === "driver" ? "🚛" : point.source === "resident" ? "👤" : "📌";

      const marker = L.circleMarker(point.coords, {
        radius: isSelected ? 12 : 9,
        color: color,
        weight: isSelected ? 4 : 2.5,
        fillColor: isSelected ? color : "hsl(40, 20%, 97%)",
        fillOpacity: 1,
      });

      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:13px;min-width:160px">
          <strong>${point.label || "Unlabeled Point"}</strong><br/>
          <span style="color:#666">📍 ${point.barangay}</span><br/>
          <span style="color:#888;font-size:11px">${sourceEmoji} ${point.source === "driver" ? "Driver" : point.source === "resident" ? "Resident" : "Manual"}: ${point.submittedBy}</span><br/>
          <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;background:${color}20;color:${color}">${point.flagged ? "⚠ Flagged" : PIN_LABELS[point.status]}</span>
        </div>`
      );

      marker.on("click", () => onPinClick(point.id));
      marker.addTo(layer);

      // Coverage radius for verified points
      if (point.status === "verified" && isSelected) {
        L.circle(point.coords, {
          radius: point.coverageRadius,
          color: color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.08,
          dashArray: "4 4",
        }).addTo(layer);
      }
    });
  }, [points, selectedId, onPinClick]);

  // Fly to selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const point = points.find((p) => p.id === selectedId);
    if (point) {
      map.flyTo(point.coords, 16, { duration: 0.6 });
    }
  }, [selectedId, points]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border bg-card">
      <div ref={mapElRef} className="h-full w-full z-0" />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-card/95 backdrop-blur-sm px-3 py-2.5 rounded-lg border border-border shadow-sm">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Legend</p>
        <div className="flex flex-col gap-1">
          {[
            { color: PIN_COLORS.verified, label: "Verified" },
            { color: PIN_COLORS.pending, label: "Pending" },
            { color: "hsl(0, 72%, 51%)", label: "Flagged" },
            { color: PIN_COLORS.deactivated, label: "Inactive" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location label */}
      <div className="absolute bottom-3 right-3 z-[400] bg-card/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border shadow-sm">
        <span className="text-[11px] font-display font-semibold text-primary">
          Candelaria, Quezon
        </span>
      </div>
    </div>
  );
};

export default PickupPointMap;
