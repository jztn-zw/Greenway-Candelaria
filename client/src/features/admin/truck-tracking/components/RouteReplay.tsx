import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAdminFetch } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fetchTruckHistory } from "@/services/trackingService";
import { format } from "date-fns";
import { AlertTriangle, CalendarDays, Loader2, Pause, Play, RotateCcw, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminTruck } from "../types";
import { buildReplayTrip, formatReplayDuration, formatReplayTime, getReplayCompletedTargetLocations, getReplayCompletionElapsed, getReplayDuration, getReplayGaps, getReplaySkippedTargetLocations, getReplayTargetLocation, getReplayTargetProgress, sampleReplayTrip, type ReplayTargetLocation, type ReplayTrip } from "../utils/replayTrip";
import { exportReplayVideo } from "../utils/replayVideoExporter";
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
  const targetProgress = trip && sample ? getReplayTargetProgress(trip, sample.index, trip.times[0] + elapsedMs) : null;
  const targetLocation = trip && sample ? getReplayTargetLocation(trip, sample.index, trip.times[0] + elapsedMs) : null;
  const gaps = useMemo(() => trip ? getReplayGaps(trip) : [], [trip]);
  const replayTime = trip ? trip.times[0] + elapsedMs : 0;
  const activeGap = gaps.find((gap) => replayTime > gap.start && replayTime < gap.end);
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

  useEffect(() => () => {
    requestVersionRef.current += 1;
    exportAbortRef.current?.abort();
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
    setExportProgress(0);
    try {
      await exportReplayVideo({
        truckName: selectedTruckObj?.name ?? "Municipal Truck",
        plateNumber: selectedTruckObj?.plateNumber ?? "",
        dateStr: format(date, "yyyy-MM-dd"),
        trip,
        signal: controller.signal,
        onProgress: setExportProgress,
      });
      if (!controller.signal.aborted) toast.success("Replay video downloaded");
    } catch {
      if (!controller.signal.aborted) toast.error("Could not generate the replay video. Please try again.");
    } finally {
      if (!controller.signal.aborted) setExportProgress(null);
      if (exportAbortRef.current === controller) exportAbortRef.current = null;
    }
  };

  return (
    <section aria-label="Route replay" className="space-y-4 rounded-lg border border-border/80 bg-card p-4">
      <header className="space-y-1">
        <h3 className="font-display text-sm font-semibold text-foreground">Route replay</h3>
        <p className="text-xs text-muted-foreground">Review the full recorded trip.</p>
      </header>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label id="replay-truck-label" className="block text-xs font-semibold text-foreground">Truck</label>
          <Select value={selectedTruck} onValueChange={setSelectedTruck} disabled={exporting}>
            <SelectTrigger aria-labelledby="replay-truck-label" className="h-9 rounded-md border-border/80 text-xs">
              <SelectValue placeholder="Select a truck" />
            </SelectTrigger>
            <SelectContent>
              {trucks.map((truck) => (
                <SelectItem key={truck.id} value={truck.id} className="text-xs">
                  <span className="font-medium">{truck.name}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground">{truck.plateNumber}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label id="replay-date-label" className="block text-xs font-semibold text-foreground">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={exporting} aria-labelledby="replay-date-label replay-date-value" className="h-9 w-full justify-start gap-2 rounded-md border-border/80 text-xs font-normal hover:bg-muted hover:text-foreground">
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
          <Button onClick={() => void loadReplay()} disabled={!selectedTruck || !date || loading} className="h-9 w-full gap-2 rounded-md text-xs font-semibold">
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            {loading ? "Loading replay…" : loadFailed ? "Retry" : "Load replay"}
          </Button>
          {loadMessage && <p role={loadFailed ? "alert" : "status"} className={cn("text-xs leading-relaxed", loadFailed ? "text-destructive" : "text-muted-foreground")}>{loadMessage}</p>}
        </div>
      )}
      {trip && (
        <>
          {targetProgress && (
            <dl aria-label="Street target progress" className="border-l-2 border-primary/60 pl-3">
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Current target street</dt>
                <dd className="text-sm font-semibold leading-snug text-foreground">
                  {targetProgress.currentTarget ?? (targetProgress.targetUnknown ? "Not recorded" : "No remaining target")}
                </dd>
                {targetProgress.currentTarget && !targetLocation && <dd className="text-[11px] text-muted-foreground">Target location was not recorded.</dd>}
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
                <Button variant="outline" aria-label="Restart replay" title="Restart replay" className="size-9 shrink-0 rounded-md border-border/80 p-0 hover:bg-muted hover:text-foreground" onClick={restart}>
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <span id="replay-speed-label" className="text-xs text-muted-foreground">Playback speed</span>
                <div role="group" aria-labelledby="replay-speed-label" className="grid grid-cols-6 gap-1 rounded-md bg-muted/40 p-1">
                  {SPEED_OPTIONS.map((value) => (
                    <button key={value} type="button" aria-pressed={speed === value} onClick={() => { syncClock(); setSpeed(value); }} className={cn("min-h-8 min-w-0 rounded-md px-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", speed === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{value}×</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={playing && !finished ? "font-medium text-primary" : "text-muted-foreground"}>{finished ? "Finished" : playing ? "Playing" : "Paused"}</span>
                  <span className="font-medium tabular-nums text-foreground">{progress}%</span>
                </div>
                <Slider aria-label="Trip replay progress" value={[elapsedMs]} min={0} max={durationMs} step={1} onValueChange={([value]) => seek(value)} />
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
                  <span>Replay time: {formatReplayTime(sample?.timestamp)}</span>
                  <span>End: {formatReplayTime(trip.timestamps[lastIndex])}</span>
                </div>
              </div>
            </div>
          ) : <p role="status" className="text-xs leading-relaxed text-muted-foreground">{trip.path.length === 1 ? "Only one GPS record is available." : "The GPS records have the same timestamp."} The last recorded location is shown on the map; there is no timed trip to play.</p>}
          {gaps.length > 0 && (
            <div role="status" aria-label="GPS recording gaps" className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/30 p-3">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 space-y-1 text-xs leading-relaxed">
                <p className="font-medium text-foreground">
                  {activeGap
                    ? "GPS gap: " + formatReplayTime(new Date(activeGap.start).toISOString()) + " – " + formatReplayTime(new Date(activeGap.end).toISOString()) + " (" + formatReplayDuration(activeGap.durationMs) + ")"
                    : gaps.length + (gaps.length === 1 ? " gap" : " gaps") + " over 1 min in GPS records"}
                </p>
                <p className="text-muted-foreground">Locations inside gaps are estimated.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Estimated trip distance</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{trip.distanceKm.toFixed(1)} km</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Recorded duration</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatReplayDuration(durationMs)}</p>
            </div>
          </div>
          {targetProgress && (
            <dl aria-label="Completed street locations" className="space-y-2">
              <dt className="text-xs font-semibold text-foreground">Completed streets</dt>
              <dd>
                {targetProgress.completed.length ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Select a street to jump to its completion time.</p>
                    <ul className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto overscroll-contain pr-1">
                      {targetProgress.completed.map((name) => {
                        const elapsed = getReplayCompletionElapsed(trip, name, replayTime);
                        return (
                          <li key={name} className="max-w-full">
                            <button type="button" disabled={elapsed === null} aria-label={"Jump to " + name + " completion"}
                              title={elapsed === null ? "Completion is outside the recorded GPS timeline" : "Jump to " + formatReplayTime(new Date(trip.times[0] + elapsed).toISOString())}
                              onClick={() => { if (elapsed !== null) seek(elapsed); }}
                              className="max-w-full rounded-md border border-border/70 bg-muted/20 px-2.5 py-1.5 text-left text-xs font-medium leading-relaxed text-primary transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:text-muted-foreground disabled:hover:bg-muted/20">
                              {name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : <span className="text-xs text-muted-foreground">{trip.stops?.length ? "None yet" : "Not recorded"}</span>}
              </dd>
            </dl>
          )}
          <div className="space-y-3 border-t border-border/60 pt-3">
            {canPlay && <div className="space-y-1.5">
              <Button variant="outline" disabled={exporting} onClick={() => void downloadVideo()} className="h-9 w-full gap-2 rounded-md border-border/80 text-xs font-semibold hover:bg-muted hover:text-foreground">
                {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Video className="size-3.5" />}
                {exporting ? "Generating video… " + exportProgress + "%" : "Download video"}
              </Button>
              <p className="text-[11px] text-muted-foreground">A condensed replay of the full trip.</p>
            </div>}
          </div>
        </>
      )}
    </section>
  );
};

export default RouteReplay;
