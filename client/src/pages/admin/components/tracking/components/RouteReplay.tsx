/**
 * RouteReplay.tsx
 *
 * Fetches real GPS history from /tracking/:truckId/history
 * and lets the admin scrub through the truck's path on the map.
 */

import { useState, useEffect, useRef } from "react";
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
import {
  Play,
  Pause,
  RotateCcw,
  CalendarDays,
  MapPin,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type { AdminTruck, RouteReplayPoint } from "../types";
import { fetchTruckHistory } from "@/services/trackingService";
import { toast } from "sonner";

interface RouteReplayProps {
  trucks: AdminTruck[];
  onReplayPath: (path: [number, number][] | undefined) => void;
  onReplayIndex: (index: number | undefined) => void;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const RouteReplay = ({
  trucks,
  onReplayPath,
  onReplayIndex,
}: RouteReplayProps) => {
  const [selectedTruck, setSelectedTruck] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replayData, setReplayData] = useState<RouteReplayPoint[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    setPlaying(false);
    setCurrentIndex(0);
    setReplayData([]);
    onReplayPath(undefined);
    onReplayIndex(undefined);
  }, [selectedTruck, date, onReplayPath, onReplayIndex]);

  const handlePlay = async () => {
    if (!selectedTruck || !date) return;

    setLoading(true);

    try {
      // Fetch real GPS history from the backend
      const historyRows = await fetchTruckHistory(selectedTruck);

      if (historyRows.length === 0) {
        toast.info("No tracking history found", {
          description: "This truck has no GPS logs for the selected date.",
        });
        setLoading(false);
        return;
      }

      // Filter by selected date (compare date portion only)
      const selectedDateStr = format(date, "yyyy-MM-dd");
      const filtered = historyRows.filter((row) => {
        const created = new Date(row.created_at);
        if (Number.isNaN(created.getTime())) return false;
        return format(created, "yyyy-MM-dd") === selectedDateStr;
      });

      if (filtered.length === 0) {
        toast.info("No data for selected date", {
          description: `No pings found on ${format(date, "MMM dd, yyyy")}.`,
        });
        setLoading(false);
        return;
      }

      // Convert to RouteReplayPoint format (oldest first → replay forward)
      const points: RouteReplayPoint[] = filtered
        .slice()
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
        .map((row) => {
          const lat = toNumber(row.latitude);
          const lng = toNumber(row.longitude);

          return {
            coords:
              lat !== null && lng !== null
                ? ([lat, lng] as [number, number])
                : ([14.0388, 121.4285] as [number, number]),
            // We don't have barangay name in the history log — use coordinates as label
            // If your backend returns a barangay_name column, use it here
            barangay:
              lat !== null && lng !== null
                ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                : "Unknown coordinates",
            arrivedAt: new Date(row.created_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        });

      setReplayData(points);
      onReplayPath(points.map((p) => p.coords));
      setCurrentIndex(0);
      onReplayIndex(0);
      setPlaying(true);
    } catch (err) {
      toast.error("Failed to load replay data", {
        description: "Could not fetch tracking history from the server.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPlaying(false);
    setCurrentIndex(0);
    setReplayData([]);
    onReplayPath(undefined);
    onReplayIndex(undefined);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Animate playback — advance one step every 1.2 s
  useEffect(() => {
    if (!playing || replayData.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= replayData.length - 1) {
          setPlaying(false);
          return prev;
        }
        const next = prev + 1;
        onReplayIndex(next);
        return next;
      });
    }, 1200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, replayData.length, onReplayIndex]);

  const handleSlider = (value: number[]) => {
    const idx = value[0];
    setCurrentIndex(idx);
    onReplayIndex(idx);
    setPlaying(false);
  };

  const currentStop = replayData[currentIndex];
  const isReady = !!selectedTruck && !!date;
  const hasData = replayData.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <RotateCcw className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-display font-semibold text-foreground">
          Route Replay
        </h3>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        {/* Truck selector */}
        <Select value={selectedTruck} onValueChange={setSelectedTruck}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select truck" />
          </SelectTrigger>
          <SelectContent>
            {trucks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} · {t.plateNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs justify-start gap-2"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {date ? format(date, "MMM dd, yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              // Can't replay the future
              disabled={(d) => d > new Date()}
            />
          </PopoverContent>
        </Popover>

        {/* Play / Pause / Reset */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-8 text-xs flex-1 gap-1.5"
            disabled={!isReady || loading}
            onClick={
              playing
                ? () => setPlaying(false)
                : hasData
                  ? () => setPlaying(true)
                  : handlePlay
            }
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : playing ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {loading
              ? "Loading…"
              : playing
                ? "Pause"
                : hasData
                  ? "Resume"
                  : "Play"}
          </Button>

          {hasData && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleReset}
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Timeline scrubber — only shown when data is loaded */}
      {hasData && (
        <div className="space-y-2 pt-1">
          <Slider
            value={[currentIndex]}
            max={replayData.length - 1}
            step={1}
            onValueChange={handleSlider}
            className="w-full"
          />

          {currentStop && (
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              <span className="font-medium text-foreground truncate">
                {currentStop.barangay}
              </span>
              <span className="text-muted-foreground shrink-0">
                · {currentStop.arrivedAt}
              </span>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground text-right">
            Stop {currentIndex + 1} of {replayData.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteReplay;
