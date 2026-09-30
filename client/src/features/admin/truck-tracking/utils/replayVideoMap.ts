type Point = [number, number];
const TILE_SIZE = 256;

// Use the same Web Mercator projection and OpenStreetMap tiles as tracking.
const worldPoint = ([lat, lng]: Point, zoom: number): Point => {
  const size = TILE_SIZE * 2 ** zoom;
  const latitude = Math.max(-85.05112878, Math.min(85.05112878, lat));
  return [(lng + 180) / 360 * size, (1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * size];
};

export const fitReplayVideoMap = (points: Point[], width: number, height: number) => {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const point of points) {
    const [x, y] = worldPoint(point, 0);
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  const zoom = Math.max(0, Math.min(17, Math.floor(Math.log2(Math.min(
    (width - 140) / Math.max(right - left, 0.00001),
    (height - 160) / Math.max(bottom - top, 0.00001),
  )))));
  const origin: Point = [(left + right) / 2 * 2 ** zoom - width / 2, (top + bottom) / 2 * 2 ** zoom - height / 2];
  const project = (point: Point): Point => {
    const [x, y] = worldPoint(point, zoom);
    return [x - origin[0], y - origin[1]];
  };
  const tiles = [];
  const size = 2 ** zoom;
  for (let y = Math.floor(origin[1] / TILE_SIZE); y <= Math.floor((origin[1] + height - 1) / TILE_SIZE); y++) {
    for (let x = Math.floor(origin[0] / TILE_SIZE); x <= Math.floor((origin[0] + width - 1) / TILE_SIZE); x++) {
      if (y < 0 || y >= size) continue;
      tiles.push({ url: `https://tile.openstreetmap.org/${zoom}/${((x % size) + size) % size}/${y}.png`, x: x * TILE_SIZE - origin[0], y: y * TILE_SIZE - origin[1] });
    }
  }
  return { zoom, project, tiles };
};

const loadTile = (url: string, signal?: AbortSignal): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  let settled = false;
  const cleanup = () => {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
    image.onload = image.onerror = null;
  };
  const fail = (error: Error) => {
    if (settled) return;
    settled = true;
    cleanup();
    image.src = "";
    reject(error);
  };
  const abort = () => fail(new DOMException("Video export cancelled.", "AbortError"));
  const timeout = window.setTimeout(() => fail(new Error("Map loading timed out. Please check your connection and try again.")), 12000);
  signal?.addEventListener("abort", abort, { once: true });
  image.crossOrigin = "anonymous";
  image.onload = () => { if (!settled) { settled = true; cleanup(); resolve(image); } };
  image.onerror = () => fail(new Error("Could not load the map. Please check your connection and try again."));
  if (signal?.aborted) abort();
  else image.src = url;
});

export const loadReplayVideoMap = async (layout: ReturnType<typeof fitReplayVideoMap>, width: number, height: number, signal?: AbortSignal) => {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Map rendering is unavailable.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  let cursor = 0;
  try {
    // Load only the visible viewport, with bounded concurrency and one retry.
    await Promise.all(Array.from({ length: Math.min(6, layout.tiles.length) }, async () => {
      while (cursor < layout.tiles.length) {
        const tile = layout.tiles[cursor++];
        let image: HTMLImageElement;
        try { image = await loadTile(tile.url, controller.signal); }
        catch (error) {
          if (controller.signal.aborted) throw error;
          image = await loadTile(tile.url, controller.signal);
        }
        ctx.drawImage(image, tile.x, tile.y, TILE_SIZE, TILE_SIZE);
      }
    }));
    if (controller.signal.aborted) throw new DOMException("Video export cancelled.", "AbortError");
    return canvas;
  } finally {
    controller.abort();
    signal?.removeEventListener("abort", abort);
  }
};
