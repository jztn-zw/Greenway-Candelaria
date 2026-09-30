import { formatReplayTime, getReplayDuration, getReplayTargetProgress, getReplayTargetState, sampleReplayTrip, type ReplayTrip } from "./replayTrip";
import { fitReplayVideoMap, loadReplayVideoMap } from "./replayVideoMap";
import { encodeReplayVideoFast } from "./replayVideoEncoder";

export const REPLAY_VIDEO_SPEEDS = [1, 2, 5, 10, 30, 60] as const;

export interface ExportVideoOptions {
  truckName: string;
  plateNumber: string;
  dateStr: string;
  trip: ReplayTrip;
  speed: number;
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  onStage?: (stage: "map" | "recording" | "encoding" | "finalizing") => void;
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

// Render the full recorded trip at the chosen speed over the tracking basemap.
export const exportReplayVideo = async ({ truckName, plateNumber, dateStr, trip, speed, signal, onProgress, onStage }: ExportVideoOptions): Promise<void> => {
  if (trip.path.length < 2) throw new Error("At least two GPS records are required.");
  if (!REPLAY_VIDEO_SPEEDS.some((value) => value === speed)) throw new Error("Choose a supported video speed.");
  const videoDuration = getReplayDuration(trip) / speed;
  if (!Number.isFinite(videoDuration) || videoDuration <= 0) throw new Error("No timed trip is available to export.");
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException("Video export cancelled.", "AbortError");
  };
  checkAbort();
  const width = 1280;
  const height = 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Video rendering is unavailable.");

  const styles = getComputedStyle(document.documentElement);
  const color = (token: string, fallback: string) => "hsl(" + (styles.getPropertyValue(token).trim() || fallback) + ")";
  const palette = {
    background: color("--background", "150 10% 8%"),
    card: color("--card", "150 10% 11%"),
    foreground: color("--foreground", "40 20% 93%"),
    muted: color("--muted-foreground", "160 5% 45%"),
    border: color("--border", "150 8% 18%"),
    primary: color("--primary", "145 55% 42%"),
  };

  const mapHeight = height - 152;
  const locations = (trip.stops ?? []).flatMap((stop) => stop.location ? [stop.location.coords] : []);
  const layout = fitReplayVideoMap([...trip.path, ...locations], width, mapHeight);
  onStage?.("map");
  const basemap = await loadReplayVideoMap(layout, width, mapHeight, signal);
  checkAbort();
  const plot = (point: [number, number]): [number, number] => {
    const [x, y] = layout.project(point);
    return [x, y + 76];
  };

  const projectedPath = trip.path.map(plot);
  const fullTrail = new Path2D();
  fullTrail.moveTo(...projectedPath[0]);
  for (const point of projectedPath.slice(1)) fullTrail.lineTo(...point);
  const travelledTrail = new Path2D();
  travelledTrail.moveTo(...projectedPath[0]);
  let travelledIndex = 0;
  const drawPath = (path: Path2D, stroke: string, lineWidth: number) => {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke(path);
  };
  const drawEndpoint = (point: [number, number], label: string) => {
    const [x, y] = plot(point);
    ctx.fillStyle = palette.card;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillRect(x - 24, y - 32, 48, 22);
    ctx.fillStyle = palette.foreground;
    ctx.font = "600 12px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText(label, x, y - 12);
  };
  const pinShape = new Path2D("M18 1C8.6 1 1 8.6 1 18C1 29.5 18 47 18 47C18 47 35 29.5 35 18C35 8.6 27.4 1 18 1Z");
  const glyphs = {
    truck: new Path2D("M9 22V11h11v11M20 14h5l3 4v4h-3M14 22h7M10 22h1"),
    current: new Path2D("M12 18a6 6 0 1 0 12 0a6 6 0 1 0-12 0M16 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0"),
    completed: new Path2D("M12 18l4 4 8-9"),
    skipped: new Path2D("M18 12v8M18 23v1"),
  };
  const drawPin = (point: [number, number], kind: keyof typeof glyphs | "upcoming", order?: number) => {
    const [x, y] = plot(point);
    const pinColor = kind === "skipped" ? "#f59e0b" : kind === "upcoming" ? "#94a3b8" : kind === "truck" ? "hsl(145, 63%, 32%)" : palette.primary;
    ctx.save();
    ctx.translate(x, y);
    const scale = kind === "truck" ? 1.2 : 1;
    ctx.scale(scale, scale);
    ctx.translate(-18, -48);
    ctx.fillStyle = pinColor; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.fill(pinShape); ctx.stroke(pinShape);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(18, 18, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = pinColor; ctx.fillStyle = pinColor; ctx.lineWidth = 2.5;
    if (kind === "upcoming") {
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 12px Inter, sans-serif";
      ctx.fillText(String(order ?? ""), 18, 18);
    } else {
      ctx.stroke(glyphs[kind]);
      if (kind === "truck") {
        for (const wheelX of [13, 24]) { ctx.beginPath(); ctx.arc(wheelX, 23, 2, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    ctx.restore();
  };
  const drawFrame = (progress: number) => {
    const sample = sampleReplayTrip(trip, progress);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(basemap, 0, 76);
    // Reuse projected paths; extend only the newly travelled part each frame.
    drawPath(fullTrail, palette.muted, 3);
    while (travelledIndex < sample.index) travelledTrail.lineTo(...projectedPath[++travelledIndex]);
    drawPath(travelledTrail, palette.primary, 5);
    ctx.beginPath(); ctx.moveTo(...projectedPath[sample.index]); ctx.lineTo(...plot(sample.coords)); ctx.stroke();
    drawEndpoint(trip.path[0], "Start");
    drawEndpoint(trip.path[trip.path.length - 1], "End");

    const replayTime = Date.parse(sample.timestamp);
    const pinPriority = { unknown: 0, upcoming: 0, skipped: 1, completed: 2, current: 3 };
    const stops = [...(trip.stops ?? [])].sort((a, b) => pinPriority[getReplayTargetState(a, replayTime)] - pinPriority[getReplayTargetState(b, replayTime)]);
    for (const stop of stops) {
      if (!stop.location) continue;
      const state = getReplayTargetState(stop, replayTime);
      drawPin(stop.location.coords, state === "unknown" ? "upcoming" : state, stop.order);
    }
    drawPin(sample.coords, "truck");

    ctx.fillStyle = palette.card;
    ctx.fillRect(0, 0, width, 76);
    ctx.fillRect(0, height - 76, width, 76);
    ctx.fillStyle = palette.foreground;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = "600 20px Poppins, sans-serif";
    ctx.fillText("Collection replay · Candelaria", 32, 27);
    ctx.fillStyle = palette.muted;
    ctx.font = "13px Inter, sans-serif";
    ctx.fillText(truckName + (plateNumber ? " · " + plateNumber : ""), 32, 53, width - 260);
    ctx.textAlign = "right";
    ctx.fillText(dateStr + " · " + speed + "× speed", width - 32, 38);

    ctx.textAlign = "left";
    ctx.fillText("Replay time", 32, height - 53);
    ctx.fillStyle = palette.foreground;
    ctx.font = "600 15px Inter, sans-serif";
    ctx.fillText(formatReplayTime(sample.timestamp), 32, height - 29);
    ctx.fillStyle = palette.muted;
    ctx.font = "13px Inter, sans-serif";
    ctx.fillText("Current target street", 245, height - 53);
    ctx.fillStyle = palette.foreground;
    ctx.font = "600 15px Inter, sans-serif";
    const target = getReplayTargetProgress(trip, sample.index, replayTime);
    ctx.fillText(target.currentTarget ?? (target.targetUnknown ? "Not recorded" : "No active target"), 245, height - 29, 640);
    ctx.textAlign = "right";
    ctx.fillText(progress === 1 ? "Replay complete" : "Replay progress: " + Math.round(progress * 100) + "%", width - 32, height - 47);
    ctx.fillStyle = palette.border;
    ctx.fillRect(width - 312, height - 27, 280, 5);
    ctx.fillStyle = palette.primary;
    ctx.fillRect(width - 312, height - 27, 280 * progress, 5);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(width - 205, height - 95, 205, 19);
    ctx.fillStyle = "#1f2937";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("© OpenStreetMap contributors", width - 8, height - 85);
  };

  const download = (video: Blob, extension: string) => {
    checkAbort();
    const url = URL.createObjectURL(video);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = truckName.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" + dateStr + "_Route_Replay_" + speed + "x." + extension;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 15000);
    onProgress?.(100);
  };
  const encoded = await encodeReplayVideoFast(canvas, videoDuration, drawFrame, { signal, onProgress, onStage });
  checkAbort();
  if (encoded) { download(encoded.video, encoded.extension); return; }

  // Keep a compatible recording path for browsers without a supported encoder.
  const { mimeType, extension } = getSupportedVideoMimeType();
  if (typeof canvas.captureStream !== "function") throw new Error("Video capture is unavailable.");
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
    onStage?.("recording");
    recorder.start();
    const startedAt = performance.now();
    while (true) {
      checkAbort();
      if (recordingError) throw recordingError;
      const progress = Math.min(1, (performance.now() - startedAt) / videoDuration);
      drawFrame(progress);
      onProgress?.(Math.min(99, Math.round(progress * 100)));
      await new Promise((resolve) => window.setTimeout(resolve, 1000 / 30));
      if (progress === 1) break;
    }
    recorder.stop();
    await finished;
    checkAbort();
    if (recordingError) throw recordingError;
    const video = new Blob(chunks, { type: mimeType });
    if (!video.size) throw new Error("No video frames were recorded.");
    download(video, extension);
  } finally {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
  }
};
