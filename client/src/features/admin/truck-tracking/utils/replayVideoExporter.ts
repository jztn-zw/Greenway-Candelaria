/**
 * replayVideoExporter.ts
 *
 * Client-side video file generator and exporter.
 * Renders leg-by-leg truck route replay frames to an HTML5 canvas and
 * records them into a downloadable video file (.mp4 or .webm) using the
 * browser MediaRecorder API.
 *
 * Map strictly ONLY renders:
 * 1. The moving truck
 * 2. The active target barangay
 * 3. The corresponding route path
 */

export interface ExportLeg {
  stopNumber: number;
  totalStops: number;
  targetName: string;
  fromCoords: [number, number];
  targetCoords: [number, number];
  path: [number, number][];
  timestamps?: string[];
  distanceKm: number;
}

export interface ExportVideoOptions {
  truckName: string;
  plateNumber: string;
  driverName?: string;
  dateStr: string;
  legs: ExportLeg[];
  onProgress?: (percent: number, statusText: string) => void;
}

export const getSupportedVideoMimeType = (): { mimeType: string; extension: string } => {
  if (typeof MediaRecorder === "undefined") {
    return { mimeType: "video/webm", extension: "webm" };
  }

  const candidates = [
    { mimeType: "video/mp4;codecs=avc1", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];

  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }

  return { mimeType: "video/webm", extension: "webm" };
};

// Calculate heading angle in radians between two coordinates
const getHeadingAngle = (from: [number, number], to: [number, number]): number => {
  const dLat = to[0] - from[0];
  const dLon = to[1] - from[1];
  return Math.atan2(dLon, dLat);
};

const formatTimestamp = (raw?: string): string => {
  if (!raw) return "--:--:--";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "--:--:--";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  } catch {
    return "--:--:--";
  }
};

/**
 * Exports a route replay to an actual video file (.mp4 or .webm)
 * strictly showing ONLY the truck, active target barangay, and active route path.
 */
export const exportReplayVideo = async (options: ExportVideoOptions): Promise<void> => {
  const { truckName, plateNumber, driverName = "Assigned Driver", dateStr, legs, onProgress } = options;

  if (legs.length === 0) {
    throw new Error("No route legs available to export.");
  }

  const { mimeType, extension } = getSupportedVideoMimeType();

  // Canvas setup: 1280x720 (720p 16:9 HD)
  const width = 1280;
  const height = 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize 2D canvas context.");

  // Compute global bounding box across all legs
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  legs.forEach((leg) => {
    leg.path.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });
    [leg.fromCoords, leg.targetCoords].forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });
  });

  // Add 12% padding to bounds
  const latSpan = Math.max(0.015, maxLat - minLat);
  const lngSpan = Math.max(0.02, maxLng - minLng);
  minLat -= latSpan * 0.12;
  maxLat += latSpan * 0.12;
  minLng -= lngSpan * 0.12;
  maxLng += lngSpan * 0.12;

  // Projection: [lat, lng] -> [canvasX, canvasY]
  const plot = ([lat, lng]: [number, number]): [number, number] => {
    const x = ((lng - minLng) / (maxLng - minLng)) * (width - 240) + 120;
    const y = height - 120 - ((lat - minLat) / (maxLat - minLat)) * (height - 240);
    return [x, y];
  };

  // Preload OpenStreetMap background tiles (CORS anonymous)
  const tiles: { img: HTMLImageElement; x: number; y: number; w: number; h: number }[] = [];
  try {
    const zoom = 14;
    const latToTileY = (lat: number, z: number) =>
      Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, z));
    const lonToTileX = (lon: number, z: number) =>
      Math.floor(((lon + 180) / 360) * Math.pow(2, z));

    const minTileX = lonToTileX(minLng, zoom);
    const maxTileX = lonToTileX(maxLng, zoom);
    const minTileY = latToTileY(maxLat, zoom);
    const maxTileY = latToTileY(minLat, zoom);

    if (maxTileX - minTileX <= 4 && maxTileY - minTileY <= 4) {
      const tilePromises: Promise<void>[] = [];
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
          const p = new Promise<void>((resolve) => {
            img.onload = () => {
              const n = Math.pow(2, zoom);
              const lon1 = (tx / n) * 360 - 180;
              const lon2 = ((tx + 1) / n) * 360 - 180;
              const lat1 = (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI;
              const lat2 = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + 1)) / n))) * 180) / Math.PI;

              const [x1, y1] = plot([lat1, lon1]);
              const [x2, y2] = plot([lat2, lon2]);
              tiles.push({ img, x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
              resolve();
            };
            img.onerror = () => resolve();
          });
          tilePromises.push(p);
        }
      }
      await Promise.race([
        Promise.all(tilePromises),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
  } catch {
    // Fall back to cartographic grid
  }

  // Setup MediaStream & MediaRecorder
  const stream = canvas.captureStream(30);
  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 3_500_000,
  });

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  const recordingFinishedPromise = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  // Draw background frame (map + grid)
  const drawBackground = () => {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    if (tiles.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      tiles.forEach((t) => {
        ctx.drawImage(t.img, t.x, t.y, t.w, t.h);
      });
      ctx.restore();
    }

    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= width; gx += 80) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= height; gy += 80) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
  };

  // Draw ONLY the active leg route path
  const drawActiveLegRoutePath = (leg: ExportLeg, traversedCoords: [number, number][]) => {
    if (leg.path.length < 2) return;

    // Outer bright casing for the active leg
    ctx.strokeStyle = "rgba(37, 99, 235, 0.4)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const [sx, sy] = plot(leg.path[0]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < leg.path.length; i++) {
      const [px, py] = plot(leg.path[i]);
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Inner crisp road line
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let i = 1; i < leg.path.length; i++) {
      const [px, py] = plot(leg.path[i]);
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Traversed portion highlighted in primary green
    if (traversedCoords.length >= 2) {
      ctx.strokeStyle = "rgba(34, 197, 94, 0.5)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      const [tx, ty] = plot(traversedCoords[0]);
      ctx.moveTo(tx, ty);
      for (let i = 1; i < traversedCoords.length; i++) {
        const [px, py] = plot(traversedCoords[i]);
        ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      for (let i = 1; i < traversedCoords.length; i++) {
        const [px, py] = plot(traversedCoords[i]);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  };

  // Draw all stops: completed ones stay on map with checkmarks, active one with target halo & badge
  const drawStops = (currentLegIdx: number, isCurrentLegDone = false) => {
    legs.forEach((leg, idx) => {
      const [tx, ty] = plot(leg.targetCoords);
      const isCompleted = idx < currentLegIdx || (idx === currentLegIdx && isCurrentLegDone);
      const isTarget = idx === currentLegIdx && !isCurrentLegDone;

      if (isCompleted) {
        // Green completed pin with checkmark - STAYS ON MAP
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(tx, ty, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // White checkmark
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(tx - 4, ty);
        ctx.lineTo(tx - 1, ty + 3);
        ctx.lineTo(tx + 5, ty - 3.5);
        ctx.stroke();

        // Label bubble
        const labelText = leg.targetName;
        ctx.font = "bold 11px Inter, sans-serif";
        const tw = ctx.measureText(labelText).width;
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tx - tw / 2 - 8, ty - 32, tw + 16, 18, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, tx, ty - 23);
      } else if (isTarget) {
        // Active target pin with pulsing blue halo and Target banner
        ctx.fillStyle = "rgba(59, 130, 246, 0.35)";
        ctx.beginPath();
        ctx.arc(tx, ty, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#2563eb";
        ctx.beginPath();
        ctx.arc(tx, ty, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(leg.stopNumber), tx, ty);

        // Target label banner
        const labelText = `TARGET ${leg.stopNumber}: ${leg.targetName}`;
        ctx.font = "bold 12px Inter, sans-serif";
        const tw = ctx.measureText(labelText).width;
        ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(tx - tw / 2 - 10, ty - 36, tw + 20, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, tx, ty - 25);
      }
    });
  };

  // Draw moving truck with directional heading
  const drawTruck = (coords: [number, number], angle: number) => {
    const [tx, ty] = plot(coords);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);

    // Active ping ripple
    ctx.fillStyle = "rgba(34, 197, 94, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    // Core truck pin
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Direction arrow
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Draw Top HUD Header
  const drawTopHeader = (currentLeg: ExportLeg) => {
    ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
    ctx.fillRect(0, 0, width, 68);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 68);
    ctx.lineTo(width, 68);
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(36, 34, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("GREENWAY FLEET REPLAY", 60, 26);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(`${truckName} (${plateNumber}) - ${driverName}`, 60, 44);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Shift Date: ${dateStr}`, width / 2, 34);

    const targetBadgeText = `Active Target: ${currentLeg.targetName} (${currentLeg.stopNumber}/${currentLeg.totalStops})`;
    ctx.font = "bold 12px Inter, sans-serif";
    const badgeW = ctx.measureText(targetBadgeText).width + 24;
    const badgeX = width - badgeW - 24;

    ctx.fillStyle = "rgba(16, 185, 129, 0.18)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(badgeX, 18, badgeW, 32, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.textAlign = "center";
    ctx.fillText(targetBadgeText, badgeX + badgeW / 2, 34);
  };

  // Draw Bottom Telemetry Bar with Speed, GPS Time, Status
  const drawBottomBar = (currentLeg: ExportLeg, totalProgressPct: number, currentTimestamp?: string) => {
    const barHeight = 60;
    const barY = height - barHeight;

    ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
    ctx.fillRect(0, barY, width, barHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barY);
    ctx.lineTo(width, barY);
    ctx.stroke();

    // Leg Distance
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("LEG DISTANCE", 32, barY + 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.fillText(`${currentLeg.distanceKm.toFixed(1)} km`, 32, barY + 40);

    // Live GPS Time
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText("HISTORICAL GPS TIME", 160, barY + 20);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.fillText(formatTimestamp(currentTimestamp), 160, barY + 40);

    // Telemetry Status
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText("COLLECTION STATUS", 340, barY + 20);

    ctx.fillStyle = "#34d399";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.fillText(`En route to ${currentLeg.targetName}`, 340, barY + 40);

    // Progress Bar
    const pBarW = 280;
    const pBarX = width - pBarW - 32;
    const pBarY = barY + 26;

    ctx.fillStyle = "rgba(51, 65, 85, 0.6)";
    ctx.beginPath();
    ctx.roundRect(pBarX, pBarY, pBarW, 10, 5);
    ctx.fill();

    const filledW = Math.max(8, (pBarW * totalProgressPct) / 100);
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.roundRect(pBarX, pBarY, filledW, 10, 5);
    ctx.fill();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Route Progress: ${Math.round(totalProgressPct)}%`, width - 32, barY + 16);
  };

  // Draw Leg Completion Transition Card
  const drawTargetReachedCard = (leg: ExportLeg) => {
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(0, 0, width, height);

    const cardW = 440;
    const cardH = 140;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(cardX + 44, cardY + cardH / 2, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cardX + 36, cardY + cardH / 2);
    ctx.lineTo(cardX + 42, cardY + cardH / 2 + 6);
    ctx.lineTo(cardX + 52, cardY + cardH / 2 - 6);
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`TARGET ${leg.stopNumber} COMPLETED`, cardX + 80, cardY + 45);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillText(leg.targetName, cardX + 80, cardY + 75);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText("Departing to next target barangay...", cardX + 80, cardY + 102);

    ctx.restore();
  };

  // Render Loop strictly focused on each target leg
  const totalLegs = legs.length;
  const TRANSITION_FRAMES = 18;

  for (let lIdx = 0; lIdx < totalLegs; lIdx++) {
    const leg = legs[lIdx];
    const legPoints = leg.path.length >= 1 ? leg.path : [leg.fromCoords, leg.targetCoords];
    const legTimestamps = leg.timestamps || [];

    const numPoints = legPoints.length;
    const targetFrames = Math.max(numPoints, 45);

    for (let f = 0; f < targetFrames; f++) {
      const pointProgress = (f / (targetFrames - 1 || 1)) * (numPoints - 1);
      const lowIndex = Math.floor(pointProgress);
      const highIndex = Math.min(numPoints - 1, lowIndex + 1);
      const remainder = pointProgress - lowIndex;

      const currentLat = legPoints[lowIndex][0] + (legPoints[highIndex][0] - legPoints[lowIndex][0]) * remainder;
      const currentLng = legPoints[lowIndex][1] + (legPoints[highIndex][1] - legPoints[lowIndex][1]) * remainder;
      const currentCoords: [number, number] = [currentLat, currentLng];

      const nextLat = legPoints[highIndex][0];
      const nextLng = legPoints[highIndex][1];
      const heading = getHeadingAngle(currentCoords, [nextLat, nextLng]);

      const currentTimestamp = legTimestamps[lowIndex] || legTimestamps[0];
      const totalProgressPct = ((lIdx + f / targetFrames) / totalLegs) * 100;

      const traversedPath = legPoints.slice(0, lowIndex + 1);
      if (remainder > 0.05) {
        traversedPath.push(currentCoords);
      }

      // Draw background, active route path, all completed pins (with checkmarks) & active target pin, moving truck, and HUD
      drawBackground();
      drawActiveLegRoutePath(leg, traversedPath);
      drawStops(lIdx, false);
      drawTruck(currentCoords, heading);
      drawTopHeader(leg);
      drawBottomBar(leg, totalProgressPct, currentTimestamp);

      if (onProgress) {
        onProgress(
          Math.round(totalProgressPct),
          `Rendering Target ${lIdx + 1}/${totalLegs}: ${leg.targetName}`,
        );
      }

      await new Promise((r) => setTimeout(r, 16));
    }

    // Target reached transition celebration - active target becomes completed with checkmark
    for (let tf = 0; tf < TRANSITION_FRAMES; tf++) {
      drawBackground();
      drawActiveLegRoutePath(leg, legPoints);
      drawStops(lIdx, true);
      drawTopHeader(leg);
      drawBottomBar(leg, ((lIdx + 1) / totalLegs) * 100, legTimestamps[legTimestamps.length - 1]);
      drawTargetReachedCard(leg);

      await new Promise((r) => setTimeout(r, 16));
    }
  }

  // End of route final frame
  for (let ef = 0; ef < 24; ef++) {
    drawBackground();
    drawStops(totalLegs, true);
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 26px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SHIFT REPLAY COMPLETE", width / 2, height / 2 - 20);

    ctx.fillStyle = "#ffffff";
    ctx.font = "15px Inter, sans-serif";
    ctx.fillText(`All ${totalLegs} Target Barangays Successfully Completed`, width / 2, height / 2 + 16);

    await new Promise((r) => setTimeout(r, 16));
  }

  if (onProgress) {
    onProgress(100, "Finalizing video file...");
  }

  recorder.stop();
  await recordingFinishedPromise;

  const videoBlob = new Blob(recordedChunks, { type: mimeType });
  const downloadUrl = URL.createObjectURL(videoBlob);
  const cleanTruckName = truckName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${cleanTruckName}_${dateStr}_Route_Replay.${extension}`;

  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 15_000);
};
