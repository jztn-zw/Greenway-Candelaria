interface FastVideoOptions {
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  onStage?: (stage: "encoding" | "finalizing") => void;
}

// Encode timestamped frames directly, independently of wall-clock playback.
// Load the encoder only when the browser provides WebCodecs.
export const encodeReplayVideoFast = async (
  canvas: HTMLCanvasElement,
  durationMs: number,
  drawFrame: (progress: number) => void,
  { signal, onProgress, onStage }: FastVideoOptions,
): Promise<{ video: Blob; extension: string } | null> => {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException("Video export cancelled.", "AbortError");
  };
  checkAbort();
  const { BufferTarget, CanvasSource, Mp4OutputFormat, WebMOutputFormat, Output, Quality, canEncodeVideo } = await import("mediabunny");
  checkAbort();
  const frameRate = 24;
  const quality = new Quality({ bitrate: 3_500_000 });
  const candidates = ["avc", "vp9", "vp8"] as const;
  let codec: typeof candidates[number] | null = null;
  for (const candidate of candidates) {
    checkAbort();
    if (await canEncodeVideo(candidate, { width: canvas.width, height: canvas.height, frameRate, quality })) {
      codec = candidate;
      break;
    }
  }
  if (!codec) return null;
  checkAbort();
  const extension = codec === "avc" ? "mp4" : "webm";
  const target = new BufferTarget();
  const output = new Output({ format: codec === "avc" ? new Mp4OutputFormat() : new WebMOutputFormat(), target });
  const source = new CanvasSource(canvas, { codec, quality, latencyMode: "quality", keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate });
  const abort = () => { void output.cancel().catch(() => {}); };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    checkAbort();
    await output.start();
    onStage?.("encoding");
    const duration = durationMs / 1000;
    const frameCount = Math.max(1, Math.ceil(duration * frameRate));
    let lastProgress = -1;
    for (let frame = 0; frame < frameCount; frame++) {
      checkAbort();
      const timestamp = frame / frameRate;
      drawFrame(frame === frameCount - 1 ? 1 : timestamp / duration);
      // Await encoder backpressure to keep frames and memory bounded.
      await source.add(timestamp, Math.min(1 / frameRate, duration - timestamp));
      const progress = Math.min(99, Math.floor((frame + 1) / frameCount * 100));
      if (progress !== lastProgress) { onProgress?.(progress); lastProgress = progress; }
      // Let the popup repaint and Cancel remain responsive during fast exports.
      if (frame % 12 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    checkAbort();
    onStage?.("finalizing");
    await output.finalize();
    checkAbort();
    if (!target.buffer?.byteLength) throw new Error("No video frames were encoded.");
    return { video: new Blob([target.buffer], { type: extension === "mp4" ? "video/mp4" : "video/webm" }), extension };
  } catch (error) {
    checkAbort();
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
    if (output.state !== "finalized") await output.cancel();
  }
};
