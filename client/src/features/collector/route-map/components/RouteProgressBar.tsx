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
  hasStarted?: boolean;
}

const RouteProgressBar = ({
  completed,
  total,
  routeName,
  wasteType,
  elapsed,
  isScheduled,
  isPaused,
  hasStarted,
}: RouteProgressBarProps) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isBio = wasteType?.toLowerCase().includes("bio") && !wasteType?.toLowerCase().includes("non");

  return (
    <div className="bg-card border border-border/80 shadow-xs rounded-2xl p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Route Title, Waste Type & Total Stops */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="text-sm sm:text-base font-display font-bold text-foreground tracking-tight truncate">
            {routeName}
          </h2>

          {wasteType && (
            <span
              className={cn(
                "text-xs font-semibold px-2.5 py-0.5 rounded-lg border shrink-0 inline-flex items-center",
                isBio
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25"
              )}
            >
              {wasteType}
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-lg border border-border/60">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span>{total} collection stops</span>
          </span>

          {isScheduled && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              Scheduled
            </span>
          )}
        </div>

        {/* Right: Elapsed Timer + Progress Counter */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-medium transition-colors",
              isPaused
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                : !hasStarted && !isScheduled
                ? "bg-muted/40 border-border/60 text-muted-foreground"
                : "bg-muted/60 border-border/70 text-foreground"
            )}
          >
            {isPaused ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-mono font-bold tabular-nums">{elapsed}</span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Paused
                </span>
              </>
            ) : !hasStarted && !isScheduled ? (
              <>
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>Ready to start</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="tabular-nums font-bold text-foreground font-mono">{elapsed}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary tabular-nums font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {completed} of {total}
            </span>
            <span className="text-primary/40">·</span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>

      {/* Integrated Progress Bar */}
      <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden border border-border/40">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default RouteProgressBar;
