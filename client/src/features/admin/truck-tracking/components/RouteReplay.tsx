/**
 * RouteReplay.tsx
 *
 * Leg-by-leg target barangay route replay using 100% actual recorded GPS logs
 * and timestamps. Renders the real physical path driven by the truck,
 * transitions sequentially through target barangays, and provides downloadable
 * video file export (.mp4 / .webm) and live screen recording.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  RotateCcw,
  CalendarDays,
  MapPin,
  Loader2,
  SkipBack,
  SkipForward,
  Clock,
  Navigation,
  Target,
  CheckCircle2,
  Video,
  ChevronLeft,
  ChevronRight,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import type { AdminTruck } from "../types";
import {
  fetchTruckHistory,
  type HistoryRow,
  type RouteStopHistoryItem,
} from "@/services/trackingService";
import {
  exportReplayVideo,
  type ExportLeg,
} from "../utils/replayVideoExporter";
import type {
  ReplayTargetStopInfo,
  ReplayCompletedStopInfo,
} from "./AdminTrackingMap";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ReplayLeg {
  legIndex: number;
  stopNumber: number;
  totalStops: number;
  targetName: string;
  fromName: string;
  fromCoords: [number, number];
  targetCoords: [number, number];
  path: [number, number][];
  timestamps: string[];
  distanceKm: number;
  durationMinutes: number;
  status: "done" | "in-progress" | "not-started" | "skipped";
}

interface RouteReplayProps {
  trucks: AdminTruck[];
  onReplayPath: (path: [number, number][] | undefined) => void;
  onReplayIndex: (index: number | undefined) => void;
  onReplayTargetStop?: (stop: ReplayTargetStopInfo | null) => void;
  onReplayLegPath?: (path: [number, number][] | undefined) => void;
  onReplayCompletedStops?: (stops: ReplayCompletedStopInfo[]) => void;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

// Default Candelaria Municipal Hall / Fleet Depot
const CANDELARIA_DEPOT: [number, number] = [14.0388, 121.4285];

// Haversine distance in kilometers between two lat/lng coordinates
const getHaversineDistanceKm = (c1: [number, number], c2: [number, number]): number => {
  const R = 6371;
  const dLat = ((c2[0] - c1[0]) * Math.PI) / 180;
  const dLng = ((c2[1] - c1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1[0] * Math.PI) / 180) *
      Math.cos((c2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatGpsTime = (raw?: string): string => {
  if (!raw) return "--:--:--";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "--:--:--";
    return format(d, "hh:mm:ss a");
  } catch {
    return "--:--:--";
  }
};

const SPEED_OPTIONS = [1, 2, 5, 10] as const;
type PlaybackSpeed = (typeof SPEED_OPTIONS)[number];

const RouteReplay = ({
  trucks,
  onReplayPath,
  onReplayIndex,
  onReplayTargetStop,
  onReplayLegPath,
  onReplayCompletedStops,
}: RouteReplayProps) => {
  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(2);

  // Leg-by-leg playback state (backed by actual GPS logs)
  const [legs, setLegs] = useState<ReplayLeg[]>([]);
  const [activeLegIndex, setActiveLegIndex] = useState(0);
  const [coordIndexInLeg, setCoordIndexInLeg] = useState(0);
  const [isLegCompleted, setIsLegCompleted] = useState(false);

  // Video Export State
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedTruckObj = useMemo(
    () => trucks.find((t) => t.id === selectedTruck) ?? null,
    [trucks, selectedTruck],
  );

  const activeLeg = legs[activeLegIndex] ?? null;

  // Total shift route distance across all legs
  const totalDistanceKm = useMemo(() => {
    return Math.round(legs.reduce((acc, l) => acc + l.distanceKm, 0) * 10) / 10;
  }, [legs]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      onReplayPath(undefined);
      onReplayIndex(undefined);
      onReplayTargetStop?.(null);
      onReplayLegPath?.(undefined);
      onReplayCompletedStops?.([]);
    };
  }, [onReplayPath, onReplayIndex, onReplayTargetStop, onReplayLegPath, onReplayCompletedStops]);

  // Clear when truck or date selection changes
  useEffect(() => {
    setPlaying(false);
    setLegs([]);
    setActiveLegIndex(0);
    setCoordIndexInLeg(0);
    setIsLegCompleted(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    onReplayPath(undefined);
    onReplayIndex(undefined);
    onReplayTargetStop?.(null);
    onReplayLegPath?.(undefined);
    onReplayCompletedStops?.([]);
  }, [selectedTruck, date, onReplayPath, onReplayIndex, onReplayTargetStop, onReplayLegPath, onReplayCompletedStops]);

  // Update map layer whenever active leg or coordinate index changes
  useEffect(() => {
    if (!activeLeg || legs.length === 0) return;

    // 1. Current Target Barangay Info
    onReplayTargetStop?.({
      name: activeLeg.targetName,
      coords: activeLeg.targetCoords,
      stopNumber: activeLeg.stopNumber,
      totalStops: activeLeg.totalStops,
      isCompleted: isLegCompleted,
    });

    // 2. Active Leg Route Path
    onReplayLegPath?.(activeLeg.path);

    // 3. Current moving truck coordinate index
    onReplayIndex?.(coordIndexInLeg);

    // 4. Completed stops up to this point
    const completed = legs.slice(0, isLegCompleted ? activeLegIndex + 1 : activeLegIndex).map((l) => ({
      name: l.targetName,
      coords: l.targetCoords,
      stopNumber: l.stopNumber,
    }));
    onReplayCompletedStops?.(completed);
  }, [
    activeLeg,
    activeLegIndex,
    coordIndexInLeg,
    isLegCompleted,
    legs,
    onReplayTargetStop,
    onReplayLegPath,
    onReplayIndex,
    onReplayCompletedStops,
  ]);

  // Build sequential legs using 100% REAL physical GPS tracking logs
  const handleFetchAndPlay = async () => {
    if (!selectedTruck || !date) return;

    setLoading(true);

    try {
      const selectedDateStr = format(date, "yyyy-MM-dd");
      const { logs, stops } = await fetchTruckHistory(selectedTruck, selectedDateStr);

      // Filter and chronologically sort the actual GPS tracking logs
      const validLogs: HistoryRow[] = (logs || [])
        .filter((r) => {
          const lat = toNumber(r.latitude);
          const lng = toNumber(r.longitude);
          return lat !== null && lng !== null;
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (validLogs.length === 0) {
        toast.info("No GPS logs found", {
          description: `No physical GPS tracking logs were recorded for this truck on ${format(date, "MMMM dd, yyyy")}.`,
        });
        setLoading(false);
        return;
      }

      // Extract scheduled route target stops for this truck
      let targetStops: { name: string; coords: [number, number]; order: number; completedAt?: string | null }[] = [];

      if (stops && stops.length > 0) {
        targetStops = stops
          .map((s, idx) => {
            const lat = toNumber(s.latitude);
            const lng = toNumber(s.longitude);
            if (lat === null || lng === null) return null;
            return {
              name: s.barangay_name,
              coords: [lat, lng] as [number, number],
              order: s.stop_order || idx + 1,
              completedAt: s.completed_at,
            };
          })
          .filter((s): s is { name: string; coords: [number, number]; order: number; completedAt?: string | null } => Boolean(s));
      }

      // If no backend stops, fallback to assigned route stops on the truck object
      if (targetStops.length === 0 && selectedTruckObj?.route && selectedTruckObj.route.length > 0) {
        targetStops = selectedTruckObj.route
          .map((s, idx) => {
            if (!s.coords) return null;
            return {
              name: s.name,
              coords: s.coords,
              order: idx + 1,
            };
          })
          .filter((s): s is { name: string; coords: [number, number]; order: number } => Boolean(s));
      }

      // If no configured stops, cluster the actual GPS logs into sequential target checkpoints
      if (targetStops.length === 0) {
        const numCheckpoints = Math.min(4, Math.max(2, Math.floor(validLogs.length / 10)));
        for (let i = 1; i <= numCheckpoints; i++) {
          const pingIdx = Math.min(validLogs.length - 1, Math.floor((i / numCheckpoints) * (validLogs.length - 1)));
          const ping = validLogs[pingIdx];
          targetStops.push({
            name: `Checkpoint ${i}`,
            coords: [toNumber(ping.latitude)!, toNumber(ping.longitude)!],
            order: i,
          });
        }
      }

      // Match each target stop to the truck's actual GPS logs chronologically
      // Ensure each leg receives a realistic forward segment of the route
      const arrivalIndices: number[] = [];
      let searchStart = 0;
      const totalLogs = validLogs.length;

      // Check if stops have distinct, valid, sequential completedAt timestamps
      const hasValidDistinctTimestamps =
        targetStops.length > 1 &&
        targetStops.every((s) => Boolean(s.completedAt)) &&
        new Set(targetStops.map((s) => s.completedAt)).size === targetStops.length;

      for (let k = 0; k < targetStops.length; k++) {
        const stop = targetStops[k];
        const remainingStops = targetStops.length - k;

        if (k === targetStops.length - 1) {
          // Final target completes at the end of the shift
          arrivalIndices.push(totalLogs - 1);
          continue;
        }

        // If backend provided strictly sequential, distinct completedAt timestamps
        if (hasValidDistinctTimestamps && stop.completedAt) {
          const targetTime = new Date(stop.completedAt).getTime();
          let bestIdx = searchStart;
          let minTimeDiff = Infinity;
          for (let j = searchStart; j < totalLogs - remainingStops; j++) {
            const logTime = new Date(validLogs[j].created_at).getTime();
            const diff = Math.abs(logTime - targetTime);
            if (diff < minTimeDiff) {
              minTimeDiff = diff;
              bestIdx = j;
            }
          }
          if (bestIdx > searchStart) {
            arrivalIndices.push(bestIdx);
            searchStart = bestIdx + 1;
            continue;
          }
        }

        // Spatial closest-approach matching within a proportional forward window
        // Bounded so subsequent stops are guaranteed their forward trajectory
        const maxSearchIdx = totalLogs - remainingStops;
        const windowStep = Math.max(15, Math.floor((totalLogs - searchStart) / remainingStops) * 2);
        const windowEnd = Math.min(maxSearchIdx, searchStart + windowStep);

        let bestDistanceIdx = searchStart;
        let minDistance = Infinity;

        for (let j = searchStart; j <= windowEnd; j++) {
          const logCoords: [number, number] = [
            toNumber(validLogs[j].latitude)!,
            toNumber(validLogs[j].longitude)!,
          ];
          const dist = getHaversineDistanceKm(logCoords, stop.coords);
          if (dist < minDistance) {
            minDistance = dist;
            bestDistanceIdx = j;
          }
        }

        if (bestDistanceIdx <= searchStart) {
          const proportionalStep = Math.max(1, Math.floor((totalLogs - searchStart) / remainingStops));
          bestDistanceIdx = Math.min(maxSearchIdx, searchStart + proportionalStep);
        }

        arrivalIndices.push(bestDistanceIdx);
        searchStart = bestDistanceIdx;
      }

      // Ensure arrival indices are strictly monotonically advancing
      for (let k = 1; k < arrivalIndices.length; k++) {
        if (arrivalIndices[k] <= arrivalIndices[k - 1] && arrivalIndices[k - 1] < validLogs.length - 1) {
          arrivalIndices[k] = arrivalIndices[k - 1] + 1;
        }
      }
      arrivalIndices[arrivalIndices.length - 1] = Math.max(
        arrivalIndices[arrivalIndices.length - 1],
        validLogs.length - 1,
      );

      // Construct authentic legs from the actual GPS logs
      const builtLegs: ReplayLeg[] = [];
      let previousIdx = 0;
      let previousName = "Depot / Shift Origin";
      let previousCoords: [number, number] = [
        toNumber(validLogs[0].latitude)!,
        toNumber(validLogs[0].longitude)!,
      ];

      for (let k = 0; k < targetStops.length; k++) {
        const stop = targetStops[k];
        const toIdx = arrivalIndices[k];

        // Slice the ACTUAL GPS logs for this leg
        const legLogs = validLogs.slice(previousIdx, toIdx + 1);
        const legPath: [number, number][] = legLogs.map((l) => [
          toNumber(l.latitude)!,
          toNumber(l.longitude)!,
        ]);
        const legTimestamps: string[] = legLogs.map((l) => l.created_at);

        // Calculate actual real distance driven by the truck (filtering stationary GPS jitter)
        let legDistanceKm = 0;
        let lastAnchor = legPath[0];
        for (let p = 1; p < legPath.length; p++) {
          const stepDist = getHaversineDistanceKm(lastAnchor, legPath[p]);
          if (stepDist >= 0.015) {
            legDistanceKm += stepDist;
            lastAnchor = legPath[p];
          }
        }
        if (legPath.length > 1) {
          const rem = getHaversineDistanceKm(lastAnchor, legPath[legPath.length - 1]);
          if (rem >= 0.005) {
            legDistanceKm += rem;
          }
        }
        legDistanceKm = Math.round(legDistanceKm * 10) / 10;

        // Calculate real duration
        let durationMinutes = 0;
        if (legTimestamps.length >= 2) {
          const startTime = new Date(legTimestamps[0]).getTime();
          const endTime = new Date(legTimestamps[legTimestamps.length - 1]).getTime();
          durationMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));
        }

        builtLegs.push({
          legIndex: k,
          stopNumber: k + 1,
          totalStops: targetStops.length,
          targetName: stop.name,
          fromName: previousName,
          fromCoords: previousCoords,
          targetCoords: stop.coords,
          path: legPath.length > 0 ? legPath : [previousCoords, stop.coords],
          timestamps: legTimestamps,
          distanceKm: legDistanceKm,
          durationMinutes,
          status: "in-progress",
        });

        previousIdx = toIdx;
        previousName = stop.name;
        previousCoords = stop.coords;
      }

      setLegs(builtLegs);
      setActiveLegIndex(0);
      setCoordIndexInLeg(0);
      setIsLegCompleted(false);

      // Display entire actual day shift trajectory as subtle background overview
      const fullActualTrail: [number, number][] = validLogs.map((l) => [
        toNumber(l.latitude)!,
        toNumber(l.longitude)!,
      ]);
      onReplayPath(fullActualTrail);

      setPlaying(true);
      toast.success("Actual route history loaded", {
        description: `${validLogs.length} real GPS telemetry logs queued across ${builtLegs.length} target barangays.`,
      });
    } catch (err) {
      console.error("[RouteReplay] Load error:", err);
      toast.error("Failed to load replay data", {
        description: "Could not fetch route and tracking history.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Playback step timer through actual GPS coordinates
  useEffect(() => {
    if (!playing || legs.length === 0 || isLegCompleted) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const stepInterval = Math.max(70, Math.round(700 / speed));

    intervalRef.current = setInterval(() => {
      setCoordIndexInLeg((prev) => {
        const currentLeg = legs[activeLegIndex];
        if (!currentLeg) return prev;

        // Still traveling towards active target along real GPS path
        if (prev < currentLeg.path.length - 1) {
          return prev + 1;
        }

        // Physically arrived at current target!
        setIsLegCompleted(true);
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Smooth transition: Pause briefly at target, then advance to next target
        transitionTimeoutRef.current = setTimeout(() => {
          if (activeLegIndex < legs.length - 1) {
            setActiveLegIndex((cur) => cur + 1);
            setCoordIndexInLeg(0);
            setIsLegCompleted(false);
            toast.info(`Advancing to Target ${activeLegIndex + 2}`, {
              description: `Next destination: ${legs[activeLegIndex + 1].targetName}`,
            });
          } else {
            // All targets completed
            setPlaying(false);
            setIsLegCompleted(true);
            toast.success("Replay shift completed", {
              description: "All target barangays have been visited along the actual GPS route.",
            });
          }
        }, 900);

        return prev;
      });
    }, stepInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed, legs, activeLegIndex, isLegCompleted]);

  // Jump to specific leg
  const handleSelectLeg = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= legs.length) return;
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    setActiveLegIndex(newIndex);
    setCoordIndexInLeg(0);
    setIsLegCompleted(false);
  };

  // Restart from beginning
  const handleRestart = () => {
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    setActiveLegIndex(0);
    setCoordIndexInLeg(0);
    setIsLegCompleted(false);
    setPlaying(true);
  };

  // Step 1 coordinate back
  const handleStepBack = () => {
    setPlaying(false);
    setCoordIndexInLeg((prev) => Math.max(0, prev - 1));
  };

  // Step 1 coordinate forward
  const handleStepForward = () => {
    setPlaying(false);
    if (!activeLeg) return;
    setCoordIndexInLeg((prev) => Math.min(activeLeg.path.length - 1, prev + 1));
  };

  // Export actual historical route video file (.mp4 / .webm)
  const handleExportVideo = async () => {
    if (legs.length === 0 || !date) return;

    setIsExportingVideo(true);
    setExportProgress(0);
    setExportStatusText("Initializing actual GPS video capture engine...");

    try {
      const exportLegs: ExportLeg[] = legs.map((l) => ({
        stopNumber: l.stopNumber,
        totalStops: l.totalStops,
        targetName: l.targetName,
        fromCoords: l.fromCoords,
        targetCoords: l.targetCoords,
        path: l.path,
        timestamps: l.timestamps,
        distanceKm: l.distanceKm,
      }));

      await exportReplayVideo({
        truckName: selectedTruckObj?.name || "Municipal_Truck",
        plateNumber: selectedTruckObj?.plateNumber || "Plate",
        driverName: selectedTruckObj?.driver || "Driver",
        dateStr: format(date, "yyyy-MM-dd"),
        legs: exportLegs,
        onProgress: (percent, status) => {
          setExportProgress(percent);
          setExportStatusText(status);
        },
      });

      toast.success("Replay video exported", {
        description: "Your actual route replay video file has been saved to your downloads.",
      });
    } catch (err) {
      console.error("[RouteReplay] Video export error:", err);
      toast.error("Video export failed", {
        description: "Could not generate replay video file.",
      });
    } finally {
      setIsExportingVideo(false);
    }
  };

  const isReady = Boolean(selectedTruck) && Boolean(date);
  const hasData = legs.length > 0;
  const currentPingTimestamp = activeLeg?.timestamps[coordIndexInLeg];

  const legProgressPercent = activeLeg
    ? Math.round((coordIndexInLeg / (activeLeg.path.length - 1 || 1)) * 100)
    : 0;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-display font-bold text-foreground truncate">
              Target Route Replay
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              Actual GPS route navigation & video export
            </p>
          </div>
        </div>

        {hasData && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
            {legs.length} targets
          </span>
        )}
      </div>

      {/* Truck & Date Selection */}
      <div className="space-y-2">
        {/* Truck selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground block">
            Select Truck
          </label>
          <Select value={selectedTruck} onValueChange={setSelectedTruck}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-border/80">
              <SelectValue placeholder="Choose a fleet vehicle..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {trucks.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span className="font-semibold text-foreground">{t.name}</span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {t.plateNumber}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date picker */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground block">
            Select Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs justify-start gap-2 rounded-xl border-border/80 font-normal hover:bg-muted/60"
              >
                <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground font-medium">
                  {date ? format(date, "MMMM dd, yyyy") : "Pick a date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border-border shadow-xl" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Load Action Button */}
      {!hasData && (
        <Button
          onClick={handleFetchAndPlay}
          disabled={!isReady || loading}
          size="sm"
          className="w-full h-9 rounded-xl text-xs font-semibold gap-2 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading actual GPS history...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Load Replay
            </>
          )}
        </Button>
      )}

      {/* Active Target Barangay Telemetry Card */}
      {activeLeg && (
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 via-card to-card p-3.5 space-y-3 relative overflow-hidden shadow-xs">
          {/* Top Row: Target order badge, Barangay name, and Status indicator */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/25 shrink-0">
                <Target className="w-3 h-3" />
                Target {activeLeg.stopNumber} of {activeLeg.totalStops}
              </span>
              <h4 className="text-xs sm:text-sm font-display font-bold text-foreground truncate">
                {activeLeg.targetName}
              </h4>
            </div>

            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border",
                isLegCompleted
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
              )}
            >
              {isLegCompleted ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Target Reached
                </>
              ) : (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                  </span>
                  En Route
                </>
              )}
            </span>
          </div>

          {/* Clean Real-time Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="bg-background/80 dark:bg-muted/40 rounded-xl p-2.5 border border-border/60 flex flex-col">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary shrink-0" />
                GPS Timestamp
              </span>
              <span className="text-xs font-bold font-mono text-foreground mt-1 truncate">
                {formatGpsTime(currentPingTimestamp)}
              </span>
            </div>

            <div className="bg-background/80 dark:bg-muted/40 rounded-xl p-2.5 border border-border/60 flex flex-col">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Navigation className="w-3 h-3 text-primary shrink-0" />
                Leg Distance
              </span>
              <span className="text-xs font-bold font-mono text-foreground mt-1 truncate">
                {activeLeg.distanceKm > 0 ? `${activeLeg.distanceKm} km` : "< 0.1 km"}
              </span>
            </div>
          </div>

          {/* Leg Progress Bar & Route Context */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Activity className="w-3 h-3 text-primary shrink-0" />
                Leg Progress
              </span>
              <span className="font-bold text-foreground font-mono">{legProgressPercent}%</span>
            </div>
            <Progress value={legProgressPercent} className="h-1.5 rounded-full" />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
              <span className="truncate">From: {activeLeg.fromName}</span>
              <span className="shrink-0 font-mono">
                Ping {coordIndexInLeg + 1}/{activeLeg.path.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Playback Controls */}
      {hasData && (
        <div className="space-y-3 pt-1">
          {/* Main Control Bar */}
          <div className="flex items-center justify-between gap-1 bg-muted/50 p-1.5 rounded-xl border border-border/60">
            {/* Step back */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handleStepBack}
              title="Step Backward"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </Button>

            {/* Play / Pause */}
            <Button
              variant="default"
              size="sm"
              className="h-8 px-3.5 rounded-lg text-xs font-semibold gap-1.5 shadow-xs"
              onClick={() => setPlaying(!playing)}
            >
              {playing ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Play
                </>
              )}
            </Button>

            {/* Step forward */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handleStepForward}
              title="Step Forward"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </Button>

            {/* Restart */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handleRestart}
              title="Restart from Start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>

            {/* Speed toggle */}
            <div className="flex items-center gap-0.5 pl-1 border-l border-border/60">
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors",
                    speed === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Coordinate Scrubbing Slider */}
          {activeLeg && activeLeg.path.length > 1 && (
            <div className="space-y-1 px-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>GPS Point {coordIndexInLeg + 1} of {activeLeg.path.length}</span>
                <span>Shift Total: {totalDistanceKm} km</span>
              </div>
              <Slider
                value={[coordIndexInLeg]}
                min={0}
                max={activeLeg.path.length - 1}
                step={1}
                onValueChange={([val]) => {
                  setPlaying(false);
                  setCoordIndexInLeg(val);
                }}
                className="py-1 cursor-pointer"
              />
            </div>
          )}

          {/* Target Leg Navigation List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Target Route Sequence
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded p-0 text-muted-foreground hover:text-foreground"
                  disabled={activeLegIndex === 0}
                  onClick={() => handleSelectLeg(activeLegIndex - 1)}
                  title="Previous Target"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded p-0 text-muted-foreground hover:text-foreground"
                  disabled={activeLegIndex >= legs.length - 1}
                  onClick={() => handleSelectLeg(activeLegIndex + 1)}
                  title="Next Target"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {legs.map((leg, idx) => {
                const isActive = idx === activeLegIndex;
                const isDone = idx < activeLegIndex || (isActive && isLegCompleted);

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectLeg(idx)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left text-xs transition-all border",
                      isActive
                        ? "bg-primary/10 border-primary/40 font-semibold text-foreground shadow-2xs"
                        : isDone
                        ? "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted/60"
                        : "border-transparent hover:bg-muted/40 text-muted-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          isDone
                            ? "bg-emerald-500 text-white"
                            : isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          leg.stopNumber
                        )}
                      </div>
                      <span className="truncate">{leg.targetName}</span>
                    </div>

                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {leg.distanceKm} km
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Video Export Action */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            {/* Download Video Button */}
            <Button
              variant="outline"
              size="sm"
              disabled={isExportingVideo}
              onClick={handleExportVideo}
              className="w-full h-9 rounded-xl text-xs font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/10 shadow-2xs"
            >
              {isExportingVideo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating Video ({exportProgress}%)...
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5" />
                  Download Replay Video
                </>
              )}
            </Button>

            {/* Video Progress Bar when exporting */}
            {isExportingVideo && (
              <div className="space-y-1.5 bg-muted/40 p-2.5 rounded-xl border border-border/60">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground truncate">{exportStatusText}</span>
                  <span className="font-bold text-primary">{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="h-1.5 rounded-full" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteReplay;
