import L from "leaflet";

type StopPinState = "done" | "in-progress" | "skipped" | "not-started" | "not-yet";

// Use the same silhouette, white inset and anchor as the truck pins. The
// route number identifies the street's position in the scheduled stop order.
export const createTrackingLocationPin = (color: string, state: StopPinState, stopNumber: number) => {
  const active = state === "in-progress";
  const width = active ? 42 : 36;
  const height = active ? 54 : 48;
  const cx = width / 2;
  const cy = active ? 21 : 18;
  const radius = active ? 12 : 11;
  const label = Number.isInteger(stopNumber) && stopNumber > 0 ? String(stopNumber) : "–";
  const fontSize = label.length === 1 ? (active ? 14 : 13) : label.length === 2 ? 11 : 9;
  const badge = active
    ? `<div style="position:absolute;top:-1px;right:-1px;width:12px;height:12px;pointer-events:none;">
         <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:${color};opacity:0.5;animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></span>
         <span style="position:relative;display:block;width:100%;height:100%;border-radius:50%;background:${color};border:2px solid hsl(var(--map-inset));box-sizing:border-box;"></span>
       </div>`
    : state === "done"
      ? '<div style="position:absolute;top:-2px;right:-2px;width:15px;height:15px;border-radius:50%;background:hsl(var(--success-600));border:2px solid hsl(var(--map-inset));display:flex;align-items:center;justify-content:center;box-sizing:border-box;"><svg aria-hidden="true" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--map-inset))" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5 5L20 6"/></svg></div>'
      : state === "skipped"
        ? '<div style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:hsl(var(--warning-foreground));border:2px solid hsl(var(--map-inset));display:flex;align-items:center;justify-content:center;box-sizing:border-box;color:hsl(var(--map-inset));font:700 9px var(--font-ui);">!</div>'
        : "";

  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${width}px;height:${height}px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35));">
      <svg aria-hidden="true" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
        <path d="M ${cx} 1.5 C ${cx * 0.48} 1.5 1.5 ${cy * 0.48} 1.5 ${cy} C 1.5 ${cy * 1.6} ${cx} ${height - 1.5} ${cx} ${height - 1.5} C ${cx} ${height - 1.5} ${width - 1.5} ${cy * 1.6} ${width - 1.5} ${cy} C ${width - 1.5} ${cy * 0.48} ${cx * 1.52} 1.5 ${cx} 1.5 Z" fill="${color}" stroke="hsl(var(--map-inset))" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="hsl(var(--map-inset))"/>
        <text x="${cx}" y="${cy + 0.5}" fill="${color}" style="font-family:var(--font-ui);font-variant-numeric:tabular-nums" font-size="${fontSize}" font-weight="600" text-anchor="middle" dominant-baseline="central">${label}</text>
      </svg>
      ${badge}
    </div>`,
    iconSize: [width, height],
    iconAnchor: [cx, height],
    popupAnchor: [0, -height],
  });
};
