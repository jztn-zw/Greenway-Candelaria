import { useSystemTime } from "@/hooks/useSystemTime";
import { AdminModal } from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/button";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { Calendar } from "@/components/ui/calendar";
import { Popover,PopoverContent,PopoverTrigger } from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Slider } from "@/components/ui/slider";
import { useAdminFetch,useAdminQuery } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { fetchTruckHistory,type TruckHistoryData } from "@/services/trackingService";
import { format } from "date-fns";
import { CalendarDays,Pause,Play,RotateCcw,Download } from "lucide-react";
import { useEffect,useMemo,useRef,useState } from "react";
import type { AdminTruck } from "../types";
import { buildReplayTrip,formatReplayDuration,formatReplayTime,getReplayCompletedTargetLocations,getReplayDuration,getReplaySkippedTargetLocations,getReplayTargetLocation,getReplayTargetProgress,getReplayTargetStartElapsed,getReplayTargetState,sampleReplayTrip,type ReplayTargetLocation,type ReplayTrip } from "../utils/replayTrip";
import { exportReplayVideo, REPLAY_VIDEO_SPEEDS } from "../utils/replayVideoExporter";
import { exportReplayKml, exportReplayGpx } from "../utils/replayKmlExporter";
import { getManilaNow } from "@/utils/date";

interface RouteReplayProps {
  trucks: AdminTruck[];
  onReplayPath: (path: [number, number][] | undefined) => void;
  onReplayBreaks?: (breaks: boolean[] | undefined) => void;
  onReplayIndex: (index: number | undefined) => void;
  onReplayTargetLocation?: (target: ReplayTargetLocation | null) => void;
  onReplayCompletedTargets?: (targets: ReplayTargetLocation[]) => void;
  onReplaySkippedTargets?: (targets: ReplayTargetLocation[]) => void;
}

const SPEED_OPTIONS = [1, 2, 5, 10, 30, 60] as const;

const RouteReplay = ({ trucks, onReplayPath, onReplayBreaks, onReplayIndex, onReplayTargetLocation, onReplayCompletedTargets, onReplaySkippedTargets }: RouteReplayProps) => {
  useSystemTime();
  const fetchAdmin = useAdminFetch();
  const [selectedTruck, setSelectedTruck] = useState("");
  const [date, setDate] = useState<Date | undefined>(() => {
    const { year, month, day } = getManilaNow();
    return new Date(year, month - 1, day);
  });
  const [trip, setTrip] = useState<ReplayTrip | null>(null);
  const [loadedSelection, setLoadedSelection] = useState<{ truckId: string; dateStr: string } | null>(null);
  const appliedHistoryRef = useRef<TruckHistoryData>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playbackRevision, setPlaybackRevision] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [exportFormat, setExportFormat] = useState<"kml" | "mp4" | "gpx">("kml");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSpeed, setExportSpeed] = useState(10);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<"map" | "recording" | "encoding" | "finalizing">("map");
  const [exporting, setExporting] = useState(false);
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
  const selectionMatches = loadedSelection?.truckId === selectedTruck && loadedSelection?.dateStr === (date ? format(date, "yyyy-MM-dd") : "");
  const historyQuery = useAdminQuery("tracking", ["history", loadedSelection?.truckId, loadedSelection?.dateStr],
    () => fetchTruckHistory(loadedSelection!.truckId, loadedSelection!.dateStr),
    { enabled: !!loadedSelection && selectionMatches && !playing && !exporting && !loading, refetchInterval: 60_000 });
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
    onReplayBreaks?.(undefined);
    onReplayIndex(undefined);
    onReplayTargetLocation?.(null);
    onReplayCompletedTargets?.([]);
    onReplaySkippedTargets?.([]);
  }, [onReplayPath, onReplayBreaks, onReplayIndex, onReplayTargetLocation, onReplayCompletedTargets, onReplaySkippedTargets]);

  useEffect(() => {
    requestVersionRef.current += 1;
    setPlaying(false);
    setLoading(false);
    setTrip(null);
    setLoadedSelection(null);
    appliedHistoryRef.current = undefined;
    setExportOpen(false);
    setExportError("");
    elapsedRef.current = 0;
    setElapsedMs(0);
    setLoadMessage("");
    setLoadFailed(false);
    onReplayPath(undefined);
    onReplayBreaks?.(undefined);
    onReplayIndex(undefined);
    onReplayTargetLocation?.(null);
    completedTargetsRef.current = [];
    onReplayCompletedTargets?.([]);
    skippedTargetsRef.current = [];
    onReplaySkippedTargets?.([]);
  }, [selectedTruck, date, onReplayPath, onReplayBreaks, onReplayIndex, onReplayTargetLocation, onReplayCompletedTargets, onReplaySkippedTargets]);

  useEffect(() => {
    const history = historyQuery.data;
    if (!selectionMatches || playing || exporting || loading || !history || history === appliedHistoryRef.current) return;
    appliedHistoryRef.current = history;
    const updated = buildReplayTrip(history.logs ?? [], history.stops ?? []);
    const instant = trip ? trip.times[0] + elapsedRef.current : updated?.times[0] ?? 0;
    const elapsed = updated ? Math.max(0, Math.min(getReplayDuration(updated), instant - updated.times[0])) : 0;
    elapsedRef.current = elapsed;
    setElapsedMs(elapsed);
    setTrip(updated);
    setLoadMessage(updated ? "" : "No GPS records for this truck and date. Try another date.");
    onReplayPath(updated?.path);
    onReplayBreaks?.(updated?.breakBefore);
    if (!updated) onReplayIndex(undefined);
  }, [historyQuery.data, selectionMatches, playing, exporting, loading, trip, onReplayPath, onReplayBreaks, onReplayIndex]);

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
      if (value >= durationMs) setPlaying(false);
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
      const history = await fetchAdmin("tracking", ["history", selectedTruck, dateStr], () => fetchTruckHistory(selectedTruck, dateStr));
      if (version !== requestVersionRef.current) return;
      const { logs, stops } = history;
      appliedHistoryRef.current = history;
      setLoadedSelection({ truckId: selectedTruck, dateStr });
      const loadedTrip = buildReplayTrip(logs ?? [], stops ?? []);
      if (!loadedTrip) {
        setLoadMessage("No GPS records for this truck and date. Try another date.");
        return;
      }
      setTrip(loadedTrip);
      updateElapsed(0);
      onReplayPath(loadedTrip.path);
      onReplayBreaks?.(loadedTrip.breakBefore);
      setPlaying(getReplayDuration(loadedTrip) > 0);
    } catch {
      if (version !== requestVersionRef.current) return;
      setLoadFailed(true);
      setLoadMessage("Could not load GPS history. Please try again.");
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  };

  const downloadReplay = async () => {
    if (!trip || !date || exporting || !selectionMatches || (exportFormat === "mp4" && !canPlay)) return;
    const controller = new AbortController();
    exportAbortRef.current = controller;
    syncClock();
    setPlaying(false);
    setExportError("");
    setExporting(true);
    setExportProgress(0);
    setExportStage("map");
    try {
      const options = {
        truckName: selectedTruckObj?.name ?? "Municipal Truck",
        plateNumber: selectedTruckObj?.plateNumber ?? "",
        dateStr: format(date, "yyyy-MM-dd"),
        trip,
        signal: controller.signal,
      };
      if (exportFormat === "mp4") {
        await exportReplayVideo({ ...options, speed: exportSpeed, mp4Only: true, onProgress: setExportProgress, onStage: setExportStage });
      } else {
        await (exportFormat === "gpx" ? exportReplayGpx : exportReplayKml)(options);
      }
      if (!controller.signal.aborted) {
        toast.success(`Replay ${exportFormat.toUpperCase()} downloaded`);
        setExportOpen(false);
      }
    } catch (error) {
      if (!controller.signal.aborted) setExportError(error instanceof Error ? error.message : "Could not export the replay. Please try again.");
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
        setExporting(false);
      }
    }
  };

  return (
    <section aria-label="Route replay" className="admin-tracking-replay min-w-0 space-y-4 rounded-lg border border-border/80 bg-card p-3 sm:p-4">
      <header className="space-y-1">
        <h3 className="gw-heading text-sm text-foreground">Route Replay</h3>
        <p className="text-xs text-muted-foreground">Review the full recorded trip.</p>
      </header>
      {trip && selectionMatches && historyQuery.isError && <DataRefreshNotice message="Couldn't refresh GPS history. Your loaded replay is preserved." onRetry={() => void historyQuery.refetch()} retrying={historyQuery.isFetching} disabled={playing || exporting} />}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label id="replay-truck-label" className="block text-xs font-medium text-foreground">Truck</label>
          <SearchableSelect value={selectedTruck} onValueChange={setSelectedTruck} disabled={exporting}
            aria-labelledby="replay-truck-label" fieldSize="compact" placeholder="Select a truck" searchPlaceholder="Search by truck name or plate…" compactSearchPlaceholder="Truck name or plate…"
            options={trucks.map((truck) => ({ value: truck.id, label: `${truck.name} ${truck.plateNumber}` }))}
            className="h-9 rounded-md border-border/80 text-xs" />
        </div>
        <div className="space-y-1.5">
          <label id="replay-date-label" className="block text-xs font-medium text-foreground">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={exporting} aria-labelledby="replay-date-label replay-date-value" className="h-9 w-full justify-start gap-2 rounded-md text-xs font-normal">
                <CalendarDays className="size-3.5 shrink-0 text-primary" />
                <span id="replay-date-value">{date ? format(date, "MMMM d, yyyy") : "Select a Date"}</span>
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
            Load Replay
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
                <dt className="text-xs text-muted-foreground">Current Target Street</dt>
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
                  {finished ? "Replay Again" : playing ? "Pause" : "Play"}
                </Button>
                <Button variant="outline" aria-label="Restart replay" title="Restart Replay" className="size-9 shrink-0 rounded-md p-0" onClick={restart}>
                  <RotateCcw className="size-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <span id="replay-speed-label" className="text-xs text-muted-foreground">Playback Speed</span>
                <div role="group" aria-labelledby="replay-speed-label" className="admin-tracking-replay-speeds grid grid-cols-6 gap-1 rounded-md bg-muted/40 p-1">
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
                  <span>Replay Time: {formatReplayTime(sample?.timestamp)}</span>
                  <span>End: {formatReplayTime(trip.timestamps[lastIndex])}</span>
                </div>
              </div>
            </div>
          ) : <p role="status" className="text-xs leading-relaxed text-muted-foreground">{trip.path.length === 1 ? "Only one GPS record is available." : "The GPS records have the same timestamp."} The last recorded location is shown on the map; there is no timed trip to play.</p>}
          <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
            <div className="space-y-1">
              <p className="text-ui-caption text-muted-foreground">Estimated trip distance</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{trip.distanceAvailable === false ? "Not enough GPS data" : `${trip.distanceKm.toFixed(2)} km`}</p>
            </div>
            <div className="space-y-1">
              <p className="text-ui-caption text-muted-foreground">Recorded duration</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatReplayDuration(durationMs)}</p>
            </div>
          </div>
          {Boolean(trip.excludedPoints || trip.gapCount) && <p className="text-ui-caption leading-relaxed text-muted-foreground">GPS estimate · Gaps or unreliable fixes excluded.</p>}
          <div className="space-y-2">
            <h4 className="gw-heading text-xs text-foreground">Target Streets</h4>
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
            <div className="space-y-1.5">
              <fieldset disabled={exporting} className="space-y-2">
                <legend className="text-xs font-medium">File Format</legend>
                <div className="grid grid-cols-3 gap-2">
                  {(["kml", "mp4", "gpx"] as const).map(value => <label key={value} className="cursor-pointer">
                    <input type="radio" name="replay-format" value={value} checked={exportFormat === value} onChange={() => { setExportFormat(value); setExportError(""); }} className="peer sr-only" />
                    <span className="flex h-9 items-center justify-center rounded-md border border-border text-xs font-semibold peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:opacity-60">{value.toUpperCase()}</span>
                  </label>)}
                </div>
              </fieldset>
              <Button variant="outline" disabled={exporting || !selectionMatches || (exportFormat === "mp4" && !canPlay)} onClick={() => exportFormat === "mp4" ? setExportOpen(true) : void downloadReplay()} loading={exporting && exportFormat !== "mp4"} loadingLabel="Preparing file…" className="h-9 w-full gap-2 rounded-md text-xs font-semibold">
                <Download className="size-3.5" />
                Download {exportFormat.toUpperCase()}
              </Button>
              <p className="text-ui-caption text-muted-foreground">{exportFormat === "kml" ? "GPS history and target streets for Google Earth." : exportFormat === "gpx" ? "Timestamped GPS tracks for mapping and route replay apps." : canPlay ? "A video of the map replay at your chosen speed." : "MP4 requires at least two GPS records with different times."}</p>
              {exportError && !exportOpen && <p role="alert" className="text-xs text-destructive">{exportError}</p>}
            </div>
          </div>
        </>
      )}
      <AdminModal open={exportOpen} onOpenChange={setExportOpen} pending={exporting} title="Download MP4 Replay" description="Choose the video playback speed." icon={<Download className="size-5" />}
        footer={<>
          <Button variant="outline" onClick={() => { exportAbortRef.current?.abort(); setExportOpen(false); }}>Cancel</Button>
          <Button disabled={exporting || !canPlay} onClick={() => void downloadReplay()} loading={exporting} loadingLabel={{ map: "Preparing map…", encoding: "Encoding video…", recording: "Recording video…", finalizing: "Finishing file…" }[exportStage]}>Create MP4</Button>
        </>}>
        <fieldset disabled={exporting} className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">Video Speed</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {REPLAY_VIDEO_SPEEDS.map(value => <label key={value} className="cursor-pointer">
              <input type="radio" name="replay-video-speed" value={value} checked={exportSpeed === value} onChange={() => setExportSpeed(value)} className="peer sr-only" />
              <span className="flex h-10 items-center justify-center rounded-md border border-border text-sm font-semibold peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:opacity-60">{value}×</span>
            </label>)}
          </div>
        </fieldset>
        <p className="mt-4 text-xs text-muted-foreground">Video length: {formatReplayDuration(durationMs / exportSpeed)}. Keep this tab open until the download begins.</p>
        {exporting && <p role="status" className="mt-2 text-xs text-muted-foreground">{exportStage === "map" ? "Loading route map…" : `${Math.round(exportProgress)}%`}</p>}
        {exportError && <p role="alert" className="mt-2 text-sm text-destructive">{exportError}</p>}
      </AdminModal>
    </section>
  );
};

export default RouteReplay;
