import { CheckCircle2, Clock, MapPin, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteProgressBarProps {
  completed: number;
  total: number;
  routeName: string;
  wasteType?: string;
  elapsed: string;
  isScheduled?: boolean;
  isPaused?: boolean;
  currentBarangay?: string | null;
  currentStopNumber?: number | null;
  currentDistanceKm?: number | null;
  isWithinGeofence?: boolean;
}

const RouteProgressBar = ({
  completed,
  total,
  routeName,
  wasteType,
  elapsed,
  isScheduled,
  isPaused,
  currentBarangay,
  currentStopNumber,
  currentDistanceKm,
  isWithinGeofence,
}: RouteProgressBarProps) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isBio = wasteType?.toLowerCase().includes("bio");

  return (
    <div className="bg-card border border-border/80 shadow-2xs rounded-2xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
      {/* Highlighted Current Barangay Being Collected (Top Bar) */}
      {currentBarangay && !isScheduled && (
        <div
          className={cn(
            "flex items-center justify-between gap-2 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border transition-all min-w-0",
            isWithinGeofence
              ? "bg-primary/10 border-primary/40 text-primary"
              : "bg-muted/40 border-border/70 text-foreground"
          )}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary shrink-0">
              {isWithinGeofence ? (
                <>
                  <span>Arrived</span>
                  <span className="hidden min-[380px]:inline"> At Zone</span>:
                </>
              ) : (
                <>
                  <span className="hidden min-[360px]:inline">Collecting </span>Now:
                </>
              )}
            </span>
            <span className="text-xs sm:text-sm font-extrabold font-display text-foreground truncate">
              {currentStopNumber ? `#${currentStopNumber} — ` : ""}{currentBarangay}
            </span>
          </div>

          {currentDistanceKm !== undefined && currentDistanceKm !== null && currentDistanceKm > 0 && (
            <span className="text-[10px] sm:text-[11px] font-semibold tabular-nums text-muted-foreground bg-card px-1.5 sm:px-2 py-0.5 rounded-md border border-border/60 shrink-0">
              {currentDistanceKm} km
              <span className="hidden min-[400px]:inline"> away</span>
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
        {/* Left: Route Title, Waste Type & Stops */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <h1 className="text-xs sm:text-sm md:text-base font-display font-bold text-foreground tracking-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs">
            {routeName}
          </h1>

          {wasteType && (
            <span
              className={cn(
                "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border shrink-0 inline-flex items-center gap-1",
                isBio
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
              )}
            >
              <span>{wasteType}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-muted-foreground bg-muted/60 px-1.5 sm:px-2 py-0.5 rounded-md border border-border/60">
            <MapPin className="w-3 h-3 shrink-0" />
            <span>{total} stops</span>
          </span>

          {isScheduled && (
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              Scheduled
            </span>
          )}
        </div>

        {/* Right: Elapsed Timer + Progress Counter */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          <div
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border text-[11px] sm:text-xs font-medium transition-colors",
              isPaused
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                : "bg-muted/50 border-border/60 text-muted-foreground"
            )}
          >
            {isPaused ? (
              <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            )}
            <span className="tabular-nums font-bold text-foreground tracking-tight">{elapsed}</span>
            {isPaused && (
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 hidden min-[360px]:inline">
                • Paused
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-[11px] sm:text-xs font-bold text-primary tabular-nums">
            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span>
              {completed}/{total}
            </span>
            <span className="text-primary/40">•</span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>

      {/* Integrated Progress Bar */}
      <div className="w-full bg-muted/70 h-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default RouteProgressBar;
