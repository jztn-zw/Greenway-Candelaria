import { formatReplayTime, sampleReplayTrip, type ReplayTrip } from "./replayTrip";

export interface ExportVideoOptions {
  truckName: string;
  plateNumber: string;
  dateStr: string;
  trip: ReplayTrip;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
}

export const getSupportedVideoMimeType = (): { mimeType: string; extension: string } => {
  if (typeof MediaRecorder === "undefined") throw new Error("Video recording is not supported by this browser.");
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  const supported = candidates.find(({ mimeType }) => MediaRecorder.isTypeSupported(mimeType));
  if (!supported) throw new Error("No supported video format is available.");
  return supported;
};

// Render one condensed full-trip animation, with no street transitions or
// inferred collection completion. The trail and timestamp come from GPS records.
export const exportReplayVideo = async ({ truckName, plateNumber, dateStr, trip, signal, onProgress }: ExportVideoOptions): Promise<void> => {
  if (trip.path.length < 2) throw new Error("At least two GPS records are required.");
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException("Video export cancelled.", "AbortError");
  };
  checkAbort();
  const { mimeType, extension } = getSupportedVideoMimeType();
  const width = 1280;
  const height = 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx || typeof canvas.captureStream !== "function") throw new Error("Video capture is unavailable.");

  const styles = getComputedStyle(document.documentElement);
  const color = (token: string, fallback: string) => "hsl(" + (styles.getPropertyValue(token).trim() || fallback) + ")";
  const palette = {
    background: color("--background", "150 10% 8%"),
    card: color("--card", "150 10% 11%"),
    foreground: color("--foreground", "40 20% 93%"),
    muted: color("--muted-foreground", "160 5% 45%"),
    border: color("--border", "150 8% 18%"),
    primary: color("--primary", "145 55% 42%"),
    primaryForeground: color("--primary-foreground", "0 0% 100%"),
  };

  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const [lat, lng] of trip.path) {
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
  }
  const latPadding = Math.max(0.002, maxLat - minLat) * 0.15;
  const lngPadding = Math.max(0.002, maxLng - minLng) * 0.15;
  minLat -= latPadding; maxLat += latPadding;
  minLng -= lngPadding; maxLng += lngPadding;
  const plot = ([lat, lng]: [number, number]): [number, number] => [
    ((lng - minLng) / (maxLng - minLng)) * (width - 160) + 80,
    height - 120 - ((lat - minLat) / (maxLat - minLat)) * (height - 240),
  ];

  const tiles: { image: HTMLImageElement; x: number; y: number; w: number; h: number }[] = [];
  // Retain the geographic background when tiles are available. Failed tiles
  // leave the recorded GPS trail visible on the themed canvas.
  const zoom = 14;
  const n = 2 ** zoom;
  const tileX = (lng: number) => Math.floor(((lng + 180) / 360) * n);
  const tileY = (lat: number) => Math.floor(((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2) * n);
  const minX = tileX(minLng), maxX = tileX(maxLng), minY = tileY(maxLat), maxY = tileY(minLat);
  if (maxX - minX <= 4 && maxY - minY <= 4) {
    const loads: Promise<void>[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        loads.push(new Promise<void>((resolve) => {
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => {
            const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
            const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
            const [x1, y1] = plot([lat1, x / n * 360 - 180]);
            const [x2, y2] = plot([lat2, (x + 1) / n * 360 - 180]);
            tiles.push({ image, x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
            resolve();
          };
          image.onerror = () => resolve();
          image.src = "https://tile.openstreetmap.org/" + zoom + "/" + x + "/" + y + ".png";
        }));
      }
    }
    await Promise.race([Promise.all(loads), new Promise((resolve) => window.setTimeout(resolve, 1500))]);
  }
  checkAbort();

  const drawPath = (points: [number, number][], stroke: string, lineWidth: number) => {
    if (points.length < 2) return;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    const [x, y] = plot(points[0]);
    ctx.moveTo(x, y);
    for (const point of points.slice(1)) {
      const [px, py] = plot(point);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  };
  const drawEndpoint = (point: [number, number], label: string) => {
    const [x, y] = plot(point);
    ctx.fillStyle = palette.card;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.foreground;
    ctx.font = "600 12px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(label, x, y - 12);
  };
  const drawFrame = (progress: number) => {
    const sample = sampleReplayTrip(trip, progress);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.globalAlpha = 0.55;
    for (const tile of tiles) ctx.drawImage(tile.image, tile.x, tile.y, tile.w, tile.h);
    ctx.restore();
    drawPath(trip.path, palette.muted, 3);
    drawPath([...trip.path.slice(0, sample.index + 1), sample.coords], palette.primary, 5);
    drawEndpoint(trip.path[0], "Start");
    drawEndpoint(trip.path[trip.path.length - 1], "End");

    const [x, y] = plot(sample.coords);
    ctx.fillStyle = palette.primary;
    ctx.strokeStyle = palette.primaryForeground;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = palette.card;
    ctx.fillRect(0, 0, width, 76);
    ctx.fillRect(0, height - 76, width, 76);
    ctx.fillStyle = palette.foreground;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = "600 20px Poppins, sans-serif";
    ctx.fillText("Route replay", 32, 27);
    ctx.fillStyle = palette.muted;
    ctx.font = "13px Inter, sans-serif";
    ctx.fillText(truckName + (plateNumber ? " · " + plateNumber : ""), 32, 53, width - 260);
    ctx.textAlign = "right";
    ctx.fillText(dateStr, width - 32, 38);

    ctx.textAlign = "left";
    ctx.fillText("Replay time", 32, height - 53);
    ctx.fillStyle = palette.foreground;
    ctx.font = "600 15px Inter, sans-serif";
    ctx.fillText(formatReplayTime(sample.timestamp), 32, height - 29);
    ctx.fillStyle = palette.muted;
    ctx.font = "13px Inter, sans-serif";
    ctx.fillText("Estimated trip distance", 245, height - 53);
    ctx.fillStyle = palette.foreground;
    ctx.font = "600 15px Inter, sans-serif";
    ctx.fillText(trip.distanceKm.toFixed(1) + " km", 245, height - 29);
    ctx.textAlign = "right";
    ctx.fillText(progress === 1 ? "Replay complete" : "Replay progress: " + Math.round(progress * 100) + "%", width - 32, height - 47);
    ctx.fillStyle = palette.border;
    ctx.fillRect(width - 312, height - 27, 280, 5);
    ctx.fillStyle = palette.primary;
    ctx.fillRect(width - 312, height - 27, 280 * progress, 5);
    if (tiles.length) {
      ctx.fillStyle = palette.foreground;
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText("© OpenStreetMap contributors", width - 12, height - 86);
    }
  };

  const stream = canvas.captureStream(30);
  let recorder: MediaRecorder | undefined;
  try {
    const chunks: Blob[] = [];
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3_500_000 });
    let recordingError: Error | null = null;
    const finished = new Promise<void>((resolve) => {
      recorder!.onstop = () => resolve();
      recorder!.onerror = () => { recordingError = new Error("Video recording failed."); resolve(); };
    });
    recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
    drawFrame(0);
    recorder.start();
    // A condensed 6–60 second overview, traversing the entire recorded trail.
    const frames = Math.max(180, Math.min(1800, trip.path.length));
    for (let frame = 0; frame < frames; frame++) {
      checkAbort();
      if (recordingError) throw recordingError;
      const progress = frame / (frames - 1);
      drawFrame(progress);
      onProgress?.(Math.min(99, Math.round(progress * 100)));
      await new Promise((resolve) => window.setTimeout(resolve, 1000 / 30));
    }
    recorder.stop();
    await finished;
    checkAbort();
    if (recordingError) throw recordingError;
    const video = new Blob(chunks, { type: mimeType });
    if (!video.size) throw new Error("No video frames were recorded.");
    const url = URL.createObjectURL(video);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = truckName.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + dateStr + "_Route_Replay." + extension;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 15000);
    onProgress?.(100);
  } finally {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
  }
};
