import type { Map } from "leaflet";

export const updateMapPinScale = (container: HTMLElement, zoom: number) => {
  const scale = Math.max(0.55, Math.min(1.15, 1 + (zoom - 17) * 0.1));
  container.style.setProperty("--map-pin-scale", String(scale));
};

export const bindMapPinScale = (map: Map, container: HTMLElement) => {
  const update = () => updateMapPinScale(container, map.getZoom());
  map.on("zoomend", update);
  update();
  return () => { map.off("zoomend", update); };
};
