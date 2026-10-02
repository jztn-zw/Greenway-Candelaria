import { Button } from "@/components/ui/button";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { FormDialog } from "@/components/FormDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Slider } from "@/components/ui/slider";
import { useAdminFetch } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fetchTruckHistory } from "@/services/trackingService";
import { format } from "date-fns";
import { CalendarDays, Pause, Play, RotateCcw, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminTruck } from "../types";
import { buildReplayTrip, formatReplayDuration, formatReplayTime, getReplayCompletedTargetLocations, getReplayDuration, getReplaySkippedTargetLocations, getReplayTargetLocation, getReplayTargetProgress, getReplayTargetStartElapsed, getReplayTargetState, sampleReplayTrip, type ReplayTargetLocation, type ReplayTrip } from "../utils/replayTrip";
import { exportReplayVideo, REPLAY_VIDEO_SPEEDS } from "../utils/replayVideoExporter";
import { getManilaNow } from "@/utils/date";

interface RouteReplayProps {
  trucks: AdminTruck[];
  onReplayPath: (path: [number, number][] | undefined) => void;
  onReplayIndex: (index: number | undefined) => void;
  onReplayTargetLocation?: (target: ReplayTargetLocation | null) => void;
  onReplayCompletedTargets?: (targets: ReplayTargetLocation[]) => void;
  onReplaySkippedTargets?: (targets: ReplayTargetLocation[]) => void;
}

const SPEED_OPTIONS = [1, 2, 5, 10, 30, 60] as const;

const RouteReplay = ({ trucks, onReplayPath, onReplayIndex, onReplayTargetLocation, onReplayCompletedTargets, onReplaySkippedTargets }: RouteReplayProps) => {
  const fetchAdmin = useAdminFetch();
  const [selectedTruck, setSelectedTruck] = useState("");
  const [date, setDate] = useState<Date | undefined>(() => {
    const { year, month, day } = getManilaNow();
    return new Date(year, month - 1, day);
  });
  const [trip, setTrip] = useState<ReplayTrip | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playbackRevision, setPlaybackRevision] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSpeed, setExportSpeed] = useState(10);
  const [exportStage, setExportStage] = useState<"map" | "recording" | "encoding" | "finalizing">("map");
  const [exportError, setExportError] = useState("");
  const requestVersionRef = useRef(0);
  const exportAbortRef = useRef<AbortController | null>(null);
  const elapsedRef = useRef(0);
  const clockRef = useRef<{ startedAt: number; elapsed: number; speed: number } | null>(null);
  const completedTargetsRef = useRef<ReplayTargetLocation[]>([]);
  const skippedTargetsRef = useRef<ReplayTargetLocation[]>([]);

  const selectedTruckObj = trucks.find((truck) => truck.id === selectedTruck);
  const lastIndex = Math.max(0, (trip?.path.length ?? 1) - 1);
  const durationMs = trip ? getReplayDuration(trip) : 0;
  const canPlay = durationMs > 0;
  const finished = canPlay && elapsedMs >= durationMs;
  const progress = canPlay ? Math.round((elapsedMs / durationMs) * 100) : 0;
  const sample = trip ? sampleReplayTrip(trip, durationMs > 0 ? elapsedMs / durationMs : 0) : null;
  const exporting = exportProgress !== null;
  const exportPercent = Math.max(0, Math.min(100, exportProgress ?? 0));
  const exportStageLabel = {
    map: "Preparing map…",
    encoding: "Encoding video…",
    recording: "Recording video…",
    finalizing: "Finishing file…",
  }[exportStage];
  const targetProgress = trip && sample ? getReplayTargetProgress(trip, sample.index, trip.times[0] + elapsedMs) : null;
  const targetLocation = trip && sample ? getReplayTargetLocation(trip, sample.index, trip.times[0] + elapsedMs) : null;
  const targetRows = useMemo(() => trip ? (trip.stops ?? []).map((stop) => ({ stop, elapsed: getReplayTargetStartElapsed(trip, stop) })) : [], [trip]);
  const replayTime = trip ? trip.times[0] + elapsedMs : 0;
  const today = getManilaNow();
  const manilaToday = new Date(today.year, today.month - 1, today.day);

  const updateElapsed = (value: number) => {
    elapsedRef.current = value;
    setElapsedMs(value);
  };
  const syncClock = () => {
    const clock = clockRef.current;
    if (clock) updateElapsed(Math.min(durationMs, clock.elapsed + (performance.now() - clock.startedAt) * clock.speed));
  };
  const restart = () => {
    updateElapsed(0);
    setPlaybackRevision((revision) => revision + 1);
    setPlaying(true);
  };
  const seek = (value: number) => {
    setPlaying(false);
    updateElapsed(Math.max(0, Math.min(durationMs, value)));
  };
  const playFromTarget = (value: number) => {
    updateElapsed(value);
    // Re-anchor the clock even when playback is already running.
    setPlaybackRevision((revision) => revision + 1);
    setPlaying(true);
  };

  useEffect(() => () => {
    requestVersionRef.current += 1;
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
    onReplayPath(undefined);
    onReplayIndex(undefined);
    onReplayTargetLocation?.(null);
    onReplayCompletedTargets?.([]);
    onReplaySkippedTargets?.([]);
  }, [onReplayPath, onReplayIndex, onReplayTargetLocation, onReplayCompletedTargets, onReplaySkippedTargets]);

  useEffect(() => {
    requestVersionRef.current += 1;
    setPlaying(false);
    setLoading(false);
    setTrip(null);
    setExportOpen(false);
    elapsedRef.current = 0;
    setElapsedMs(0);
    setLoadMessage("");
    setLoadFailed(false);
    onReplayPath(undefined);
    onReplayIndex(undefined);
    onReplayTargetLocation?.(null);
    completedTargetsRef.current = [];
    onReplayCompletedTargets?.([]);
    skippedTargetsRef.current = [];
    onReplaySkippedTargets?.([]);
  }, [selectedTruck, date, onReplayPath, onReplayIndex, onReplayTargetLocation, onReplayCompletedTargets, onReplaySkippedTargets]);

  useEffect(() => {
    onReplayTargetLocation?.(targetLocation);
  }, [targetLocation, onReplayTargetLocation]);

  useEffect(() => {
    const completedTargets = trip ? getReplayCompletedTargetLocations(trip, 0, replayTime) : [];
    const previous = completedTargetsRef.current;
    if (previous.length === completedTargets.length && previous.every((target, index) => target === completedTargets[index])) return;
    completedTargetsRef.current = completedTargets;
    onReplayCompletedTargets?.(completedTargets);
  }, [trip, replayTime, onReplayCompletedTargets]);

  useEffect(() => {
    const skippedTargets = trip ? getReplaySkippedTargetLocations(trip, 0, replayTime) : [];
    const previous = skippedTargetsRef.current;
    if (previous.length === skippedTargets.length && previous.every((target, index) => target === skippedTargets[index])) return;
    skippedTargetsRef.current = skippedTargets;
    onReplaySkippedTargets?.(skippedTargets);
  }, [trip, replayTime, onReplaySkippedTargets]);

  useEffect(() => {
    if (trip) onReplayIndex(sampleReplayTrip(trip, durationMs > 0 ? elapsedMs / durationMs : 0).position);
  }, [trip, elapsedMs, durationMs, onReplayIndex]);

  // Anchor playback to a monotonic clock so delayed frames do not accumulate
  // drift. At 1×, one real second advances one recorded second.
  useEffect(() => {
    if (!playing || !canPlay || finished) return;
    const clock = { startedAt: performance.now(), elapsed: elapsedRef.current, speed };
    clockRef.current = clock;
    const timer = window.setInterval(() => {
      const value = Math.min(durationMs, clock.elapsed + (performance.now() - clock.startedAt) * speed);
      elapsedRef.current = value;
      setElapsedMs(value);
    }, 100);
    return () => { window.clearInterval(timer); clockRef.current = null; };
  }, [playing, canPlay, finished, durationMs, speed, playbackRevision]);

  const loadReplay = async () => {
    if (!selectedTruck || !date || loading) return;
    const version = ++requestVersionRef.current;
    setLoading(true);
    setLoadMessage("");
    setLoadFailed(false);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const { logs, stops } = await fetchAdmin("tracking", ["history", selectedTruck, dateStr], () => fetchTruckHistory(selectedTruck, dateStr));
      if (version !== requestVersionRef.current) return;
      const loadedTrip = buildReplayTrip(logs ?? [], stops ?? []);
      if (!loadedTrip) {
        setLoadMessage("No GPS records for this truck and date. Try another date.");
        return;
      }
      setTrip(loadedTrip);
      updateElapsed(0);
      onReplayPath(loadedTrip.path);
      setPlaying(getReplayDuration(loadedTrip) > 0);
    } catch {
      if (version !== requestVersionRef.current) return;
      setLoadFailed(true);
      setLoadMessage("Could not load GPS history. Please try again.");
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  };

  const downloadVideo = async () => {
    if (!trip || !date || exporting || !canPlay) return;
    const controller = new AbortController();
    exportAbortRef.current = controller;
    syncClock();
    setPlaying(false);
    setExportError("");
    setExportStage("map");
    setExportProgress(0);
    try {
      await exportReplayVideo({
        truckName: selectedTruckObj?.name ?? "Municipal Truck",
        plateNumber: selectedTruckObj?.plateNumber ?? "",
        dateStr: format(date, "yyyy-MM-dd"),
        trip,
        speed: exportSpeed,
        signal: controller.signal,
        onProgress: setExportProgress,
        onStage: setExportStage,
      });
      if (!controller.signal.aborted) {
        toast.success("Replay video downloaded");
        setExportOpen(false);
      }
    } catch (error) {
      if (!controller.signal.aborted) setExportError(error instanceof Error ? error.message : "Could not generate the replay video. Please try again.");
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
        setExportProgress(null);
      }
    }
  };

  return (
    <section aria-label="Route replay" className="space-y-4 rounded-lg border border-border/80 bg-card p-4">
      <header className="space-y-1">
        <h3 className="gw-heading text-sm text-foreground">Route replay</h3>
        <p className="text-xs text-muted-foreground">Review the full recorded trip.</p>
      </header>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label id="replay-truck-label" className="block text-xs font-medium text-foreground">Truck</label>
          <SearchableSelect value={selectedTruck} onValueChange={setSelectedTruck} disabled={exporting}
            aria-labelledby="replay-truck-label" fieldSize="compact" placeholder="Select a truck" searchPlaceholder="Search trucks..."
            options={trucks.map((truck) => ({ value: truck.id, label: `${truck.name} ${truck.plateNumber}` }))}
            className="h-9 rounded-md border-border/80 text-xs" />
        </div>
        <div className="space-y-1.5">
          <label id="replay-date-label" className="block text-xs font-medium text-foreground">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={exporting} aria-labelledby="replay-date-label replay-date-value" className="h-9 w-full justify-start gap-2 rounded-md text-xs font-normal">
                <CalendarDays className="size-3.5 shrink-0 text-primary" />
                <span id="replay-date-value">{date ? format(date, "MMMM d, yyyy") : "Select a date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} disabled={(day) => day > manilaToday} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {!trip && (
        <div className="space-y-2">
          {loadFailed ? <DataRefreshNotice primary role="alert" message={loadMessage || "Couldn't load the route replay. Please try again."} onRetry={() => void loadReplay()} retrying={loading} disabled={!selectedTruck || !date} /> : <>
          <Button onClick={() => void loadReplay()} disabled={!selectedTruck || !date || loading} className="h-9 w-full gap-2 rounded-md text-xs font-semibold" loading={loading} loadingLabel="Loading replay…">
            <Play className="size-3.5" />
            Load replay
          </Button>
          {loadMessage && <p role="status" className="text-xs leading-relaxed text-muted-foreground">{loadMessage}</p>}
          </>}
        </div>
      )}
      {trip && (
        <>
          {targetProgress && (
            <dl aria-label="Street target progress" className="border-l-2 border-primary/60 pl-3">
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Current target street</dt>
                <dd className="text-sm font-semibold leading-snug text-foreground">
                  {targetProgress.currentTarget ?? (targetProgress.targetUnknown ? "Not recorded" : targetRows.some(({ stop }) => getReplayTargetState(stop, replayTime) === "upcoming") ? "No active target" : "No remaining target")}
                </dd>
                {targetProgress.currentTarget && !targetLocation && <dd className="text-ui-caption text-muted-foreground">Target location was not recorded.</dd>}
              </div>
            </dl>
          )}
          {canPlay ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button className="h-9 flex-1 gap-1.5 rounded-md text-xs font-semibold" onClick={() => {
                  if (finished) restart();
                  else { syncClock(); setPlaying(!playing); }
                }}>
                  {playing && !finished ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  {finished ? "Replay again" : playing ? "Pause" : "Play"}
                </Button>
                <Button variant="outline" aria-label="Restart replay" title="Restart replay" className="size-9 shrink-0 rounded-md p-0" onClick={restart}>
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <span id="replay-speed-label" className="text-xs text-muted-foreground">Playback speed</span>
                <div role="group" aria-labelledby="replay-speed-label" className="grid grid-cols-6 gap-1 rounded-md bg-muted/40 p-1">
                  {SPEED_OPTIONS.map((value) => (
                    <button key={value} type="button" aria-pressed={speed === value} onClick={() => { syncClock(); setSpeed(value); }} className={cn("min-h-8 min-w-0 rounded-md px-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", speed === value ? "bg-primary text-primary-foreground" : "gw-action-ghost ")}>{value}×</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={playing && !finished ? "font-medium text-primary" : "text-muted-foreground"}>{finished ? "Finished" : playing ? "Playing" : "Paused"}</span>
                  <span className="font-medium tabular-nums text-foreground">{progress}%</span>
                </div>
                <Slider aria-label="Trip replay progress" value={[elapsedMs]} min={0} max={durationMs} step={1} onValueChange={([value]) => seek(value)} />
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-ui-caption tabular-nums text-muted-foreground">
                  <span>Replay time: {formatReplayTime(sample?.timestamp)}</span>
                  <span>End: {formatReplayTime(trip.timestamps[lastIndex])}</span>
                </div>
              </div>
            </div>
          ) : <p role="status" className="text-xs leading-relaxed text-muted-foreground">{trip.path.length === 1 ? "Only one GPS record is available." : "The GPS records have the same timestamp."} The last recorded location is shown on the map; there is no timed trip to play.</p>}
          <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
            <div className="space-y-1">
              <p className="text-ui-caption text-muted-foreground">Estimated trip distance</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{trip.distanceKm.toFixed(1)} km</p>
            </div>
            <div className="space-y-1">
              <p className="text-ui-caption text-muted-foreground">Recorded duration</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatReplayDuration(durationMs)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="gw-heading text-xs text-foreground">Target streets</h4>
            {targetRows.length ? (
              <>
                <p className="text-ui-caption text-muted-foreground">Select a street to replay from its start.</p>
                <ul aria-label="Target street locations" className="max-h-56 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
                  {targetRows.map(({ stop, elapsed }, index) => {
                    const state = getReplayTargetState(stop, replayTime);
                    const current = state === "current";
                    const unavailable = stop.startedAt === null || (stop.endedAt === null && ["DONE", "MISSED", "SKIPPED"].includes(stop.status)) ? "Time not recorded" : "No GPS for this target";
                    const statusLabel = { current: "Current", completed: "Completed", skipped: "Skipped", upcoming: "Upcoming", unknown: "Time not recorded" }[state];
                    return (
                      <li key={stop.id}>
                        <button type="button" disabled={elapsed === null} aria-current={current ? "step" : undefined}
                          aria-label={"Play from target " + (index + 1) + ": " + stop.targetName}
                          title={elapsed === null ? unavailable : "Play from " + formatReplayTime(new Date(trip.times[0] + elapsed).toISOString())}
                          onClick={() => { if (elapsed !== null) playFromTarget(elapsed); }}
                          className={cn("flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60", current ? "border-primary/40 bg-primary/10" : "border-border/70 bg-muted/20 enabled:hover:bg-[var(--button-neutral-hover)]")}>
                          <span aria-hidden="true" className={cn("flex size-6 shrink-0 items-center justify-center rounded-md text-ui-caption font-semibold tabular-nums", current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{index + 1}</span>
                          <span className="min-w-0 flex-1 space-y-0.5">
                            <span className="block text-xs font-medium leading-relaxed text-foreground">{stop.targetName}</span>
                            <span className={cn("block text-ui-caption", current ? "text-primary" : "text-muted-foreground")}>{elapsed === null ? unavailable : statusLabel}</span>
                          </span>
                          {elapsed !== null && <Play aria-hidden="true" className={cn("size-3.5 shrink-0", current ? "text-primary" : "text-muted-foreground")} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : <p className="text-xs text-muted-foreground">Target streets were not recorded.</p>}
          </div>
          <div className="space-y-3 border-t border-border/60 pt-3">
            {canPlay && <div className="space-y-1.5">
              <Button variant="outline" disabled={exporting} onClick={() => { setExportError(""); setExportOpen(true); }} className="h-9 w-full gap-2 rounded-md text-xs font-semibold">
                <Video className="size-3.5" />
                Download video
              </Button>
              <p className="text-ui-caption text-muted-foreground">Save the full map replay at your chosen speed.</p>
            </div>}
          </div>
        </>
      )}
      <FormDialog open={exportOpen} onOpenChange={setExportOpen} pending={exporting}
        title="Download replay video" description="Choose your playback speed." icon={<Video className="size-5" />}
        footer={<>
          <Button variant="outline" onClick={() => { exportAbortRef.current?.abort(); setExportOpen(false); }}>Cancel</Button>
          <Button className="min-w-[12.5rem]" disabled={exporting || !canPlay} onClick={() => void downloadVideo()} loading={exporting} loadingLabel={exportStageLabel}>

            Create video
          </Button>
        </>}>
        <div className="space-y-4">
          <fieldset disabled={exporting} className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Video speed</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {REPLAY_VIDEO_SPEEDS.map((value) => <label key={value} className="cursor-pointer">
                <input type="radio" name="replay-video-speed" value={value} checked={exportSpeed === value} onChange={() => setExportSpeed(value)} className="peer sr-only" />
                <span className="flex h-10 items-center justify-center rounded-md border border-border bg-muted/20 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:opacity-60">{value}×</span>
              </label>)}
            </div>
          </fieldset>
          <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
            <p className="font-medium">Video length: {formatReplayDuration(durationMs / exportSpeed)}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Candelaria map with the truck route and target streets.</p>
          </div>
          {exporting && <div role="progressbar" aria-label="Video export progress" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={exportStage === "map" ? undefined : exportPercent}
            aria-valuetext={exportStage === "map" ? "Preparing route map" : exportStage === "finalizing" ? "Finishing video" : `${exportPercent}% ${exportStage === "encoding" ? "encoded" : "recorded"}`}
            className={cn("h-2.5 overflow-hidden rounded-full bg-primary/15", exportStage === "map" && "motion-safe:animate-pulse")}>
            {exportStage !== "map" && <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${exportPercent}%` }} />}
          </div>}
          <p className="text-xs leading-relaxed text-muted-foreground">{exporting ? "Keep this tab open until the download begins." : "Keep this tab open. Export time depends on the route and your device."}</p>
          {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}
        </div>
      </FormDialog>
    </section>
  );
};

export default RouteReplay;
