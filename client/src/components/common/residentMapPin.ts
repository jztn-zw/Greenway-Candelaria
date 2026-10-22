import L from "leaflet";

export const createResidentPinIcon = (isCompleted = false, isMissed = false) => {
  const width = 36;
  const height = 48;
  const color = isMissed ? "hsl(var(--destructive))" : "hsl(var(--primary))";

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${width}px;height:${height}px;transform:scale(var(--map-pin-scale,1));transform-origin:50% 100%;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.32));cursor:pointer;">
        <svg width="${width}" height="${height}" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:100%;">
          <path d="M 18 1.5 C 8.8 1.5 1.5 8.8 1.5 18 C 1.5 29.5 18 46.5 18 46.5 C 18 46.5 34.5 29.5 34.5 18 C 34.5 8.8 27.2 1.5 18 1.5 Z" fill="${color}" stroke="hsl(var(--map-inset))" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="18" cy="18" r="11" fill="hsl(var(--map-inset))"/>
          <g transform="translate(10, 10) scale(0.667)">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
        </svg>
        ${
          isCompleted
            ? `<div style="position:absolute;top:-1px;right:-1px;width:15px;height:15px;border-radius:50%;background:hsl(var(--success-600));border:2px solid hsl(var(--map-inset));display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.35);pointer-events:none;">
                 <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--map-inset))" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                   <polyline points="20 6 9 17 4 12"></polyline>
                 </svg>
               </div>`
            : ""
        }
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [18, 48],
    popupAnchor: [0, -48],
  });
};

